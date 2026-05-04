import { router } from "expo-router";
import { Alert, StyleSheet, Text, View } from "react-native";
import { useEmergencyActions, useOperatorReports } from "@/hooks/useEmergencyReports";
import { emergencyStatusLabel, emergencyTypeLabel, formatRelativeTime } from "@/utils/format";
import { showApkOnlyFeature } from "@/utils/nativeFeatures";
import { colors, spacing, typography } from "@/theme";
import {
  Card,
  IconButton,
  MiniMap,
  PrimaryAction,
  ScreenShell,
  StatusPill,
} from "@/components/app/MockAppUI";

export default function OperatorDashboard() {
  const { activeReports, loading, error } = useOperatorReports();
  const { acceptReport } = useEmergencyActions();

  const handleAccept = async (reportId: string) => {
    try {
      await acceptReport(reportId);
      router.push({ pathname: "/operator/chat", params: { reportId } });
    } catch (acceptError) {
      Alert.alert(
        "Gagal menerima laporan",
        acceptError instanceof Error ? acceptError.message : "Terjadi kesalahan.",
      );
    }
  };

  return (
    <ScreenShell
      role="operator"
      activeTab="home"
      title="Laporan Masuk"
      subtitle="Prioritas laporan disusun untuk operator yang paling siap."
      action={<IconButton icon="bell-outline" tone="secondary" />}
    >
      <View style={styles.list}>
        {loading ? (
          <Card>
            <Text style={styles.reportMeta}>Memuat laporan masuk...</Text>
          </Card>
        ) : error ? (
          <Card>
            <Text style={styles.reportMeta}>Data laporan gagal dimuat: {error}</Text>
          </Card>
        ) : activeReports.length === 0 ? (
          <Card>
            <Text style={styles.reportTitle}>Belum ada laporan aktif</Text>
            <Text style={styles.reportMeta}>
              Laporan baru akan muncul otomatis saat pelapor mengirim darurat.
            </Text>
          </Card>
        ) : (
          activeReports.map((report) => (
          <Card key={report.id} style={styles.reportCard}>
            <View style={styles.reportHeader}>
              <View style={styles.reportText}>
                <Text style={styles.reportTitle}>
                  {report.title ?? emergencyTypeLabel(report.type)}
                </Text>
                <Text style={styles.reportMeta}>
                  Pelapor: {report.reporter?.full_name ?? "Pelapor"} -{" "}
                  {formatRelativeTime(report.created_at)}
                </Text>
              </View>
              <StatusPill
                label={emergencyStatusLabel(report.status)}
                tone={report.status === "pending" ? "warning" : "success"}
              />
            </View>

            <MiniMap
              height={92}
              latitude={report.latitude}
              longitude={report.longitude}
            />

            <View style={styles.actions}>
              <PrimaryAction
                label="Call"
                icon="phone"
                tone="soft"
                style={styles.action}
                onPress={() => showApkOnlyFeature("Panggilan")}
              />
              <PrimaryAction
                label="Chat"
                icon="message-outline"
                tone="soft"
                style={styles.action}
                onPress={() => handleAccept(report.id)}
              />
              <PrimaryAction
                label={report.status === "pending" ? "Terima" : "Detail"}
                icon={report.status === "pending" ? "check-circle-outline" : "file-search-outline"}
                tone="secondary"
                style={styles.action}
                onPress={() =>
                  report.status === "pending"
                    ? handleAccept(report.id)
                    : router.push({
                        pathname: "/operator/report-detail",
                        params: { reportId: report.id },
                      })
                }
              />
            </View>
          </Card>
        ))
        )}
      </View>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  list: {
    gap: spacing.md,
  },
  reportCard: {
    gap: spacing.md,
  },
  reportHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  reportText: {
    flex: 1,
  },
  reportTitle: {
    ...typography.bodyStrong,
    color: colors.text,
  },
  reportMeta: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 3,
  },
  actions: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  action: {
    flex: 1,
    minHeight: 42,
    paddingHorizontal: spacing.sm,
  },
});
