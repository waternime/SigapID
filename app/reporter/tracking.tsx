import { Href, router, useLocalSearchParams } from "expo-router";
import { Alert, StyleSheet, Text, View } from "react-native";
import {
  useEmergencyActions,
  useEmergencyReport,
  useReporterReports,
} from "@/hooks/useEmergencyReports";
import { emergencyStatusLabel, emergencyTypeLabel, formatRelativeTime } from "@/utils/format";
import { showApkOnlyFeature } from "@/utils/nativeFeatures";
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

export default function ReporterTracking() {
  const params = useLocalSearchParams<{ reportId?: string }>();
  const { activeReport, loading: activeLoading } = useReporterReports();
  const targetReportId = params.reportId ?? activeReport?.id;
  const { report, loading, error, reload } = useEmergencyReport(targetReportId);
  const { finishReport, updateReportLocation } = useEmergencyActions();
  const active = report ?? activeReport;

  const handleFinish = async () => {
    if (!active?.id) return;

    try {
      await finishReport(active.id);
      router.replace("/reporter/history");
    } catch (finishError) {
      Alert.alert(
        "Gagal menyelesaikan laporan",
        finishError instanceof Error ? finishError.message : "Terjadi kesalahan.",
      );
    }
  };

  const openChat = () => {
    if (!active?.id) {
      Alert.alert("Belum ada laporan aktif", "Buat laporan darurat terlebih dahulu.");
      return;
    }

    router.push({
      pathname: "/reporter/chat",
      params: { reportId: active.id },
    });
  };

  const openCall = async () => {
    if (!active?.id) return;
    showApkOnlyFeature("Panggilan");
  };

  const refreshLocation = async () => {
    if (!active?.id) return;

    try {
      await updateReportLocation(active.id);
      await reload();
      Alert.alert("Lokasi diperbarui", "Koordinat laporan sudah diperbarui.");
    } catch (locationError) {
      Alert.alert(
        "Gagal memperbarui lokasi",
        locationError instanceof Error ? locationError.message : "Terjadi kesalahan.",
      );
    }
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
          <Text style={styles.mockNote}>Sebentar, data laporan sedang dimuat.</Text>
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
        <Card style={styles.sensorCard}>
          <Text style={styles.sectionCaption}>
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
          onPress={refreshLocation}
        />
      }
    >
      <Card style={styles.trackingCard}>
        <MiniMap
          height={260}
          latitude={active.latitude}
          longitude={active.longitude}
        />
        <View style={styles.trackingBody}>
          <View style={styles.statusRow}>
            <View style={styles.statusText}>
              <Text style={styles.sectionTitle}>Bantuan sedang menuju</Text>
              <Text style={styles.sectionCaption}>
                {active.assigned_operator?.full_name
                  ? `Terhubung dengan ${active.assigned_operator.full_name}.`
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
                label: "Lokasi",
                value:
                  typeof active.latitude === "number" &&
                  typeof active.longitude === "number"
                    ? `${active.latitude.toFixed(4)}, ${active.longitude.toFixed(4)}`
                    : "Belum ada",
              },
            ]}
          />

          <Text style={styles.mockNote}>
            {active.description ?? active.title ?? "Tetap berada di lokasi aman dan aktifkan notifikasi."}
          </Text>
        </View>

        <View style={styles.actionRow}>
          <PrimaryAction
            label="Kontak"
            icon="phone"
            tone="secondary"
            style={styles.actionFlex}
            onPress={openCall}
          />
          <PrimaryAction
            label="Pesan"
            icon="message-outline"
            tone="soft"
            style={styles.actionFlex}
            onPress={openChat}
          />
          <PrimaryAction
            label="Selesai"
            icon="check-circle-outline"
            tone="danger"
            style={styles.actionFlex}
            onPress={handleFinish}
          />
        </View>
      </Card>

      <Card style={styles.sensorCard}>
        <View style={styles.statusRow}>
          <View style={styles.statusText}>
            <Text style={styles.sectionTitle}>Deteksi guncangan</Text>
            <Text style={styles.sectionCaption}>
              Jika sensor membaca benturan keras, sistem akan menunggu konfirmasi 10 detik.
            </Text>
          </View>
          <PrimaryAction
            label="Coba"
            tone="danger"
            onPress={() => navigateTo("/reporter/emergency-alert" as Href)}
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
