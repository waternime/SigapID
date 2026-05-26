import { StyleSheet, Text, View } from "react-native";
import { useReporterReports } from "@/hooks/useEmergencyReports";
import { useAppTheme } from "@/hooks/useAppTheme";
import { emergencyStatusLabel, emergencyTypeLabel, formatRelativeTime } from "@/utils/format";
import { colors, spacing, typography } from "@/theme";
import {
  Card,
  IconButton,
  ScreenShell,
  StatusPill,
} from "@/components/app/MockAppUI";

export default function ReporterHistory() {
  const { palette } = useAppTheme();
  const { history, loading, error } = useReporterReports();

  return (
    <ScreenShell
      role="reporter"
      activeTab="history"
      title="Laporan Selesai"
      subtitle="15 riwayat terbaru yang sudah ditangani."
      action={<IconButton icon="clock-outline" tone="secondary" disabled />}
    >
      <View style={styles.list}>
        {loading ? (
          <Card>
            <Text style={[styles.itemTime, { color: palette.muted }]}>
              Memuat histori...
            </Text>
          </Card>
        ) : error ? (
          <Card>
            <Text style={[styles.itemTime, { color: palette.muted }]}>
              Histori gagal dimuat: {error}
            </Text>
          </Card>
        ) : history.length === 0 ? (
          <Card>
            <Text style={[styles.itemTitle, { color: palette.text }]}>
              Belum ada histori
            </Text>
            <Text style={[styles.itemTime, { color: palette.muted }]}>
              Laporan yang diselesaikan akan masuk ke sini.
            </Text>
          </Card>
        ) : (
          history.map((item) => (
            <Card key={item.id} style={styles.itemCard}>
              <View style={styles.itemText}>
                <Text style={[styles.itemTitle, { color: palette.text }]}>
                  {item.title ?? emergencyTypeLabel(item.type)}
                </Text>
                <Text style={[styles.itemTime, { color: palette.muted }]}>
                  Laporan {formatRelativeTime(item.created_at)}
                </Text>
              </View>
              <StatusPill label={emergencyStatusLabel(item.status)} tone="success" />
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
  itemCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  itemText: {
    flex: 1,
  },
  itemTitle: {
    ...typography.bodyStrong,
    color: colors.text,
  },
  itemTime: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 3,
  },
});
