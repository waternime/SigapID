import { useCallback, useEffect, useMemo, useState } from "react";
import { AppState } from "react-native";
import * as Location from "expo-location";
import {
  UnitDispatch,
  UnitDispatchStatus,
  UnitType,
} from "@/types";
import { supabase } from "@/utils/supabase";
import { useAuth } from "@/hooks/useAuth";

const activeDispatchStatuses: UnitDispatchStatus[] = [
  "sent",
  "accepted",
  "on_route",
  "arrived",
];

const historyLimit = 15;
const refreshMs = 2500;
const cachedLocationMaxAgeMs = 30_000;
const cachedLocationRequiredAccuracy = 150;

function realtimeTopic(name: string) {
  return `${name}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function dispatchSelect() {
  return `
    *,
    unit_operator:profiles!unit_dispatches_responder_id_fkey (
      id,
      full_name,
      phone,
      email,
      unit_type
    ),
    dispatcher:profiles!unit_dispatches_dispatcher_id_fkey (
      id,
      full_name,
      phone,
      email
    ),
    report:emergency_reports!unit_dispatches_report_id_fkey (
      *,
      reporter:profiles!emergency_reports_reporter_id_fkey (
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
    )
  `;
}

function normalizeDispatch(dispatch: UnitDispatch) {
  return {
    ...dispatch,
    unit_operator: Array.isArray(dispatch.unit_operator)
      ? dispatch.unit_operator[0]
      : dispatch.unit_operator,
    dispatcher: Array.isArray(dispatch.dispatcher)
      ? dispatch.dispatcher[0]
      : dispatch.dispatcher,
    report: Array.isArray(dispatch.report) ? dispatch.report[0] : dispatch.report,
  } as UnitDispatch;
}

function isActiveDispatch(status: UnitDispatchStatus) {
  return activeDispatchStatuses.includes(status);
}

function hasDispatchLocation(dispatch: UnitDispatch) {
  return (
    typeof dispatch.current_latitude === "number" &&
    typeof dispatch.current_longitude === "number"
  );
}

function sortDispatches(dispatches: UnitDispatch[]) {
  return [...dispatches].sort((a, b) => {
    if (hasDispatchLocation(a) !== hasDispatchLocation(b)) {
      return hasDispatchLocation(a) ? -1 : 1;
    }

    return (
      new Date(b.assigned_at).getTime() - new Date(a.assigned_at).getTime()
    );
  });
}

function dispatchStorageError(message: string) {
  const lowerMessage = message.toLowerCase();

  if (lowerMessage.includes("schema cache") || lowerMessage.includes("function")) {
    return "Fungsi dispatch belum aktif di Supabase. Jalankan ulang supabase/profiles.sql di SQL Editor, lalu restart Expo.";
  }

  if (lowerMessage.includes("row-level security")) {
    return "Akses dispatch ditolak RLS. Jalankan ulang supabase/profiles.sql di SQL Editor.";
  }

  return message;
}

async function getCurrentLocation() {
  const permission = await Location.requestForegroundPermissionsAsync();

  if (!permission.granted) {
    throw new Error("Izin lokasi belum diberikan.");
  }

  const lastKnownPosition = await Location.getLastKnownPositionAsync({
    maxAge: cachedLocationMaxAgeMs,
    requiredAccuracy: cachedLocationRequiredAccuracy,
  });

  if (lastKnownPosition) {
    return {
      latitude: lastKnownPosition.coords.latitude,
      longitude: lastKnownPosition.coords.longitude,
      accuracy: lastKnownPosition.coords.accuracy,
    };
  }

  const position = await Location.getCurrentPositionAsync({
    accuracy: Location.Accuracy.Balanced,
    mayShowUserSettingsDialog: false,
  });

  return {
    latitude: position.coords.latitude,
    longitude: position.coords.longitude,
    accuracy: position.coords.accuracy,
  };
}

export function useReportDispatches(reportId?: string) {
  const [dispatches, setDispatches] = useState<UnitDispatch[]>([]);
  const [loading, setLoading] = useState(!!reportId);
  const [error, setError] = useState<string | null>(null);

  const loadDispatches = useCallback(async (options?: { silent?: boolean }) => {
    if (!reportId) {
      setDispatches([]);
      setLoading(false);
      return;
    }

    if (!options?.silent) {
      setLoading(true);
    }
    setError(null);

    const { data, error: queryError } = await supabase
      .from("unit_dispatches")
      .select(dispatchSelect())
      .eq("report_id", reportId)
      .order("assigned_at", { ascending: false });

    if (queryError) {
      const { data: fallbackData, error: fallbackError } = await supabase
        .from("unit_dispatches")
        .select("*")
        .eq("report_id", reportId)
        .order("assigned_at", { ascending: false });

      if (fallbackError) {
        if (!options?.silent) {
          setDispatches([]);
        }
        setError(dispatchStorageError(fallbackError.message));
        setLoading(false);
        return;
      }

      setDispatches(
        sortDispatches(
          ((fallbackData ?? []) as unknown as UnitDispatch[]).map(normalizeDispatch),
        ),
      );
      setLoading(false);
      return;
    }

    setDispatches(
      sortDispatches(((data ?? []) as unknown as UnitDispatch[]).map(normalizeDispatch)),
    );
    setLoading(false);
  }, [reportId]);

  useEffect(() => {
    loadDispatches();
  }, [loadDispatches]);

  useEffect(() => {
    if (!reportId) return;

    const channel = supabase
      .channel(realtimeTopic(`report-dispatches-${reportId}`))
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "unit_dispatches",
          filter: `report_id=eq.${reportId}`,
        },
        () => loadDispatches({ silent: true }),
      )
      .subscribe();

    const interval = setInterval(
      () => loadDispatches({ silent: true }),
      refreshMs,
    );

    return () => {
      clearInterval(interval);
      supabase.removeChannel(channel);
    };
  }, [loadDispatches, reportId]);

  const activeDispatches = useMemo(
    () =>
      sortDispatches(
        dispatches.filter((dispatch) => isActiveDispatch(dispatch.status)),
      ),
    [dispatches],
  );

  const latestActiveDispatch = activeDispatches[0] ?? null;

  return {
    dispatches,
    activeDispatches,
    latestActiveDispatch,
    loading,
    error,
    reload: loadDispatches,
  };
}

export function useUnitOperatorDispatches() {
  const { profile } = useAuth();
  const [dispatches, setDispatches] = useState<UnitDispatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadDispatches = useCallback(async (options?: { silent?: boolean }) => {
    if (!profile?.id) {
      setDispatches([]);
      setLoading(false);
      return;
    }

    if (!options?.silent) {
      setLoading(true);
    }
    setError(null);

    const { data, error: queryError } = await supabase
      .from("unit_dispatches")
      .select(dispatchSelect())
      .eq("responder_id", profile.id)
      .order("assigned_at", { ascending: false });

    if (queryError) {
      if (!options?.silent) {
        setDispatches([]);
      }
      setError(dispatchStorageError(queryError.message));
      setLoading(false);
      return;
    }

    setDispatches(((data ?? []) as unknown as UnitDispatch[]).map(normalizeDispatch));
    setLoading(false);
  }, [profile?.id]);

  useEffect(() => {
    loadDispatches();
  }, [loadDispatches]);

  useEffect(() => {
    if (!profile?.id) return;

    const channel = supabase
      .channel(realtimeTopic(`unit-operator-dispatches-${profile.id}`))
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "unit_dispatches",
          filter: `responder_id=eq.${profile.id}`,
        },
        () => loadDispatches({ silent: true }),
      )
      .subscribe();

    const interval = setInterval(
      () => loadDispatches({ silent: true }),
      refreshMs,
    );

    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") {
        loadDispatches({ silent: true });
      }
    });

    return () => {
      clearInterval(interval);
      subscription.remove();
      supabase.removeChannel(channel);
    };
  }, [loadDispatches, profile?.id]);

  const activeDispatches = useMemo(
    () => dispatches.filter((dispatch) => isActiveDispatch(dispatch.status)),
    [dispatches],
  );

  const history = useMemo(
    () =>
      dispatches
        .filter((dispatch) => !isActiveDispatch(dispatch.status))
        .slice(0, historyLimit),
    [dispatches],
  );

  return {
    dispatches,
    activeDispatches,
    history,
    loading,
    error,
    reload: loadDispatches,
  };
}

export function useUnitDispatchActions() {
  const dispatchUnit = useCallback(async (reportId: string, unitType: UnitType) => {
    const { data, error } = await supabase.rpc("dispatch_report_to_unit", {
      target_report_id: reportId,
      target_unit_type: unitType,
    });

    if (error) {
      throw new Error(dispatchStorageError(error.message));
    }

    return data as string;
  }, []);

  const updateDispatchStatus = useCallback(
    async (dispatchId: string, status: UnitDispatchStatus) => {
      const { error } = await supabase.rpc("update_unit_dispatch_status", {
        target_dispatch_id: dispatchId,
        target_status: status,
      });

      if (error) {
        throw new Error(dispatchStorageError(error.message));
      }
    },
    [],
  );

  const updateDispatchLocation = useCallback(async (dispatchId: string) => {
    const location = await getCurrentLocation();

    const { error } = await supabase.rpc("update_unit_dispatch_location", {
      target_dispatch_id: dispatchId,
      latitude: location.latitude,
      longitude: location.longitude,
      accuracy: location.accuracy,
    });

    if (error) {
      throw new Error(dispatchStorageError(error.message));
    }
  }, []);

  return {
    dispatchUnit,
    updateDispatchStatus,
    updateDispatchLocation,
  };
}
