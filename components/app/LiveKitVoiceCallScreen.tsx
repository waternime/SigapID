import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useMemo, useRef } from "react";
import { StyleSheet, Text, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useAuth } from "@/hooks/useAuth";
import { useEmergencyReport } from "@/hooks/useEmergencyReports";
import { useLiveKitVoiceCall } from "@/hooks/useLiveKitVoiceCall";
import { useAppTheme } from "@/hooks/useAppTheme";
import { colors, shadow, spacing, typography } from "@/theme";
import {
  Card,
  PrimaryAction,
  ScreenShell,
  StatusPill,
} from "@/components/app/MockAppUI";

type Role = "reporter" | "operator";

const statusText = {
  idle: "Menyiapkan panggilan...",
  connecting: "Menghubungkan...",
  connected: "Terhubung",
  reconnecting: "Menyambungkan ulang...",
  disconnected: "Panggilan selesai",
  error: "Panggilan gagal",
};

export function LiveKitVoiceCallScreen({ role }: { role: Role }) {
  const { palette, mode } = useAppTheme();
  const { profile } = useAuth();
  const params = useLocalSearchParams<{ reportId?: string }>();
  const { report, loading, error } = useEmergencyReport(params.reportId);
  const {
    status,
    error: callError,
    remoteCount,
    muted,
    speakerOn,
    startCall,
    leaveCall,
    toggleMute,
    toggleSpeaker,
  } = useLiveKitVoiceCall();
  const peerName = role === "operator"
    ? report?.reporter?.full_name ?? "Pelapor"
    : report?.assigned_operator?.full_name ?? "Operator";
  const roomName = report?.call_room ?? (report?.id ? `sigapid-${report.id}` : null);
  const participantName = profile?.full_name ?? profile?.email ?? "SigapID";
  const startedRef = useRef(false);
  const isConnected = status === "connected";
  const isWorking = status === "connecting" || status === "reconnecting";
  const statusTone = status === "error"
    ? "danger"
    : isConnected
      ? "success"
      : "info";
  const subtitle = useMemo(() => {
    if (loading) return "Mengambil data laporan.";
    if (error) return error;
    return roomName ? `Room ${roomName}` : "Room panggilan belum tersedia.";
  }, [error, loading, roomName]);

  useEffect(() => {
    if (!roomName || !participantName || loading || error) return;
    if (startedRef.current) return;

    startedRef.current = true;
    startCall({ roomName, participantName });
  }, [error, loading, participantName, roomName, startCall]);

  const handleEndCall = async () => {
    await leaveCall();
    router.back();
  };

  return (
    <ScreenShell
      role={role}
      title="Panggilan Darurat"
      subtitle={subtitle}
      scroll={false}
      backgroundColor={mode === "dark" ? palette.background : "#F8FAFC"}
    >
      <View style={styles.callLayout}>
        <Card style={styles.callCard}>
          <View
            style={[
              styles.avatarHalo,
              { backgroundColor: mode === "dark" ? palette.cardSoft : "#E0F2FE" },
            ]}
          >
            <View style={styles.avatar}>
              <MaterialCommunityIcons
                name={role === "operator" ? "account-alert-outline" : "headset"}
                size={42}
                color={colors.textInverse}
              />
            </View>
          </View>

          <Text style={[styles.peerName, { color: palette.text }]}>{peerName}</Text>
          <Text style={[styles.peerCaption, { color: palette.muted }]}>
            {remoteCount > 0
              ? `${remoteCount} peserta lain di panggilan`
              : "Menunggu lawan bicara masuk"}
          </Text>

          <StatusPill label={statusText[status]} tone={statusTone} />

          {!!callError && (
            <Text style={[styles.errorText, { color: colors.danger }]}>
              {callError}
            </Text>
          )}
        </Card>

        <View style={styles.controls}>
          <PrimaryAction
            label={muted ? "Unmute" : "Mute"}
            icon={muted ? "microphone-off" : "microphone"}
            tone="soft"
            style={styles.controlButton}
            disabled={!isConnected}
            onPress={toggleMute}
          />
          <PrimaryAction
            label={speakerOn ? "Speaker" : "Earpiece"}
            icon={speakerOn ? "volume-high" : "phone-in-talk"}
            tone="soft"
            style={styles.controlButton}
            disabled={!isConnected}
            onPress={toggleSpeaker}
          />
          <PrimaryAction
            label={isWorking ? "Batal" : "Akhiri"}
            icon="phone-hangup"
            tone="danger"
            style={styles.controlButton}
            onPress={handleEndCall}
          />
        </View>

        <Text style={[styles.note, { color: palette.muted }]}>
          Panggilan ini memakai internet dan akun SigapID, bukan nomor HP.
        </Text>
      </View>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  callLayout: {
    flex: 1,
    justifyContent: "center",
    gap: spacing.lg,
  },
  callCard: {
    alignItems: "center",
    gap: spacing.md,
    paddingVertical: spacing.xxl,
  },
  avatarHalo: {
    width: 128,
    height: 128,
    borderRadius: 64,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#E0F2FE",
  },
  avatar: {
    width: 92,
    height: 92,
    borderRadius: 46,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.secondary,
    ...shadow.md,
  },
  peerName: {
    ...typography.h1,
    textAlign: "center",
  },
  peerCaption: {
    ...typography.caption,
    textAlign: "center",
  },
  errorText: {
    ...typography.caption,
    textAlign: "center",
    lineHeight: 18,
  },
  controls: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  controlButton: {
    flex: 1,
    minHeight: 58,
    paddingHorizontal: spacing.xs,
  },
  note: {
    ...typography.caption,
    textAlign: "center",
    lineHeight: 18,
  },
});
