import { router, useLocalSearchParams } from "expo-router";
import type React from "react";
import { useRef, useState } from "react";
import { Alert, Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useEmergencyActions, useEmergencyReport } from "@/hooks/useEmergencyReports";
import {
  useReportDispatches,
  useUnitDispatchActions,
} from "@/hooks/useUnitDispatches";
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
import { UnitType } from "@/types";
import {
  Card,
  IconButton,
  InfoGrid,
  MiniMap,
  PrimaryAction,
  ScreenShell,
  StatusPill,
} from "@/components/app/MockAppUI";

type BusyAction = "chat" | "dispatch" | "finish" | "call";

const dispatchUnitOptions: {
  type: UnitType;
  title: string;
  caption: string;
  icon: React.ComponentProps<typeof MaterialCommunityIcons>["name"];
  color: string;
}[] = [
  {
    type: "ambulance",
    title: "Ambulans",
    caption: "Petugas medis lapangan",
    icon: "ambulance",
    color: colors.ambulance,
  },
  {
    type: "police",
    title: "Polisi",
    caption: "Petugas keamanan",
    icon: "police-badge-outline",
    color: colors.police,
  },
  {
    type: "firefighter",
    title: "Pemadam",
    caption: "Petugas kebakaran",
    icon: "fire-truck",
    color: colors.firefighter,
  },
];

