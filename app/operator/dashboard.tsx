import { router } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { Alert, StyleSheet, Text, View } from "react-native";
import { useEmergencyActions, useOperatorReports } from "@/hooks/useEmergencyReports";
import { useAuth } from "@/hooks/useAuth";
import {
  useUnitOperatorDispatches,
  useUnitDispatchActions,
} from "@/hooks/useUnitDispatches";
import { useCallInvitationActions } from "@/hooks/useCallInvitations";
import { useOperatorReportNotifications } from "@/hooks/useOperatorReportNotifications";
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
import { UnitDispatch, UnitDispatchStatus } from "@/types";
import {
  Card,
  IconButton,
  InfoGrid,
  MiniMap,
  PrimaryAction,
  ScreenShell,
  StatusPill,
} from "@/components/app/MockAppUI";

const locationHeartbeatMs = 30_000;

function nextStatus(dispatch: UnitDispatch): UnitDispatchStatus | null {
  if (dispatch.status === "sent") return "accepted";
  if (dispatch.status === "accepted") return "on_route";
  if (dispatch.status === "on_route") return "arrived";
  if (dispatch.status === "arrived") return "completed";
  return null;
}

function nextStatusLabel(status: UnitDispatchStatus) {
  if (status === "sent") return "Terima";
  if (status === "accepted") return "Berangkat";
  if (status === "on_route") return "Tiba";
  if (status === "arrived") return "Selesai";
  return "Update";
}

function nextStatusDoneMessage(status: UnitDispatchStatus) {
  if (status === "accepted") return "Tugas diterima. Lokasi dikirim otomatis.";
  if (status === "on_route") return "Status berangkat tersimpan. Lokasi tetap diperbarui otomatis.";
  if (status === "arrived") return "Status tiba tersimpan.";
  if (status === "completed") return "Tugas selesai dan masuk histori.";
  return "Status tugas berhasil diperbarui.";
}

function dispatchTone(status: UnitDispatchStatus) {
  if (status === "sent") return "warning" as const;
  if (status === "completed") return "success" as const;
  if (status === "cancelled") return "danger" as const;
  return "info" as const;
}

export default function OperatorDashboard() {
  const { profile } = useAuth();

  if (profile?.unit_type) {
    return <UnitOperatorDashboard />;
  }

  return <CentralOperatorDashboard />;
}

function CentralOperatorDashboard() {
  const { palette } = useAppTheme();
  const { showNotification } = useAppNotification();
  const { activeReports, loading, error, reload } = useOperatorReports();
  const { acceptReport } = useEmergencyActions();
  const { inviteCall } = useCallInvitationActions();
  const [busyReportId, setBusyReportId] = useState<string | null>(null);
  const busyReportIdRef = useRef<string | null>(null);

  useOperatorReportNotifications(() => reload({ silent: true }));

  const beginReportAction = (reportId: string) => {
    if (busyReportIdRef.current) return false;

    busyReportIdRef.current = reportId;
    setBusyReportId(reportId);
    return true;
  };

  const endReportAction = (reportId: string) => {
    if (busyReportIdRef.current !== reportId) return;

    busyReportIdRef.current = null;
    setBusyReportId(null);
  };

  const handleAccept = async (reportId: string) => {
    if (!beginReportAction(reportId)) return;

    try {
      await acceptReport(reportId);
      router.push({ pathname: "/operator/chat", params: { reportId } });
    } catch (acceptError) {
      Alert.alert(
        "Gagal menerima laporan",
        acceptError instanceof Error ? acceptError.message : "Terjadi kesalahan.",
      );
      endReportAction(reportId);
    }
  };

  const handleOpenDetail = async (reportId: string, pending: boolean) => {
    if (!beginReportAction(reportId)) return;

    try {
      if (pending) {
        await acceptReport(reportId);
      }

      router.push({
        pathname: "/operator/report-detail",
        params: { reportId },
      });
    } catch (acceptError) {
      Alert.alert(
        "Gagal membuka detail",
        acceptError instanceof Error ? acceptError.message : "Terjadi kesalahan.",
      );
      endReportAction(reportId);
    }
  };

  const handleOpenCall = async (
    reportId: string,
    pending: boolean,
    roomName?: string | null,
  ) => {
    if (!beginReportAction(reportId)) return;

    try {
      if (pending) {
        await acceptReport(reportId);
      }

      await inviteCall(reportId, roomName ?? `sigapid-${reportId}`);
      showNotification({
        title: "Panggilan dikirim",
        message: "Menunggu pihak lain menerima panggilan.",
        tone: "info",
      });
      router.push({
        pathname: "/operator/call",
        params: { reportId },
      });
    } catch (acceptError) {
      Alert.alert(
        "Gagal membuka panggilan",
        acceptError instanceof Error ? acceptError.message : "Terjadi kesalahan.",
      );
      endReportAction(reportId);
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
            <Text style={[styles.reportMeta, { color: palette.muted }]}>
              Memuat laporan masuk...
            </Text>
          </Card>
        ) : error ? (
          <Card>
            <Text style={[styles.reportMeta, { color: palette.muted }]}>
              Data laporan gagal dimuat: {error}
            </Text>
          </Card>
        ) : activeReports.length === 0 ? (
          <Card>
            <Text style={[styles.reportTitle, { color: palette.text }]}>
              Belum ada laporan aktif
            </Text>
            <Text style={[styles.reportMeta, { color: palette.muted }]}>
              Laporan baru akan muncul otomatis saat pelapor mengirim darurat.
            </Text>
          </Card>
        ) : (
          activeReports.map((report) => (
          <Card key={report.id} style={styles.reportCard}>
            <View style={styles.reportHeader}>
              <View style={styles.reportText}>
                <Text style={[styles.reportTitle, { color: palette.text }]}>
                  {report.title ?? emergencyTypeLabel(report.type)}
                </Text>
                <Text style={[styles.reportMeta, { color: palette.muted }]}>
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
                disabled={!!busyReportId}
                onPress={() =>
                  handleOpenCall(
                    report.id,
                    report.status === "pending",
                    report.call_room,
                  )
                }
              />
              <PrimaryAction
                label={busyReportId === report.id ? "Membuka..." : "Chat"}
                icon="message-outline"
                tone="soft"
                style={styles.action}
                disabled={!!busyReportId}
                onPress={() => handleAccept(report.id)}
              />
              <PrimaryAction
                label={busyReportId === report.id ? "Membuka..." : "Detail"}
                icon={report.status === "pending" ? "check-circle-outline" : "file-search-outline"}
                tone="secondary"
                style={styles.action}
                disabled={!!busyReportId}
                onPress={() => handleOpenDetail(report.id, report.status === "pending")}
              />
            </View>
          </Card>
        ))
        )}
      </View>
    </ScreenShell>
  );
}

