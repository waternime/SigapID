import { StyleSheet, Text, View } from "react-native";
import { useOperatorReports } from "@/hooks/useEmergencyReports";
import { emergencyStatusLabel, emergencyTypeLabel, formatRelativeTime } from "@/utils/format";
import { colors, spacing, typography } from "@/theme";
import {
  Card,
  IconButton,
  ScreenShell,
  StatusPill,
} from "@/components/app/MockAppUI";

export default function OperatorHistory() {
  const { history, loading, error } = useOperatorReports();

  return (
    <ScreenShell
      role="operator"
      activeTab="history"
      title="Laporan Selesai"
      subtitle="15 riwayat terbaru yang sudah diselesaikan operator."
      action={<IconButton icon="bell-outline" tone="secondary" />}
    >
      <View style={styles.list}>
        {loading ? (
          <Card>
            <Text style={styles.itemTime}>Memuat histori...</Text>
          </Card>
        ) : error ? (
          <Card>
            <Text style={styles.itemTime}>Histori gagal dimuat: {error}</Text>
          </Card>
        ) : history.length === 0 ? (
          <Card>
            <Text style={styles.itemTitle}>Belum ada histori</Text>
            <Text style={styles.itemTime}>
              Laporan yang diselesaikan operator akan muncul di sini.
            </Text>
          </Card>
        ) : (
          history.map((item) => (
            <Card key={item.id} style={styles.itemCard}>
              <View style={styles.itemText}>
                <Text style={styles.itemTitle}>
                  {item.title ?? emergencyTypeLabel(item.type)}
                </Text>
                <Text style={styles.itemTime}>
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
