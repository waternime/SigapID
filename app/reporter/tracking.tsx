import { Href, router, useLocalSearchParams } from "expo-router";
import { useRef, useState } from "react";
import { Alert, StyleSheet, Text, View } from "react-native";
import {
  useEmergencyActions,
  useEmergencyReport,
  useReporterReports,
} from "@/hooks/useEmergencyReports";
import { useReportDispatches } from "@/hooks/useUnitDispatches";
import { useCallInvitationActions } from "@/hooks/useCallInvitations";
import { useAppNotification } from "@/components/app/AppNotification";
import { useAppTheme } from "@/hooks/useAppTheme";
import {
  emergencyStatusLabel,
  emergencyTypeLabel,
  formatRelativeTime,
  unitDispatchStatusLabel,
  unitTypeLabel,
} from "@/utils/format";
import { colors, spacing, typography } from "@/theme";
import {
  Card,
  IconButton,
  InfoGrid,
  MiniMap,
  PrimaryAction,
  ScreenShell,
  StatusPill,
  navigateTo,
} from "@/components/app/MockAppUI";

type TrackingBusyAction = "chat" | "finish" | "location" | "sensor";

export default function ReporterTracking() {
  const { palette, mode } = useAppTheme();
  const { showNotification } = useAppNotification();
  const params = useLocalSearchParams<{ reportId?: string }>();
  const { activeReport, loading: activeLoading } = useReporterReports();
  const targetReportId = params.reportId ?? activeReport?.id;
  const { report, loading, error, reload } = useEmergencyReport(targetReportId);
  const { latestActiveDispatch } = useReportDispatches(targetReportId);
  const { finishReport, updateReportLocation } = useEmergencyActions();
  const { inviteCall } = useCallInvitationActions();
  const active = report ?? activeReport;
  const [busyAction, setBusyAction] = useState<TrackingBusyAction | null>(null);
  const busyActionRef = useRef<TrackingBusyAction | null>(null);

  const beginAction = (action: TrackingBusyAction) => {
    if (busyActionRef.current) return false;

    busyActionRef.current = action;
    setBusyAction(action);
    return true;
  };

  const endAction = (action: TrackingBusyAction) => {
    if (busyActionRef.current !== action) return;

    busyActionRef.current = null;
    setBusyAction(null);
  };

  const handleFinish = async () => {
    if (!active?.id) return;
    if (!beginAction("finish")) return;

    try {
      await finishReport(active.id);
      router.replace("/reporter/history");
    } catch (finishError) {
      Alert.alert(
        "Gagal menyelesaikan laporan",
        finishError instanceof Error ? finishError.message : "Terjadi kesalahan.",
      );
      endAction("finish");
    }
  };

  const openChat = () => {
    if (!active?.id) {
      Alert.alert("Belum ada laporan aktif", "Buat laporan darurat terlebih dahulu.");
      return;
    }

    if (!beginAction("chat")) return;

    router.push({
      pathname: "/reporter/chat",
      params: { reportId: active.id },
    });
  };

  const openCall = async () => {
    if (!active?.id) return;

    try {
      await inviteCall(active.id, active.call_room ?? `sigapid-${active.id}`);
      showNotification({
        title: "Panggilan dikirim",
        message: "Menunggu operator menerima panggilan.",
        tone: "info",
      });
      router.push({
        pathname: "/reporter/call",
        params: { reportId: active.id },
      });
    } catch (callError) {
      Alert.alert(
        "Gagal memulai panggilan",
        callError instanceof Error ? callError.message : "Terjadi kesalahan.",
      );
    }
  };

  const refreshLocation = async () => {
    if (!active?.id) return;
    if (!beginAction("location")) return;

    try {
      await updateReportLocation(active.id);
      await reload();
      showNotification({
        title: "Lokasi diperbarui",
        message: "Koordinat laporan sudah diperbarui.",
        tone: "success",
      });
    } catch (locationError) {
      Alert.alert(
        "Gagal memperbarui lokasi",
        locationError instanceof Error ? locationError.message : "Terjadi kesalahan.",
      );
    } finally {
      endAction("location");
    }
  };

  const openSensorAlert = () => {
    if (!beginAction("sensor")) return;

    navigateTo("/reporter/emergency-alert" as Href);
  };

  if (loading || activeLoading) {
    return (
      <ScreenShell
        role="reporter"
        activeTab="tracking"
        title="Memuat Laporan"
        subtitle="Mengambil laporan aktif dari backend."
      >
        <Card>
          <Text style={[styles.mockNote, { color: palette.muted }]}>
            Sebentar, data laporan sedang dimuat.
          </Text>
        </Card>
      </ScreenShell>
    );
  }

  if (error || !active) {
    return (
      <ScreenShell
        role="reporter"
        activeTab="tracking"
        title="Belum Ada Laporan Aktif"
        subtitle="Buat laporan darurat dari halaman home."
      >
        <Card
          style={[
            styles.sensorCard,
            {
              backgroundColor: mode === "dark" ? palette.cardSoft : "#FFF7F7",
              borderColor: "#FECACA",
            },
          ]}
        >
          <Text style={[styles.sectionCaption, { color: palette.muted }]}>
            {error ?? "Tidak ada laporan aktif yang perlu dilacak."}
          </Text>
          <PrimaryAction
            label="Buat Laporan"
            icon="alert-circle-outline"
            tone="danger"
            onPress={() => navigateTo("/reporter/dashboard" as Href)}
          />
        </Card>
      </ScreenShell>
    );
  }

  return (
    <ScreenShell
      role="reporter"
      activeTab="tracking"
      title={emergencyTypeLabel(active.type)}
      subtitle={`Laporan ${formatRelativeTime(active.created_at)} - ${emergencyStatusLabel(active.status)}`}
      action={
        <IconButton
          icon="crosshairs-gps"
          tone="secondary"
          disabled={!!busyAction}
          onPress={refreshLocation}
        />
      }
    >
      <Card style={styles.trackingCard}>
        <MiniMap
          height={260}
          latitude={active.latitude}
          longitude={active.longitude}
          operatorLatitude={latestActiveDispatch?.current_latitude}
          operatorLongitude={latestActiveDispatch?.current_longitude}
        />
        <View style={styles.trackingBody}>
          <View style={styles.statusRow}>
            <View style={styles.statusText}>
              <Text style={[styles.sectionTitle, { color: palette.text }]}>
                Bantuan sedang menuju
              </Text>
              <Text style={[styles.sectionCaption, { color: palette.muted }]}>
                {active.assigned_operator?.full_name
                  ? latestActiveDispatch
                    ? `${unitTypeLabel(latestActiveDispatch.unit_type)} ${unitDispatchStatusLabel(latestActiveDispatch.status).toLowerCase()}.`
                    : `Terhubung dengan ${active.assigned_operator.full_name}.`
                  : "Sistem sedang mencari operator yang tersedia."}
              </Text>
            </View>
            <StatusPill
              label={emergencyStatusLabel(active.status)}
              tone={active.status === "pending" ? "warning" : "success"}
            />
          </View>

          <InfoGrid
            items={[
              { label: "Prioritas", value: active.priority },
              { label: "Operator", value: active.assigned_operator?.full_name ?? "Mencari" },
              {
                label: "Unit",
                value: latestActiveDispatch
                  ? `${unitTypeLabel(latestActiveDispatch.unit_type)} - ${unitDispatchStatusLabel(latestActiveDispatch.status)}`
                  : "Belum dikirim",
              },
              {
                label: "Lokasi Unit",
                value: latestActiveDispatch?.last_location_at
                  ? formatRelativeTime(latestActiveDispatch.last_location_at)
                  : "Belum dikirim",
              },
              {
                label: "Lokasi",
                value:
                  typeof active.latitude === "number" &&
                  typeof active.longitude === "number"
                    ? `${active.latitude.toFixed(4)}, ${active.longitude.toFixed(4)}`
                    : "Belum ada",
              },
            ]}
          />

          <Text style={[styles.mockNote, { color: palette.muted }]}>
            {active.description ?? active.title ?? "Tetap berada di lokasi aman dan aktifkan notifikasi."}
          </Text>
        </View>

        <View style={styles.actionRow}>
          <PrimaryAction
            label="Kontak"
            icon="phone"
            tone="secondary"
            style={styles.actionFlex}
            disabled={!!busyAction}
            onPress={openCall}
          />
          <PrimaryAction
            label={busyAction === "chat" ? "Membuka..." : "Pesan"}
            icon="message-outline"
            tone="soft"
            style={styles.actionFlex}
            disabled={!!busyAction}
            onPress={openChat}
          />
          <PrimaryAction
            label={busyAction === "finish" ? "Menyimpan..." : "Selesai"}
            icon="check-circle-outline"
            tone="danger"
            style={styles.actionFlex}
            disabled={!!busyAction}
            onPress={handleFinish}
          />
        </View>
      </Card>

      <Card
        style={[
          styles.sensorCard,
          {
            backgroundColor: mode === "dark" ? palette.cardSoft : "#FFF7F7",
            borderColor: "#FECACA",
          },
        ]}
      >
        <View style={styles.statusRow}>
          <View style={styles.statusText}>
            <Text style={[styles.sectionTitle, { color: palette.text }]}>
              Deteksi guncangan
            </Text>
            <Text style={[styles.sectionCaption, { color: palette.muted }]}>
              Jika sensor membaca benturan keras, sistem akan menunggu konfirmasi 10 detik.
            </Text>
          </View>
          <PrimaryAction
            label={busyAction === "sensor" ? "Membuka..." : "Coba"}
            tone="danger"
            disabled={!!busyAction}
            onPress={openSensorAlert}
          />
        </View>
      </Card>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  trackingCard: {
    padding: 0,
    overflow: "hidden",
  },
  trackingBody: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    gap: spacing.md,
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  statusText: {
    flex: 1,
  },
  sectionTitle: {
    ...typography.bodyStrong,
    color: colors.text,
  },
  sectionCaption: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: 2,
    lineHeight: 18,
  },
  actionRow: {
    flexDirection: "row",
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
  },
  actionFlex: {
    flex: 1,
  },
  mockNote: {
    ...typography.caption,
    color: colors.textMuted,
    lineHeight: 18,
  },
  sensorCard: {
    borderColor: "#FECACA",
    backgroundColor: "#FFF7F7",
  },
});