function UnitOperatorDashboard() {
  const { profile } = useAuth();
  const { palette } = useAppTheme();
  const { showNotification } = useAppNotification();
  const { inviteCall } = useCallInvitationActions();
  const { activeDispatches, loading, error, reload } = useUnitOperatorDispatches();
  const { updateDispatchStatus, updateDispatchLocation } = useUnitDispatchActions();
  const [busyDispatchId, setBusyDispatchId] = useState<string | null>(null);
  const busyDispatchIdRef = useRef<string | null>(null);
  const movingDispatch = activeDispatches.find((dispatch) =>
    ["sent", "accepted", "on_route", "arrived"].includes(dispatch.status),
  );

  const beginDispatchAction = (dispatchId: string) => {
    if (busyDispatchIdRef.current) return false;

    busyDispatchIdRef.current = dispatchId;
    setBusyDispatchId(dispatchId);
    return true;
  };

  const endDispatchAction = (dispatchId: string) => {
    if (busyDispatchIdRef.current !== dispatchId) return;

    busyDispatchIdRef.current = null;
    setBusyDispatchId(null);
  };

  useEffect(() => {
    if (!movingDispatch?.id) return;

    updateDispatchLocation(movingDispatch.id).catch(() => undefined);
    const interval = setInterval(() => {
      updateDispatchLocation(movingDispatch.id).catch(() => undefined);
    }, locationHeartbeatMs);

    return () => clearInterval(interval);
  }, [movingDispatch?.id, updateDispatchLocation]);

  const handleStatusUpdate = async (dispatch: UnitDispatch) => {
    const status = nextStatus(dispatch);
    if (!status) return;
    if (!beginDispatchAction(dispatch.id)) return;

    try {
      await updateDispatchStatus(dispatch.id, status);
      await reload({ silent: true });
      showNotification({
        title: "Status diperbarui",
        message: nextStatusDoneMessage(status),
        tone: "success",
        durationMs: 2200,
      });

      if (status !== "completed") {
        updateDispatchLocation(dispatch.id)
          .then(() => reload({ silent: true }))
          .catch(() => undefined);
      }
    } catch (statusError) {
      Alert.alert(
        "Gagal update tugas",
        statusError instanceof Error ? statusError.message : "Terjadi kesalahan.",
      );
    } finally {
      endDispatchAction(dispatch.id);
    }
  };

  const handleLocationUpdate = async (dispatchId: string) => {
    if (!beginDispatchAction(dispatchId)) return;

    try {
      await updateDispatchLocation(dispatchId);
      await reload({ silent: true });
      showNotification({
        title: "Lokasi diperbarui",
        message: "Lokasi unit sudah dikirim ke operator pusat.",
        tone: "success",
      });
    } catch (locationError) {
      Alert.alert(
        "Gagal update lokasi",
        locationError instanceof Error ? locationError.message : "Terjadi kesalahan.",
      );
    } finally {
      endDispatchAction(dispatchId);
    }
  };

  return (
    <ScreenShell
      role="operator"
      activeTab="home"
      title={`Tugas ${unitTypeLabel(profile?.unit_type)}`}
      subtitle="Tugas muncul setelah operator pusat mengirim unit ke laporan."
      action={<IconButton icon="bell-outline" tone="secondary" />}
    >
      <View style={styles.list}>
        {loading ? (
          <Card>
            <Text style={[styles.reportMeta, { color: palette.muted }]}>
              Memuat tugas unit...
            </Text>
          </Card>
        ) : error ? (
          <Card>
            <Text style={[styles.reportMeta, { color: palette.muted }]}>
              Tugas gagal dimuat: {error}
            </Text>
          </Card>
        ) : activeDispatches.length === 0 ? (
          <Card>
            <Text style={[styles.reportTitle, { color: palette.text }]}>
              Belum ada tugas masuk
            </Text>
            <Text style={[styles.reportMeta, { color: palette.muted }]}>
              Akun unit tidak mengambil laporan langsung. Tunggu operator pusat menekan kirim unit.
            </Text>
          </Card>
        ) : (
          activeDispatches.map((dispatch) => (
            <Card key={dispatch.id} style={styles.reportCard}>
              <View style={styles.reportHeader}>
                <View style={styles.reportText}>
                  <Text style={[styles.reportTitle, { color: palette.text }]}>
                    {dispatch.report?.title ??
                      emergencyTypeLabel(dispatch.report?.type ?? "sos")}
                  </Text>
                  <Text style={[styles.reportMeta, { color: palette.muted }]}>
                    Pelapor: {dispatch.report?.reporter?.full_name ?? "Pelapor"} -{" "}
                    {formatRelativeTime(dispatch.assigned_at)}
                  </Text>
                </View>
                <StatusPill
                  label={unitDispatchStatusLabel(dispatch.status)}
                  tone={dispatchTone(dispatch.status)}
                />
              </View>

              <MiniMap
                height={150}
                latitude={dispatch.report?.latitude}
                longitude={dispatch.report?.longitude}
                operatorLatitude={dispatch.current_latitude}
                operatorLongitude={dispatch.current_longitude}
              />

              <InfoGrid
                items={[
                  {
                    label: "Jenis",
                    value: dispatch.report?.type
                      ? emergencyTypeLabel(dispatch.report.type)
                      : unitTypeLabel(dispatch.unit_type),
                  },
                  {
                    label: "Alamat",
                    value: dispatch.report?.address ?? "Alamat belum tersedia",
                  },
                  {
                    label: "Koordinat",
                    value:
                      typeof dispatch.report?.latitude === "number" &&
                      typeof dispatch.report?.longitude === "number"
                        ? `${dispatch.report.latitude.toFixed(4)}, ${dispatch.report.longitude.toFixed(4)}`
                        : "Belum ada",
                  },
                  {
                    label: "Lokasi Unit",
                    value: dispatch.last_location_at
                      ? formatRelativeTime(dispatch.last_location_at)
                      : "Belum dikirim",
                  },
                ]}
              />

              <View style={styles.actions}>
                <PrimaryAction
                  label="Call"
                  icon="phone"
                  tone="soft"
                  style={styles.action}
                disabled={!!busyDispatchId}
                  onPress={async () => {
                    if (!dispatch.report?.id) return;

                    try {
                      await inviteCall(
                        dispatch.report.id,
                        dispatch.report.call_room ?? `sigapid-${dispatch.report.id}`,
                      );
                      showNotification({
                        title: "Panggilan dikirim",
                        message: "Menunggu pihak lain menerima panggilan.",
                        tone: "info",
                      });
                    } catch (callError) {
                      Alert.alert(
                        "Gagal memulai panggilan",
                        callError instanceof Error
                          ? callError.message
                          : "Terjadi kesalahan.",
                      );
                      return;
                    }

                    router.push({
                      pathname: "/operator/call",
                      params: { reportId: dispatch.report.id },
                    });
                  }}
                />
                <PrimaryAction
                  label={busyDispatchId === dispatch.id ? "Mengirim..." : "Lokasi"}
                  icon="crosshairs-gps"
                  tone="soft"
                  style={styles.action}
                  disabled={!!busyDispatchId}
                  onPress={() => handleLocationUpdate(dispatch.id)}
                />
                <PrimaryAction
                  label={
                    busyDispatchId === dispatch.id
                      ? "Menyimpan..."
                      : nextStatusLabel(dispatch.status)
                  }
                  icon="check-circle-outline"
                  tone={dispatch.status === "arrived" ? "danger" : "secondary"}
                  style={styles.action}
                  disabled={!!busyDispatchId}
                  onPress={() => handleStatusUpdate(dispatch)}
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