export default function OperatorReportDetail() {
  const { palette } = useAppTheme();
  const { showNotification } = useAppNotification();
  const params = useLocalSearchParams<{ reportId?: string }>();
  const { report, loading, error } = useEmergencyReport(params.reportId);
  const {
    dispatches,
    latestActiveDispatch,
    loading: dispatchLoading,
    error: dispatchError,
    reload: reloadDispatches,
  } = useReportDispatches(params.reportId);
  const { acceptReport, finishReport } = useEmergencyActions();
  const { dispatchUnit } = useUnitDispatchActions();
  const { inviteCall } = useCallInvitationActions();
  const [busyAction, setBusyAction] = useState<BusyAction | null>(null);
  const [dispatchPickerOpen, setDispatchPickerOpen] = useState(false);
  const busyActionRef = useRef<BusyAction | null>(null);

  const beginAction = (action: BusyAction) => {
    if (busyActionRef.current) return false;

    busyActionRef.current = action;
    setBusyAction(action);
    return true;
  };

  const endAction = (action: BusyAction) => {
    if (busyActionRef.current !== action) return;

    busyActionRef.current = null;
    setBusyAction(null);
  };

  const handleFinish = async () => {
    if (!report?.id) return;
    if (!beginAction("finish")) return;

    try {
      await finishReport(report.id);
      router.replace("/operator/history");
    } catch (finishError) {
      Alert.alert(
        "Gagal menyelesaikan laporan",
        finishError instanceof Error ? finishError.message : "Terjadi kesalahan.",
      );
      endAction("finish");
    }
  };

  const handleOpenChat = async () => {
    if (!report?.id) return;
    if (!beginAction("chat")) return;

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
      endAction("chat");
    }
  };

  const handleOpenCall = async () => {
    if (!report?.id) return;
    if (!beginAction("call")) return;

    try {
      await acceptReport(report.id);
      await inviteCall(report.id, report.call_room ?? `sigapid-${report.id}`);
      showNotification({
        title: "Panggilan dikirim",
        message: "Menunggu pihak lain menerima panggilan.",
        tone: "info",
      });
      router.push({
        pathname: "/operator/call",
        params: { reportId: report.id },
      });
    } catch (callError) {
      Alert.alert(
        "Gagal membuka panggilan",
        callError instanceof Error ? callError.message : "Terjadi kesalahan.",
      );
      endAction("call");
    }
  };

  const sendHelp = async (unitType: UnitType) => {
    if (!report?.id) return;
    if (!beginAction("dispatch")) return;

    try {
      setDispatchPickerOpen(false);
      await acceptReport(report.id);
      await dispatchUnit(report.id, unitType);
      await reloadDispatches({ silent: true });
      showNotification({
        title: "Bantuan dikirim",
        message: `Petugas ${unitTypeLabel(unitType)} yang online sudah menerima tugas.`,
        tone: "success",
      });
    } catch (dispatchError) {
      showNotification({
        title: "Gagal mengirim bantuan",
        message: dispatchError instanceof Error ? dispatchError.message : "Terjadi kesalahan.",
        tone: "danger",
      });
    } finally {
      endAction("dispatch");
    }
  };

  const handleDispatchHelp = () => {
    if (busyActionRef.current) return;

    setDispatchPickerOpen(true);
  };

  if (loading) {
    return (
      <ScreenShell
        role="operator"
        title="Memuat Detail"
        subtitle="Mengambil detail laporan dari backend."
      >
        <Card>
          <Text style={[styles.reporterMeta, { color: palette.muted }]}>
            Sebentar, data sedang dimuat.
          </Text>
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
    <>
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
          operatorLatitude={latestActiveDispatch?.current_latitude}
          operatorLongitude={latestActiveDispatch?.current_longitude}
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
            <Text style={[styles.reporterName, { color: palette.text }]}>
              {report.reporter?.full_name ?? "Pelapor"}
            </Text>
            <Text style={[styles.reporterMeta, { color: palette.muted }]}>
              {report.reporter?.phone || report.reporter?.email || "Kontak belum tersedia"}
            </Text>
          </View>
          <StatusPill label={emergencyTypeLabel(report.type)} tone="danger" />
        </View>
        <View style={styles.tags}>
          <View
            style={[
              styles.tag,
              { backgroundColor: palette.cardSoft, borderColor: palette.border },
            ]}
          >
            <Text style={[styles.tagText, { color: palette.text }]}>
              {report.call_room ?? "Call room belum ada"}
            </Text>
          </View>
          <View
            style={[
              styles.tag,
              { backgroundColor: palette.cardSoft, borderColor: palette.border },
            ]}
          >
            <Text style={[styles.tagText, { color: palette.text }]}>
              {report.sensor_detected ? "Sensor aktif" : "Manual"}
            </Text>
          </View>
          <View
            style={[
              styles.tag,
              { backgroundColor: palette.cardSoft, borderColor: palette.border },
            ]}
          >
            <Text style={[styles.tagText, { color: palette.text }]}>
              {report.description ?? report.title ?? "Tanpa catatan"}
            </Text>
          </View>
        </View>
      </Card>

      <Card style={styles.dispatchCard}>
        <View style={styles.reporterHeader}>
          <View style={styles.reporterText}>
            <Text style={[styles.reporterName, { color: palette.text }]}>
              Unit Lapangan
            </Text>
            <Text style={[styles.reporterMeta, { color: palette.muted }]}>
              Kirim bantuan ke petugas yang online sesuai kebutuhan laporan.
            </Text>
          </View>
          <PrimaryAction
            label={busyAction === "dispatch" ? "Mengirim" : "Kirim"}
            icon="send-outline"
            tone="secondary"
            style={styles.dispatchButton}
            disabled={!!busyAction}
            onPress={handleDispatchHelp}
          />
        </View>

        {dispatchLoading ? (
          <Text style={[styles.reporterMeta, { color: palette.muted }]}>
            Memuat dispatch...
          </Text>
        ) : dispatchError ? (
          <Text style={[styles.reporterMeta, { color: colors.danger }]}>
            {dispatchError}
          </Text>
        ) : dispatches.length === 0 ? (
          <Text style={[styles.reporterMeta, { color: palette.muted }]}>
            Belum ada unit yang dikirim.
          </Text>
        ) : (
          <View style={styles.dispatchList}>
            {dispatches.map((dispatch) => (
              <View
                key={dispatch.id}
                style={[
                  styles.dispatchItem,
                  { backgroundColor: palette.cardSoft, borderColor: palette.border },
                ]}
              >
                <View style={styles.dispatchText}>
                  <Text style={[styles.dispatchTitle, { color: palette.text }]}>
                    {unitTypeLabel(dispatch.unit_type)}
                  </Text>
                  <Text style={[styles.reporterMeta, { color: palette.muted }]}>
                    {dispatch.unit_operator?.full_name ?? "Petugas"} -{" "}
                    {dispatch.last_location_at
                      ? `lokasi ${formatRelativeTime(dispatch.last_location_at)}`
                      : "menunggu lokasi"}
                  </Text>
                </View>
                <StatusPill
                  label={unitDispatchStatusLabel(dispatch.status)}
                  tone={dispatch.status === "cancelled" ? "danger" : "info"}
                />
              </View>
            ))}
          </View>
        )}
      </Card>

      <View style={styles.quickActions}>
        <PrimaryAction
          label={busyAction === "call" ? "Memanggil..." : "Call"}
          icon="phone"
          tone="soft"
          style={styles.quickButton}
          disabled={!!busyAction}
          onPress={handleOpenCall}
        />
        <PrimaryAction
          label={busyAction === "chat" ? "Membuka..." : "Message"}
          icon="message-outline"
          tone="soft"
          style={styles.quickButton}
          disabled={!!busyAction}
          onPress={handleOpenChat}
        />
        <PrimaryAction
          label={busyAction === "finish" ? "Menyimpan..." : "Selesai"}
          icon="check-circle-outline"
          tone="secondary"
          style={styles.quickButton}
          disabled={!!busyAction}
          onPress={handleFinish}
        />
      </View>
      </ScreenShell>

      <Modal
        animationType="fade"
        transparent
        visible={dispatchPickerOpen}
        onRequestClose={() => setDispatchPickerOpen(false)}
      >
        <View style={styles.modalBackdrop}>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={() => setDispatchPickerOpen(false)}
          />
          <View
            style={[
              styles.unitSheet,
              { backgroundColor: palette.card, borderColor: palette.border },
            ]}
          >
            <Text style={[styles.sheetTitle, { color: palette.text }]}>
              Kirim Bantuan
            </Text>
            <Text style={[styles.sheetCaption, { color: palette.muted }]}>
              Pilih unit lapangan yang sedang dibutuhkan untuk laporan ini.
            </Text>

            <View style={styles.unitOptions}>
              {dispatchUnitOptions.map((option) => (
                <Pressable
                  key={option.type}
                  disabled={!!busyAction}
                  onPress={() => sendHelp(option.type)}
                  style={({ pressed }) => [
                    styles.unitOption,
                    { backgroundColor: palette.cardSoft, borderColor: palette.border },
                    pressed && !busyAction && styles.pressed,
                    busyAction && styles.disabledOption,
                  ]}
                >
                  <View
                    style={[
                      styles.unitIcon,
                      { backgroundColor: `${option.color}1F` },
                    ]}
                  >
                    <MaterialCommunityIcons
                      name={option.icon}
                      size={24}
                      color={option.color}
                    />
                  </View>
                  <View style={styles.unitText}>
                    <Text style={[styles.unitTitle, { color: palette.text }]}>
                      {option.title}
                    </Text>
                    <Text style={[styles.unitCaption, { color: palette.muted }]}>
                      {option.caption}
                    </Text>
                  </View>
                  <MaterialCommunityIcons
                    name="send-outline"
                    size={20}
                    color={palette.secondary}
                  />
                </Pressable>
              ))}
            </View>

            <PrimaryAction
              label="Batal"
              tone="soft"
              disabled={!!busyAction}
              onPress={() => setDispatchPickerOpen(false)}
            />
          </View>
        </View>
      </Modal>
    </>
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
  dispatchCard: {
    gap: spacing.md,
  },
  dispatchButton: {
    minHeight: 42,
    paddingHorizontal: spacing.md,
  },
  dispatchList: {
    gap: spacing.sm,
  },
  dispatchItem: {
    minHeight: 58,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    borderWidth: 1,
    borderRadius: 14,
    padding: spacing.md,
  },
  dispatchText: {
    flex: 1,
  },
  dispatchTitle: {
    ...typography.bodyStrong,
    color: colors.text,
  },
  pressed: {
    opacity: 0.82,
    transform: [{ scale: 0.98 }],
  },
  disabledOption: {
    opacity: 0.55,
  },
  modalBackdrop: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(15, 23, 42, 0.42)",
  },
  unitSheet: {
    gap: spacing.md,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    padding: spacing.lg,
    paddingBottom: spacing.xl,
  },
  sheetTitle: {
    ...typography.h3,
  },
  sheetCaption: {
    ...typography.caption,
    lineHeight: 18,
  },
  unitOptions: {
    gap: spacing.sm,
  },
  unitOption: {
    minHeight: 78,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    borderWidth: 1,
    borderRadius: 16,
    padding: spacing.md,
  },
  unitIcon: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: "center",
    justifyContent: "center",
  },
  unitText: {
    flex: 1,
  },
  unitTitle: {
    ...typography.bodyStrong,
  },
  unitCaption: {
    ...typography.caption,
    marginTop: 2,
  },
});
