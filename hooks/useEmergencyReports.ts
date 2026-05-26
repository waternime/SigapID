import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AppState } from "react-native";
import * as Location from "expo-location";
import {
  EmergencyPriority,
  EmergencyReport,
  EmergencyStatus,
  EmergencyType,
  EmergencyWithReporter,
  Message,
  MessageKind,
} from "@/types";
import { supabase } from "@/utils/supabase";
import { useAuth } from "@/hooks/useAuth";

const activeStatuses: EmergencyStatus[] = [
  "pending",
  "assigned",
  "accepted",
  "on_route",
  "arrived",
];

const chatPollingMs = 1500;
const historyLimit = 15;
const voiceNoteBucket = "report-voice-notes";
const locationTimeoutMs = 6500;
const lastKnownLocationMaxAgeMs = 60_000;
const lastKnownLocationRequiredAccuracy = 300;

type ReportInsert = {
  type: EmergencyType;
  title: string;
  description?: string;
  priority?: EmergencyPriority;
  sensorDetected?: boolean;
};

type ReportUpdate = Partial<
  Pick<
    EmergencyReport,
    "status" | "accepted_at" | "dispatched_at" | "arrived_at" | "resolved_at"
  >
>;

async function getCurrentLocation() {
  const permission = await Location.requestForegroundPermissionsAsync();

  if (!permission.granted) {
    return null;
  }

  const lastKnownPosition = await Location.getLastKnownPositionAsync({
    maxAge: lastKnownLocationMaxAgeMs,
    requiredAccuracy: lastKnownLocationRequiredAccuracy,
  }).catch(() => null);

  const position =
    lastKnownPosition ??
    (await withTimeout(
      Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      }),
      locationTimeoutMs,
    ).catch(() => null));

  if (!position) {
    return null;
  }

  return {
    latitude: position.coords.latitude,
    longitude: position.coords.longitude,
    accuracy: position.coords.accuracy,
  };
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number) {
  return Promise.race([
    promise,
    new Promise<null>((resolve) => {
      setTimeout(() => resolve(null), timeoutMs);
    }),
  ]) as Promise<T | null>;
}

function reportSelect() {
  return `
    *,
    reporter:profiles!emergency_reports_reporter_id_fkey (
      id,
      full_name,
      phone,
      email
    ),
    subject_profile:profiles!emergency_reports_subject_profile_id_fkey (
      id,
      full_name,
      phone,
      email
    ),
    assigned_operator:profiles!emergency_reports_assigned_operator_id_fkey (
      id,
      full_name,
      phone,
      email
    )
  `;
}

function normalizeReport<T extends EmergencyWithReporter | EmergencyReport>(
  report: T,
) {
  const withRelations = report as EmergencyWithReporter;

  return {
    ...withRelations,
    reporter: Array.isArray(withRelations.reporter)
      ? withRelations.reporter[0]
      : withRelations.reporter,
    subject_profile: Array.isArray(withRelations.subject_profile)
      ? withRelations.subject_profile[0]
      : withRelations.subject_profile,
    assigned_operator: Array.isArray(withRelations.assigned_operator)
      ? withRelations.assigned_operator[0]
      : withRelations.assigned_operator,
  } as EmergencyWithReporter;
}

function isActiveStatus(status: EmergencyStatus) {
  return activeStatuses.includes(status);
}

