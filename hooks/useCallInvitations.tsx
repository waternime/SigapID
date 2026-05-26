import { router } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useAuth } from "@/hooks/useAuth";
import { useAppTheme } from "@/hooks/useAppTheme";
import { useAppNotification } from "@/components/app/AppNotification";
import { PrimaryAction } from "@/components/app/MockAppUI";
import { showRealtimeNotification } from "@/utils/realtimeNotifications";
import { supabase } from "@/utils/supabase";
import { colors, radius, shadow, spacing, typography } from "@/theme";
import { Message } from "@/types";

const callSignalName = "sigapid-call-signal";
const callInviteType = "call_invite";
const callDeclinedType = "call_declined";

type CallSignalType = typeof callInviteType | typeof callDeclinedType;

type CallSignalPayload = {
  sigapid: typeof callSignalName;
  type: CallSignalType;
  roomName: string;
  callerName?: string;
  createdAt: string;
};

type IncomingCall = {
  reportId: string;
  roomName: string;
  callerName: string;
};

function realtimeTopic(name: string) {
  return `${name}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function parseCallSignal(body: string | null): CallSignalPayload | null {
  if (!body) return null;

  try {
    const payload = JSON.parse(body) as Partial<CallSignalPayload>;

    if (
      payload.sigapid !== callSignalName ||
      (payload.type !== callInviteType && payload.type !== callDeclinedType) ||
      typeof payload.roomName !== "string"
    ) {
      return null;
    }

    return {
      sigapid: callSignalName,
      type: payload.type,
      roomName: payload.roomName,
      callerName:
        typeof payload.callerName === "string" ? payload.callerName : undefined,
      createdAt:
        typeof payload.createdAt === "string"
          ? payload.createdAt
          : new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

function buildCallSignalBody({
  type,
  roomName,
  callerName,
}: {
  type: CallSignalType;
  roomName: string;
  callerName?: string | null;
}) {
  return JSON.stringify({
    sigapid: callSignalName,
    type,
    roomName,
    callerName: callerName ?? "SigapID",
    createdAt: new Date().toISOString(),
  } satisfies CallSignalPayload);
}

export function useCallInvitationActions() {
  const { profile } = useAuth();

  const sendCallSignal = useCallback(
    async ({
      reportId,
      roomName,
      type,
    }: {
      reportId: string;
      roomName: string;
      type: CallSignalType;
    }) => {
      if (!profile?.id) {
        throw new Error("Profil belum siap. Silakan login ulang.");
      }

      const { error } = await supabase.from("messages").insert({
        report_id: reportId,
        sender_id: profile.id,
        kind: "system",
        body: buildCallSignalBody({
          type,
          roomName,
          callerName: profile.full_name ?? profile.email,
        }),
      });

      if (error) {
        throw new Error(error.message);
      }
    },
    [profile?.email, profile?.full_name, profile?.id],
  );

  const inviteCall = useCallback(
    (reportId: string, roomName: string) =>
      sendCallSignal({ reportId, roomName, type: callInviteType }),
    [sendCallSignal],
  );

  const declineCall = useCallback(
    (reportId: string, roomName: string) =>
      sendCallSignal({ reportId, roomName, type: callDeclinedType }),
    [sendCallSignal],
  );

  return { inviteCall, declineCall };
}

export function IncomingCallListener() {
  const { profile } = useAuth();
  const { palette, mode } = useAppTheme();
  const { showNotification } = useAppNotification();
  const { declineCall } = useCallInvitationActions();
  const [incomingCall, setIncomingCall] = useState<IncomingCall | null>(null);
  const handledMessagesRef = useRef(new Set<string>());

  useEffect(() => {
    if (!profile?.id) return;

    const channel = supabase
      .channel(realtimeTopic(`call-invites-${profile.id}`))
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
        },
        (payload) => {
          const message = payload.new as Message | null;
          if (!message?.id || message.sender_id === profile.id) return;
          if (handledMessagesRef.current.has(message.id)) return;

          const signal = parseCallSignal(message.body);
          if (!signal) return;

          handledMessagesRef.current.add(message.id);

          if (signal.type === callDeclinedType) {
            showNotification({
              title: "Panggilan ditolak",
              message: `${signal.callerName ?? "Kontak"} menolak panggilan.`,
              tone: "warning",
            });
            return;
          }

          setIncomingCall({
            reportId: message.report_id,
            roomName: signal.roomName,
            callerName: signal.callerName ?? "SigapID",
          });
          showNotification({
            title: "Panggilan masuk",
            message: `${signal.callerName ?? "Kontak"} memanggil kamu.`,
            tone: "info",
          });
          showRealtimeNotification({
            title: "Panggilan SigapID",
            body: `${signal.callerName ?? "Kontak"} memanggil kamu.`,
            data: {
              kind: "call_invite",
              reportId: message.report_id,
            },
          }).catch(() => undefined);
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile?.id, showNotification]);

  const closeIncomingCall = () => {
    setIncomingCall(null);
  };

  const acceptIncomingCall = () => {
    if (!incomingCall) return;

    const route =
      profile?.role === "dispatcher" ? "/operator/call" : "/reporter/call";
    const reportId = incomingCall.reportId;

    setIncomingCall(null);
    router.push({
      pathname: route,
      params: { reportId },
    });
  };

  const declineIncomingCall = async () => {
    if (!incomingCall) return;

    const call = incomingCall;
    setIncomingCall(null);

    try {
      await declineCall(call.reportId, call.roomName);
    } catch {
      showNotification({
        title: "Gagal menolak panggilan",
        message: "Coba tutup panggilan dari layar call.",
        tone: "danger",
      });
    }
  };

  return (
    <Modal
      transparent
      visible={!!incomingCall}
      animationType="fade"
      onRequestClose={closeIncomingCall}
    >
      <View style={styles.backdrop}>
        <View
          style={[
            styles.sheet,
            {
              backgroundColor: palette.card,
              borderColor: mode === "dark" ? palette.borderStrong : palette.border,
            },
          ]}
        >
          <View style={styles.callIconWrap}>
            <MaterialCommunityIcons
              name="phone-in-talk"
              size={34}
              color={colors.textInverse}
            />
          </View>
          <Text style={[styles.title, { color: palette.text }]}>
            Panggilan masuk
          </Text>
          <Text style={[styles.caption, { color: palette.muted }]}>
            {incomingCall?.callerName ?? "Kontak"} ingin memulai panggilan darurat.
          </Text>

          <View style={styles.actions}>
            <PrimaryAction
              label="Tolak"
              icon="phone-hangup"
              tone="danger"
              style={styles.actionButton}
              onPress={declineIncomingCall}
            />
            <PrimaryAction
              label="Terima"
              icon="phone"
              tone="secondary"
              style={styles.actionButton}
              onPress={acceptIncomingCall}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(15, 23, 42, 0.45)",
    padding: spacing.lg,
  },
  sheet: {
    width: "100%",
    maxWidth: 360,
    alignItems: "center",
    gap: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: spacing.xl,
    ...shadow.lg,
  },
  callIconWrap: {
    width: 74,
    height: 74,
    borderRadius: 37,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.secondary,
  },
  title: {
    ...typography.h2,
    textAlign: "center",
  },
  caption: {
    ...typography.caption,
    textAlign: "center",
    lineHeight: 18,
  },
  actions: {
    width: "100%",
    flexDirection: "row",
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  actionButton: {
    flex: 1,
  },
});
