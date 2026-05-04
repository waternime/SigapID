import { router, useLocalSearchParams } from "expo-router";
import { Alert, StyleSheet, Text, View } from "react-native";
import { useEmergencyActions, useEmergencyReport } from "@/hooks/useEmergencyReports";
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
} from "@/components/app/MockAppUI";

export default function OperatorReportDetail() {
  const params = useLocalSearchParams<{ reportId?: string }>();
  const { report, loading, error } = useEmergencyReport(params.reportId);
  const { acceptReport, finishReport } = useEmergencyActions();

  const handleFinish = async () => {
    if (!report?.id) return;

    try {
      await finishReport(report.id);
      router.replace("/operator/history");
    } catch (finishError) {
      Alert.alert(
        "Gagal menyelesaikan laporan",
        finishError instanceof Error ? finishError.message : "Terjadi kesalahan.",
      );
    }
  };

  const handleOpenChat = async () => {
    if (!report?.id) return;

    try {
      await acceptReport(report.id);
      router.push({
        pathname: "/operator/chat",
        params: { reportId: report.id },
      });
    } catch (acceptError) {
      Alert.alert(
        "Gagal membuka chat",
        acceptError instanceof Error ? acceptError.message : "Terjadi kesalahan.",
      );
    }
  };

  if (loading) {
    return (
      <ScreenShell
        role="operator"
        title="Memuat Detail"
        subtitle="Mengambil detail laporan dari backend."
      >
        <Card>
          <Text style={styles.reporterMeta}>Sebentar, data sedang dimuat.</Text>
        </Card>
      </ScreenShell>
    );
  }

  if (error || !report) {
    return (
      <ScreenShell
        role="operator"
        title="Laporan Tidak Ditemukan"
        subtitle={error ?? "Pilih laporan dari dashboard operator."}
      >
        <PrimaryAction
          label="Kembali"
          tone="secondary"
          onPress={() => router.replace("/operator/dashboard")}
        />
      </ScreenShell>
    );
  }

  return (
    <ScreenShell
      role="operator"
      title="Detail Laporan"
      subtitle={`Masuk ${formatRelativeTime(report.created_at)} - ${emergencyStatusLabel(report.status)}`}
      action={
        <IconButton
          icon="dots-horizontal"
          tone="secondary"
          onPress={() => Alert.alert("Opsi laporan")}
        />
      }
    >
      <MiniMap
        height={200}
        latitude={report.latitude}
        longitude={report.longitude}
      />

      <InfoGrid
        items={[
          { label: "Jenis", value: emergencyTypeLabel(report.type) },
          { label: "Prioritas", value: report.priority },
          { label: "Status", value: emergencyStatusLabel(report.status) },
          { label: "Masuk", value: formatRelativeTime(report.created_at) },
          {
            label: "Koordinat",
            value:
              typeof report.latitude === "number" &&
              typeof report.longitude === "number"
                ? `${report.latitude.toFixed(4)}, ${report.longitude.toFixed(4)}`
                : "Belum ada",
          },
        ]}
      />

      <Card style={styles.reporterCard}>
        <View style={styles.reporterHeader}>
          <View style={styles.reporterText}>
            <Text style={styles.reporterName}>
              {report.reporter?.full_name ?? "Pelapor"}
            </Text>
            <Text style={styles.reporterMeta}>
              {report.reporter?.phone || report.reporter?.email || "Kontak belum tersedia"}
            </Text>
          </View>
          <StatusPill label={emergencyTypeLabel(report.type)} tone="danger" />
        </View>
        <View style={styles.tags}>
          <View style={styles.tag}>
            <Text style={styles.tagText}>{report.call_room ?? "Call room belum ada"}</Text>
          </View>
          <View style={styles.tag}>
            <Text style={styles.tagText}>{report.sensor_detected ? "Sensor aktif" : "Manual"}</Text>
          </View>
          <View style={styles.tag}>
            <Text style={styles.tagText}>{report.description ?? report.title ?? "Tanpa catatan"}</Text>
          </View>
        </View>
      </Card>

      <View style={styles.quickActions}>
        <PrimaryAction
          label="Call"
          icon="phone"
          tone="soft"
          style={styles.quickButton}
          onPress={() => showApkOnlyFeature("Panggilan")}
        />
        <PrimaryAction
          label="Message"
          icon="message-outline"
          tone="soft"
          style={styles.quickButton}
          onPress={handleOpenChat}
        />
        <PrimaryAction
          label="Selesai"
          icon="check-circle-outline"
          tone="secondary"
          style={styles.quickButton}
          onPress={handleFinish}
        />
      </View>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  reporterCard: {
    gap: spacing.md,
  },
  reporterHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  reporterText: {
    flex: 1,
  },
  reporterName: {
    ...typography.bodyStrong,
    color: colors.text,
  },
  reporterMeta: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 3,
  },
  tags: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  tag: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 999,
    backgroundColor: "#F8FEFF",
    paddingHorizontal: spacing.sm,
    paddingVertical: 7,
  },
  tagText: {
    fontSize: 11,
    color: colors.text,
  },
  quickActions: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  quickButton: {
    flex: 1,
    minHeight: 56,
    paddingHorizontal: spacing.sm,
  },
});