function realtimeTopic(name: string) {
  return `${name}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function sortMessages(messages: Message[]) {
  return [...messages].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
  );
}

function mergeMessages(current: Message[], incoming: Message | Message[]) {
  const incomingList = Array.isArray(incoming) ? incoming : [incoming];
  const byId = new Map(current.map((message) => [message.id, message]));

  incomingList.forEach((message) => {
    byId.set(message.id, message);
  });

  return sortMessages(Array.from(byId.values()));
}

function voiceContentType(uri: string, fallback?: string | null) {
  const contentType = fallback?.split(";")[0]?.trim();

  if (contentType?.startsWith("audio/")) {
    return contentType;
  }

  const cleanUri = uri.split("?")[0].toLowerCase();

  if (cleanUri.endsWith(".3gp") || cleanUri.endsWith(".3gpp")) {
    return "audio/3gpp";
  }

  if (cleanUri.endsWith(".webm")) {
    return "audio/webm";
  }

  if (cleanUri.endsWith(".aac")) {
    return "audio/aac";
  }

  if (cleanUri.endsWith(".mp3")) {
    return "audio/mpeg";
  }

  return "audio/mp4";
}

function voiceExtension(contentType: string, uri: string) {
  const cleanUri = uri.split("?")[0].toLowerCase();
  const match = cleanUri.match(/\.([a-z0-9]+)$/);

  if (match?.[1]) {
    return match[1];
  }

  if (contentType === "audio/3gpp") return "3gp";
  if (contentType === "audio/webm") return "webm";
  if (contentType === "audio/aac") return "aac";
  if (contentType === "audio/mpeg") return "mp3";

  return "m4a";
}

function voiceStorageError(message: string) {
  const lowerMessage = message.toLowerCase();

  if (
    lowerMessage.includes("bucket") ||
    lowerMessage.includes("row-level security") ||
    lowerMessage.includes("permission") ||
    lowerMessage.includes("not found")
  ) {
    return "Storage voice note belum siap. Jalankan ulang supabase/profiles.sql di Supabase SQL Editor.";
  }

  if (lowerMessage.includes("exceeded") || lowerMessage.includes("too large")) {
    return "Voice note terlalu besar. Coba rekam lebih pendek.";
  }

  return message;
}

export function useReporterReports() {
  const { profile } = useAuth();
  const [reports, setReports] = useState<EmergencyWithReporter[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadReports = useCallback(async (options?: { silent?: boolean }) => {
    if (!profile?.id) {
      setReports([]);
      setLoading(false);
      return;
    }

    if (!options?.silent) {
      setLoading(true);
    }
    setError(null);

    const { data, error: queryError } = await supabase
      .from("emergency_reports")
      .select(reportSelect())
      .or(`reporter_id.eq.${profile.id},subject_profile_id.eq.${profile.id}`)
      .order("created_at", { ascending: false });

    if (queryError) {
      if (!options?.silent) {
        setReports([]);
      }
      setError(queryError.message);
      setLoading(false);
      return;
    }

    setReports(
      ((data ?? []) as unknown as EmergencyWithReporter[]).map(normalizeReport),
    );
    setLoading(false);
  }, [profile?.id]);

  useEffect(() => {
    loadReports();
  }, [loadReports]);

  useEffect(() => {
    if (!profile?.id) return;

    const channel = supabase
      .channel(realtimeTopic(`reporter-reports-${profile.id}`))
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "emergency_reports",
          filter: `reporter_id=eq.${profile.id}`,
        },
        () => loadReports({ silent: true }),
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadReports, profile?.id]);

  const activeReport = useMemo(
    () => reports.find((report) => isActiveStatus(report.status)) ?? null,
    [reports],
  );

  const history = useMemo(
    () =>
      reports
        .filter((report) => !isActiveStatus(report.status))
        .slice(0, historyLimit),
    [reports],
  );

  return { reports, activeReport, history, loading, error, reload: loadReports };
}

export function useOperatorReports() {
  const { profile } = useAuth();
  const [reports, setReports] = useState<EmergencyWithReporter[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadReports = useCallback(async (options?: { silent?: boolean }) => {
    if (!profile?.id) {
      setReports([]);
      setLoading(false);
      return;
    }

    if (!options?.silent) {
      setLoading(true);
    }
    setError(null);

    const { data, error: queryError } = await supabase
      .from("emergency_reports")
      .select(reportSelect())
      .order("created_at", { ascending: false });

    if (queryError) {
      if (!options?.silent) {
        setReports([]);
      }
      setError(queryError.message);
      setLoading(false);
      return;
    }

    setReports(
      ((data ?? []) as unknown as EmergencyWithReporter[]).map(normalizeReport),
    );
    setLoading(false);
  }, [profile?.id]);

  useEffect(() => {
    loadReports();
  }, [loadReports]);

  useEffect(() => {
    if (!profile?.id) return;

    const channel = supabase
      .channel(realtimeTopic(`operator-reports-${profile.id}`))
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "emergency_reports" },
        () => loadReports({ silent: true }),
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadReports, profile?.id]);

  useEffect(() => {
    if (!profile?.id) return;

    const interval = setInterval(() => {
      loadReports({ silent: true });
    }, 5000);

    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") {
        loadReports({ silent: true });
      }
    });

    return () => {
      clearInterval(interval);
      subscription.remove();
    };
  }, [loadReports, profile?.id]);

  const activeReports = useMemo(
    () =>
      reports.filter(
        (report) =>
          isActiveStatus(report.status) &&
          (!report.assigned_operator_id ||
            report.assigned_operator_id === profile?.id),
      ),
    [profile?.id, reports],
  );

  const history = useMemo(
    () =>
      reports.filter(
        (report) =>
          !isActiveStatus(report.status) &&
          report.assigned_operator_id === profile?.id,
      ).slice(0, historyLimit),
    [profile?.id, reports],
  );

  return { reports, activeReports, history, loading, error, reload: loadReports };
}

export function useEmergencyReport(reportId?: string) {
  const [report, setReport] = useState<EmergencyWithReporter | null>(null);
  const [loading, setLoading] = useState(!!reportId);
  const [error, setError] = useState<string | null>(null);

  const loadReport = useCallback(async () => {
    if (!reportId) {
      setReport(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const { data, error: queryError } = await supabase
      .from("emergency_reports")
      .select(reportSelect())
      .eq("id", reportId)
      .maybeSingle();

    if (queryError) {
      setReport(null);
      setError(queryError.message);
      setLoading(false);
      return;
    }

    setReport(
      data
        ? normalizeReport(data as unknown as EmergencyWithReporter)
        : null,
    );
    setLoading(false);
  }, [reportId]);

  useEffect(() => {
    loadReport();
  }, [loadReport]);

  useEffect(() => {
    if (!reportId) return;

    const channel = supabase
      .channel(realtimeTopic(`report-${reportId}`))
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "emergency_reports",
          filter: `id=eq.${reportId}`,
        },
        () => loadReport(),
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadReport, reportId]);

  return { report, loading, error, reload: loadReport };
}

export function useEmergencyChat(reportId?: string) {
  const { profile } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(!!reportId);
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const sendingRef = useRef(false);

  const loadMessages = useCallback(async (options?: { silent?: boolean }) => {
    if (!reportId) {
      setMessages([]);
      setLoading(false);
      return;
    }

    if (!options?.silent) {
      setLoading(true);
    }

    setError(null);

    const { data, error: queryError } = await supabase
      .from("messages")
      .select("*")
      .eq("report_id", reportId)
      .order("created_at", { ascending: true });

    if (queryError) {
      if (!options?.silent) {
        setMessages([]);
      }
      setError(queryError.message);
      setLoading(false);
      return;
    }

    setMessages((current) =>
      options?.silent
        ? mergeMessages(current, (data ?? []) as Message[])
        : sortMessages((data ?? []) as Message[]),
    );
    setLoading(false);
  }, [reportId]);

  useEffect(() => {
    loadMessages();
  }, [loadMessages]);

  useEffect(() => {
    if (!reportId) return;

    const channel = supabase
      .channel(realtimeTopic(`messages-${reportId}`))
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "messages",
          filter: `report_id=eq.${reportId}`,
        },
        (payload) => {
          const nextMessage = payload.new as Message | null;

          if (nextMessage?.id) {
            setMessages((current) => mergeMessages(current, nextMessage));
            return;
          }

          loadMessages({ silent: true });
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadMessages, reportId]);

  useEffect(() => {
    if (!reportId) return;

    const interval = setInterval(() => {
      loadMessages({ silent: true });
    }, chatPollingMs);

    return () => {
      clearInterval(interval);
    };
  }, [loadMessages, reportId]);

  useEffect(() => {
    if (!reportId) return;

    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") {
        loadMessages({ silent: true });
      }
    });

    return () => {
      subscription.remove();
    };
  }, [loadMessages, reportId]);

  const sendMessage = useCallback(
    async (
      body: string,
      kind: MessageKind = "text",
      options?: { mediaUrl?: string; voiceDurationSeconds?: number },
    ) => {
      if (!reportId || !profile?.id) return;

      const trimmedBody = body.trim();
      if (!trimmedBody && kind === "text") return;
      if (sendingRef.current) return;

      sendingRef.current = true;
      setSending(true);

      try {
        const { data, error: insertError } = await supabase
          .from("messages")
          .insert({
            report_id: reportId,
            sender_id: profile.id,
            body: trimmedBody || null,
            kind,
            media_url: options?.mediaUrl ?? null,
            voice_duration_seconds: options?.voiceDurationSeconds ?? null,
          })
          .select("*")
          .single();

        if (insertError) {
          throw new Error(insertError.message);
        }

        if (data) {
          setMessages((current) => mergeMessages(current, data as Message));
        }
      } finally {
        sendingRef.current = false;
        setSending(false);
      }
    },
    [profile?.id, reportId],
  );

  const sendVoiceNote = useCallback(
    async (uri: string, durationSeconds: number) => {
      if (!reportId || !profile?.id) return;
      if (sendingRef.current) return;

      sendingRef.current = true;
      setSending(true);

      try {
        const response = await fetch(uri);
        const contentType = voiceContentType(uri, response.headers.get("content-type"));
        const fileBody = await response.arrayBuffer();
        const storagePath = `${reportId}/${profile.id}/${Date.now()}.${voiceExtension(
          contentType,
          uri,
        )}`;

        const { error: uploadError } = await supabase.storage
          .from(voiceNoteBucket)
          .upload(storagePath, fileBody, {
            contentType,
            upsert: false,
          });

        if (uploadError) {
          throw new Error(voiceStorageError(uploadError.message));
        }

        const { data: publicUrlData } = supabase.storage
          .from(voiceNoteBucket)
          .getPublicUrl(storagePath);

        const { data, error: insertError } = await supabase
          .from("messages")
          .insert({
            report_id: reportId,
            sender_id: profile.id,
            body: "Voice note",
            kind: "voice",
            media_url: publicUrlData.publicUrl,
            voice_duration_seconds: durationSeconds,
          })
          .select("*")
          .single();

        if (insertError) {
          throw new Error(insertError.message);
        }

        if (data) {
          setMessages((current) => mergeMessages(current, data as Message));
        }
      } finally {
        sendingRef.current = false;
        setSending(false);
      }
    },
    [profile?.id, reportId],
  );

  return {
    messages,
    loading,
    error,
    sending,
    sendMessage,
    sendVoiceNote,
    reload: loadMessages,
  };
}

export function useEmergencyActions() {
  const { profile } = useAuth();

  const createReport = useCallback(
    async ({
      type,
      title,
      description,
      priority = "high",
      sensorDetected = false,
    }: ReportInsert) => {
      if (!profile?.id) {
        throw new Error("Profil belum siap. Silakan login ulang.");
      }

      const callRoom = `sigapid-${Date.now()}-${profile.id.slice(0, 8)}`;
      const location = await getCurrentLocation();

      const { data, error: insertError } = await supabase
        .from("emergency_reports")
        .insert({
          reporter_id: profile.id,
          subject_profile_id: profile.id,
          type,
          priority,
          title,
          description: description ?? null,
          status: "pending",
          call_room: callRoom,
          sensor_detected: sensorDetected,
          auto_dispatch_at: sensorDetected ? new Date().toISOString() : null,
          latitude: location?.latitude ?? null,
          longitude: location?.longitude ?? null,
          accuracy: location?.accuracy ?? null,
          address: profile.address ?? null,
        })
        .select("*")
        .single();

      if (insertError) {
        throw new Error(insertError.message);
      }

      const report = data as EmergencyReport;
      const { error: assignError } = await supabase.rpc(
        "assign_operator_to_report",
        { target_report_id: report.id },
      );

      if (assignError) {
        throw new Error(assignError.message);
      }

      return report;
    },
    [profile?.address, profile?.id],
  );

  const updateReport = useCallback(async (reportId: string, update: ReportUpdate) => {
    const { error } = await supabase
      .from("emergency_reports")
      .update(update)
      .eq("id", reportId);

    if (error) {
      throw new Error(error.message);
    }
  }, []);

  const updateReportLocation = useCallback(async (reportId: string) => {
    const location = await getCurrentLocation();

    if (!location) {
      throw new Error("Izin lokasi belum diberikan.");
    }

    const { error } = await supabase
      .from("emergency_reports")
      .update({
        latitude: location.latitude,
        longitude: location.longitude,
        accuracy: location.accuracy,
      })
      .eq("id", reportId);

    if (error) {
      throw new Error(error.message);
    }
  }, []);

  const acceptReport = useCallback(
    async (reportId: string) => {
      const { error } = await supabase.rpc("claim_report_for_operator", {
        target_report_id: reportId,
      });

      if (error) {
        const message = error.message.toLowerCase().includes("schema cache")
          ? "Fungsi claim operator belum aktif di Supabase. Jalankan ulang supabase/profiles.sql di SQL Editor, lalu tunggu beberapa detik sampai schema cache reload."
          : error.message;

        throw new Error(message);
      }
    },
    [],
  );

  const finishReport = useCallback(
    async (reportId: string) => {
      const now = new Date().toISOString();
      await updateReport(reportId, { status: "resolved", resolved_at: now });

      await supabase
        .from("operator_assignments")
        .update({ status: "completed", completed_at: now })
        .eq("report_id", reportId);
    },
    [updateReport],
  );

  return {
    createReport,
    acceptReport,
    finishReport,
    updateReport,
    updateReportLocation,
  };
}
