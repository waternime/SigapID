import { Href, router } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useRef, useState } from "react";
import { Alert, Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { useAuth } from "@/hooks/useAuth";
import {
  useFamilyActiveReports,
  useFamilyMembers,
} from "@/hooks/useFamilyMembers";
import { useEmergencyActions } from "@/hooks/useEmergencyReports";
import { useAppNotification } from "@/components/app/AppNotification";
import { useAppTheme } from "@/hooks/useAppTheme";
import { emergencyTypeLabel } from "@/utils/format";
import { EmergencyType, FamilyMemberWithProfile } from "@/types";
import { colors, radius, spacing, typography } from "@/theme";
import {
  Avatar,
  Card,
  IconButton,
  PrimaryAction,
  ScreenShell,
  StatusPill,
  navigateTo,
} from "@/components/app/MockAppUI";

const emergencyTypes = [
  {
    title: "Kebakaran",
    type: "fire",
    description: "Api, asap tebal, ledakan, atau kebocoran gas.",
    icon: "fire",
    color: colors.firefighter,
    background: "#FFF7ED",
  },
  {
    title: "Medis",
    type: "medical",
    description: "Pingsan, luka berat, sesak napas, atau darurat kesehatan.",
    icon: "medical-bag",
    color: colors.success,
    background: "#ECFDF5",
  },
  {
    title: "Kriminal",
    type: "crime",
    description: "Ancaman, perampokan, kekerasan, atau tindakan mencurigakan.",
    icon: "shield-alert-outline",
    color: "#BE185D",
    background: "#FDF2F8",
  },
  {
    title: "Bencana",
    type: "disaster",
    description: "Gempa, banjir, longsor, atau kondisi alam ekstrem.",
    icon: "weather-lightning",
    color: colors.warning,
    background: "#FFFBEB",
  },
] as const;

export default function ReporterDashboard() {
  const { profile } = useAuth();
  const { palette, mode } = useAppTheme();
  const { showNotification } = useAppNotification();
  const { members, loading: familyLoading, error: familyError } = useFamilyMembers();
  const {
    reports: familyActiveReports,
    reportsByProfileId,
    loading: familyReportsLoading,
    error: familyReportsError,
  } = useFamilyActiveReports(members, profile?.id);
  const { createReport } = useEmergencyActions();
  const [categoryPickerOpen, setCategoryPickerOpen] = useState(false);
  const [reportSubmitting, setReportSubmitting] = useState(false);
  const reportSubmittingRef = useRef(false);
  const name = profile?.full_name ?? "User";
  const visibleMembers = members.slice(0, 2);
  const pendingIncomingCount = members.filter(
    (member) => member.member_id === profile?.id && member.status === "pending",
  ).length;
  const familyStatusCaption = familyLoading
    ? "Memuat anggota keluarga..."
    : familyReportsLoading
      ? "Mengecek status darurat keluarga..."
      : familyActiveReports.length > 0
        ? `${familyActiveReports.length} keluarga darurat`
        : pendingIncomingCount > 0
          ? `${pendingIncomingCount} permintaan masuk`
          : `${members.length} anggota dipantau`;

  const handleCreateReport = async (
    type: EmergencyType,
    title = "Laporan Darurat",
    description?: string,
  ) => {
    if (reportSubmittingRef.current) return;

    reportSubmittingRef.current = true;
    setReportSubmitting(true);
    setCategoryPickerOpen(false);

    try {
      const report = await createReport({
        type,
        title,
        description,
        priority: type === "sos" ? "critical" : "high",
      });

      showNotification({
        title: "Laporan terkirim",
        message: `${emergencyTypeLabel(type)} sudah masuk ke operator terdekat.`,
        tone: "success",
      });

      router.push({
        pathname: "/reporter/tracking",
        params: { reportId: report.id },
      });
    } catch (error) {
      reportSubmittingRef.current = false;
      setReportSubmitting(false);
      Alert.alert(
        "Gagal membuat laporan",
        error instanceof Error ? error.message : "Terjadi kesalahan.",
      );
    }
  };

  return (
    <ScreenShell
      role="reporter"
      activeTab="home"
      title={`Hi, ${firstName(name)}`}
      subtitle="Pantau keluarga dan kirim laporan darurat dari satu tempat."
      action={<Avatar name={name} imageUri={profile?.avatar_url} />}
    >
      <Card style={styles.familyCard}>
        <View style={styles.sectionHeader}>
          <View style={styles.sectionHeaderText}>
            <Text style={[styles.sectionTitle, { color: palette.text }]}>
              Monitoring Keluarga
            </Text>
            <Text style={[styles.sectionCaption, { color: palette.muted }]}>
              {familyStatusCaption}
            </Text>
          </View>
          <View style={styles.headerActions}>
            <Pressable
              onPress={() => navigateTo("/reporter/family-detail" as Href)}
              style={[
                styles.smallButton,
                { backgroundColor: palette.cardSoft, borderColor: palette.border },
              ]}
            >
              <Text
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.76}
                style={[styles.smallButtonText, { color: palette.secondary }]}
              >
                Detail
              </Text>
            </Pressable>
            <Pressable
              onPress={() => navigateTo("/reporter/add-family" as Href)}
              style={[
                styles.smallButton,
                { backgroundColor: palette.cardSoft, borderColor: palette.border },
              ]}
            >
              <Text
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.76}
                style={[styles.smallButtonText, { color: palette.secondary }]}
              >
                Tambah
              </Text>
            </Pressable>
          </View>
        </View>

        {familyError ? (
          <Text style={[styles.emptyText, { color: palette.muted }]}>
            Data keluarga belum bisa dimuat: {familyError}
          </Text>
        ) : familyReportsError ? (
          <Text style={[styles.emptyText, { color: palette.muted }]}>
            Status darurat keluarga belum bisa dimuat: {familyReportsError}
          </Text>
        ) : visibleMembers.length > 0 ? (
          <View style={styles.familyGrid}>
            {visibleMembers.map((member) => {
              const displayProfile = getDisplayProfile(member, profile?.id);
              const activeFamilyReport = displayProfile?.id
                ? reportsByProfileId.get(displayProfile.id)
                : null;
              const needsResponse =
                member.member_id === profile?.id && member.status === "pending";
              const statusLabel = activeFamilyReport
                ? `${emergencyTypeLabel(activeFamilyReport.type)} darurat`
                : needsResponse
                  ? "Perlu respon"
                  : member.status === "accepted"
                    ? "Aman"
                    : "Menunggu";
              const statusTone = activeFamilyReport
                ? "danger"
                : member.status === "accepted"
                  ? "success"
                  : needsResponse
                    ? "danger"
                    : "warning";

              return (
                <Pressable
                  key={member.id}
                  onPress={() => {
                    if (!activeFamilyReport?.id) return;

                    router.push({
                      pathname: "/reporter/tracking",
                      params: { reportId: activeFamilyReport.id },
                    });
                  }}
                  style={({ pressed }) => [
                    styles.familyStatus,
                    {
                      backgroundColor: activeFamilyReport
                        ? mode === "dark"
                          ? palette.cardSoft
                          : "#FFF7F7"
                        : palette.cardSoft,
                      borderColor: activeFamilyReport ? "#FCA5A5" : palette.border,
                    },
                    pressed && activeFamilyReport && styles.pressed,
                  ]}
                >
                  <Text style={[styles.familyName, { color: palette.text }]}>
                    {displayProfile?.full_name ?? "Anggota keluarga"}
                  </Text>
                  <StatusPill label={statusLabel} tone={statusTone} />
                </Pressable>
              );
            })}
          </View>
        ) : (
          <View
            style={[
              styles.emptyFamily,
              { backgroundColor: palette.cardSoft, borderColor: palette.border },
            ]}
          >
            <MaterialCommunityIcons
              name="account-plus-outline"
              size={26}
              color={colors.primary}
            />
            <Text style={[styles.emptyTitle, { color: palette.text }]}>
              Belum ada keluarga
            </Text>
            <Text style={[styles.emptyText, { color: palette.muted }]}>
              Tambahkan keluarga pakai ID akun supaya status mereka muncul di
              sini.
            </Text>
          </View>
        )}
      </Card>

      <Card style={styles.reportCard}>
        <View style={styles.sectionHeader}>
          <View style={styles.sectionHeaderText}>
            <Text style={[styles.sectionTitle, { color: palette.text }]}>
              Tombol Darurat
            </Text>
            <Text style={[styles.sectionCaption, { color: palette.muted }]}>
              Pilih jenis insiden untuk respons lebih cepat.
            </Text>
          </View>
          <IconButton
            icon="bell-alert-outline"
            tone="danger"
            disabled={reportSubmitting}
            onPress={() =>
              handleCreateReport(
                "sos",
                "SOS - Laporan Darurat",
                "Pelapor tidak sempat memilih kategori detail.",
              )
            }
          />
        </View>

        <PrimaryAction
          label="Lapor Keadaan Darurat"
          icon="alert-circle-outline"
          tone="danger"
          disabled={reportSubmitting}
          onPress={() => setCategoryPickerOpen(true)}
        />

        <View style={styles.emergencyGrid}>
          {emergencyTypes.map((item) => (
            <Pressable
              key={item.title}
              disabled={reportSubmitting}
              onPress={() =>
                handleCreateReport(
                  item.type,
                  `${item.title} - Laporan Darurat`,
                  item.description,
                )
              }
              style={({ pressed }) => [
                styles.emergencyTile,
                {
                  backgroundColor: mode === "dark" ? palette.cardSoft : item.background,
                  borderColor: `${item.color}55`,
                },
                pressed && !reportSubmitting && styles.pressed,
                reportSubmitting && styles.disabledTile,
              ]}
            >
              <MaterialCommunityIcons
                name={item.icon}
                size={25}
                color={item.color}
              />
              <Text style={[styles.emergencyTitle, { color: item.color }]}>
                {item.title}
              </Text>
              <Text style={[styles.emergencyText, { color: palette.muted }]}>
                {item.description}
              </Text>
            </Pressable>
          ))}
        </View>
      </Card>

      <Modal
        animationType="fade"
        transparent
        visible={categoryPickerOpen}
        onRequestClose={() => setCategoryPickerOpen(false)}
      >
        <View style={styles.modalBackdrop}>
          <View
            style={[
              styles.categorySheet,
              { backgroundColor: palette.card, borderColor: palette.border },
            ]}
          >
            <Text style={[styles.modalTitle, { color: palette.text }]}>
              Pilih kategori laporan
            </Text>
            <Text style={[styles.modalCaption, { color: palette.muted }]}>
              Operator akan dipilih otomatis sesuai laporan yang dikirim.
            </Text>

            <View style={styles.categoryList}>
              {emergencyTypes.map((item) => (
                <Pressable
                  key={item.title}
                  disabled={reportSubmitting}
                  onPress={() =>
                    handleCreateReport(
                      item.type,
                      `${item.title} - Laporan Darurat`,
                      item.description,
                    )
                  }
                  style={({ pressed }) => [
                    styles.categoryChoice,
                    {
                      backgroundColor: palette.cardSoft,
                      borderColor: `${item.color}55`,
                    },
                    pressed && !reportSubmitting && styles.pressed,
                    reportSubmitting && styles.disabledTile,
                  ]}
                >
                  <MaterialCommunityIcons
                    name={item.icon}
                    size={22}
                    color={item.color}
                  />
                  <View style={styles.categoryText}>
                    <Text style={[styles.categoryTitle, { color: palette.text }]}>
                      {item.title}
                    </Text>
                    <Text style={[styles.categoryCaption, { color: palette.muted }]}>
                      {item.description}
                    </Text>
                  </View>
                </Pressable>
              ))}
              <Pressable
                disabled={reportSubmitting}
                onPress={() =>
                  handleCreateReport(
                    "sos",
                    "SOS - Laporan Darurat",
                    "Pelapor tidak sempat memilih kategori detail.",
                  )
                }
                style={({ pressed }) => [
                  styles.categoryChoice,
                  {
                    backgroundColor: mode === "dark" ? palette.cardSoft : "#FFF7F7",
                    borderColor: "#FECACA",
                  },
                  pressed && !reportSubmitting && styles.pressed,
                  reportSubmitting && styles.disabledTile,
                ]}
              >
                <MaterialCommunityIcons
                  name="bell-alert-outline"
                  size={22}
                  color={colors.danger}
                />
                <View style={styles.categoryText}>
                  <Text style={[styles.categoryTitle, { color: palette.text }]}>
                    SOS
                  </Text>
                  <Text style={[styles.categoryCaption, { color: palette.muted }]}>
                    Darurat cepat saat kategori belum sempat dijelaskan.
                  </Text>
                </View>
              </Pressable>

            </View>

            <PrimaryAction
              label="Batal"
              tone="soft"
              disabled={reportSubmitting}
              onPress={() => setCategoryPickerOpen(false)}
            />
          </View>
        </View>
      </Modal>
    </ScreenShell>
  );
}

