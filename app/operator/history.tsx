import { StyleSheet, Text, View } from "react-native";
import { useOperatorReports } from "@/hooks/useEmergencyReports";
import { useAuth } from "@/hooks/useAuth";
import { useUnitOperatorDispatches } from "@/hooks/useUnitDispatches";
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
  ScreenShell,
  StatusPill,
} from "@/components/app/MockAppUI";

export default function OperatorHistory() {
  const { profile } = useAuth();

  if (profile?.unit_type) {
    return <UnitOperatorHistory />;
  }

  return <CentralOperatorHistory />;
}

function CentralOperatorHistory() {
  const { palette } = useAppTheme();
  const { history, loading, error } = useOperatorReports();

  return (
    <ScreenShell
      role="operator"
      activeTab="history"
      title="Laporan Selesai"
      subtitle="15 riwayat terbaru yang sudah diselesaikan operator."
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
              Laporan yang diselesaikan operator akan muncul di sini.
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

function UnitOperatorHistory() {
  const { palette } = useAppTheme();
  const { history, loading, error } = useUnitOperatorDispatches();

  return (
    <ScreenShell
      role="operator"
      activeTab="history"
      title="Riwayat Tugas"
      subtitle="15 tugas terbaru yang sudah selesai atau dibatalkan."
      action={<IconButton icon="clock-outline" tone="secondary" disabled />}
    >
      <View style={styles.list}>
        {loading ? (
          <Card>
            <Text style={[styles.itemTime, { color: palette.muted }]}>
              Memuat histori tugas...
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
              Tugas unit yang selesai akan muncul di sini.
            </Text>
          </Card>
        ) : (
          history.map((dispatch) => (
            <Card key={dispatch.id} style={styles.itemCard}>
              <View style={styles.itemText}>
                <Text style={[styles.itemTitle, { color: palette.text }]}>
                  {dispatch.report?.title ??
                    (dispatch.report?.type
                      ? emergencyTypeLabel(dispatch.report.type)
                      : unitTypeLabel(dispatch.unit_type))}
                </Text>
                <Text style={[styles.itemTime, { color: palette.muted }]}>
                  Tugas {formatRelativeTime(dispatch.assigned_at)}
                </Text>
              </View>
              <StatusPill
                label={unitDispatchStatusLabel(dispatch.status)}
                tone={dispatch.status === "cancelled" ? "danger" : "success"}
              />
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