function firstName(name: string) {
  return name.trim().split(" ")[0] || "User";
}

function getDisplayProfile(member: FamilyMemberWithProfile, currentUserId?: string) {
  return member.owner_id === currentUserId ? member.member : member.owner;
}

const styles = StyleSheet.create({
  familyCard: {
    gap: spacing.md,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.sm,
  },
  sectionHeaderText: {
    flex: 1,
    minWidth: 0,
  },
  sectionTitle: {
    ...typography.bodyStrong,
    color: colors.text,
  },
  sectionCaption: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: 2,
  },
  headerActions: {
    flexDirection: "row",
    flexShrink: 0,
    gap: spacing.xs,
    marginLeft: spacing.xs,
  },
  smallButton: {
    minHeight: 34,
    minWidth: 64,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.full,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F8FEFF",
    borderWidth: 1,
    borderColor: colors.border,
  },
  smallButtonText: {
    fontSize: 11,
    color: colors.secondary,
    fontWeight: "700",
  },
  familyGrid: {
    flexDirection: "row",
    gap: spacing.md,
  },
  familyStatus: {
    flex: 1,
    minHeight: 78,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: "#F8FEFF",
    padding: spacing.md,
    justifyContent: "space-between",
  },
  familyName: {
    ...typography.caption,
    color: colors.text,
  },
  emptyFamily: {
    alignItems: "center",
    gap: spacing.xs,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: "#F8FEFF",
    padding: spacing.lg,
  },
  emptyTitle: {
    ...typography.bodyStrong,
    color: colors.text,
  },
  emptyText: {
    ...typography.caption,
    color: colors.textMuted,
    textAlign: "center",
    lineHeight: 18,
  },
  reportCard: {
    gap: spacing.lg,
  },
  emergencyGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.md,
  },
  emergencyTile: {
    flexBasis: "47%",
    flexGrow: 1,
    minHeight: 142,
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: spacing.md,
    justifyContent: "space-between",
  },
  emergencyTitle: {
    ...typography.bodyStrong,
  },
  emergencyText: {
    fontSize: 11,
    lineHeight: 16,
    color: colors.textMuted,
  },
  pressed: {
    opacity: 0.82,
    transform: [{ scale: 0.98 }],
  },
  disabledTile: {
    opacity: 0.55,
  },
  modalBackdrop: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(15, 23, 42, 0.38)",
  },
  categorySheet: {
    gap: spacing.md,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: spacing.lg,
    paddingBottom: spacing.xl,
    backgroundColor: colors.surface,
  },
  modalTitle: {
    ...typography.h3,
    color: colors.text,
  },
  modalCaption: {
    ...typography.caption,
    color: colors.textMuted,
    lineHeight: 18,
  },
  categoryList: {
    gap: spacing.sm,
  },
  categoryChoice: {
    minHeight: 74,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    borderWidth: 1,
    borderRadius: radius.md,
    backgroundColor: "#F8FEFF",
    padding: spacing.md,
  },
  categoryText: {
    flex: 1,
  },
  categoryTitle: {
    ...typography.bodyStrong,
    color: colors.text,
  },
  categoryCaption: {
    fontSize: 11,
    lineHeight: 16,
    color: colors.textMuted,
    marginTop: 2,
  },
});
