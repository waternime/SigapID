import { Href } from "expo-router";
import { Alert, StyleSheet, Text, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useFamilyMembers } from "@/hooks/useFamilyMembers";
import { useAuth } from "@/hooks/useAuth";
import { FamilyMemberWithProfile } from "@/types";
import { colors, radius, spacing, typography } from "@/theme";
import {
  Card,
  IconButton,
  PrimaryAction,
  ScreenShell,
  StatusPill,
  navigateTo,
} from "@/components/app/MockAppUI";

export default function ReporterFamilyDetail() {
  const { profile } = useAuth();
  const { members, loading, error, updateRequestStatus } = useFamilyMembers();

  const handleRequest = async (
    memberId: string,
    status: "accepted" | "rejected",
  ) => {
    try {
      await updateRequestStatus(memberId, status);
      Alert.alert(
        status === "accepted" ? "Permintaan diterima" : "Permintaan ditolak",
        status === "accepted"
          ? "Akun keluarga sudah terhubung."
          : "Permintaan keluarga sudah ditolak.",
      );
    } catch (requestError) {
      Alert.alert(
        "Gagal memproses permintaan",
        requestError instanceof Error ? requestError.message : "Terjadi kesalahan.",
      );
    }
  };

  return (
    <ScreenShell
      role="reporter"
      activeTab="home"
      title="Keluarga"
      subtitle="Status sensor, aktivitas terakhir, dan kondisi terkini."
      action={
        <IconButton
          icon="plus"
          tone="primary"
          onPress={() => navigateTo("/reporter/add-family" as Href)}
        />
      }
    >
      {loading ? (
        <Card style={styles.emptyCard}>
          <Text style={styles.emptyTitle}>Memuat keluarga...</Text>
        </Card>
      ) : error ? (
        <Card style={styles.emptyCard}>
          <Text style={styles.emptyTitle}>Data belum bisa dimuat</Text>
          <Text style={styles.emptyText}>{error}</Text>
        </Card>
      ) : members.length === 0 ? (
        <Card style={styles.emptyCard}>
          <MaterialCommunityIcons
            name="account-group-outline"
            size={36}
            color={colors.primary}
          />
          <Text style={styles.emptyTitle}>Belum ada anggota keluarga</Text>
          <Text style={styles.emptyText}>
            Tambahkan keluarga dari ID akun. Setelah mereka menerima permintaan,
            statusnya akan muncul di sini.
          </Text>
        </Card>
      ) : (
        <View style={styles.list}>
          {members.map((member) => {
            const isIncomingRequest =
              member.member_id === profile?.id && member.status === "pending";
            const isOutgoingRequest =
              member.owner_id === profile?.id && member.status === "pending";
            const displayProfile = getDisplayProfile(member, profile?.id);

            return (
              <Card key={member.id} style={styles.memberCard}>
              <View style={styles.memberHeader}>
                <View style={styles.memberAvatar}>
                  <MaterialCommunityIcons
                    name={
                      isIncomingRequest
                        ? "account-arrow-left-outline"
                        : "account-heart-outline"
                    }
                    size={22}
                    color={colors.secondary}
                  />
                </View>
                <View style={styles.memberText}>
                  <Text style={styles.memberName}>
                    {displayProfile?.full_name ?? "Anggota keluarga"}
                  </Text>
                  <Text style={styles.memberNote}>
                    ID: {displayProfile?.user_code ?? displayProfile?.id ?? "-"}
                  </Text>
                </View>
                <StatusPill
                  label={getStatusLabel(member, profile?.id)}
                  tone={
                    member.status === "accepted"
                      ? "success"
                      : member.status === "rejected"
                        ? "danger"
                        : "warning"
                  }
                />
              </View>
              <View style={styles.metrics}>
                {[
                  member.relationship_label ?? "Keluarga",
                  isIncomingRequest
                    ? "Permintaan masuk"
                    : isOutgoingRequest
                      ? "Menunggu diterima"
                      : member.accepted_at
                        ? "Sudah terhubung"
                        : member.status,
                ].map((metric) => (
                  <View key={metric} style={styles.metricChip}>
                    <Text style={styles.metricText}>{metric}</Text>
                  </View>
                ))}
              </View>

              {isIncomingRequest && (
                <View style={styles.requestActions}>
                  <PrimaryAction
                    label="Tolak"
                    tone="soft"
                    style={styles.requestButton}
                    onPress={() => handleRequest(member.id, "rejected")}
                  />
                  <PrimaryAction
                    label="Terima"
                    icon="check"
                    tone="secondary"
                    style={styles.requestButton}
                    onPress={() => handleRequest(member.id, "accepted")}
                  />
                </View>
              )}
              </Card>
            );
          })}
        </View>
      )}
    </ScreenShell>
  );
}

function getDisplayProfile(member: FamilyMemberWithProfile, currentUserId?: string) {
  if (member.owner_id === currentUserId) {
    return member.member;
  }

  return member.owner;
}

function getStatusLabel(member: FamilyMemberWithProfile, currentUserId?: string) {
  if (member.status === "accepted") return "Aman";
  if (member.status === "rejected") return "Ditolak";
  if (member.member_id === currentUserId) return "Perlu respon";
  return "Menunggu";
}

const styles = StyleSheet.create({
  list: {
    gap: spacing.md,
  },
  emptyCard: {
    alignItems: "center",
    gap: spacing.sm,
  },
  emptyTitle: {
    ...typography.bodyStrong,
    color: colors.text,
    textAlign: "center",
  },
  emptyText: {
    ...typography.caption,
    color: colors.textMuted,
    textAlign: "center",
    lineHeight: 18,
  },
  memberCard: {
    gap: spacing.md,
  },
  memberHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  memberAvatar: {
    width: 42,
    height: 42,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.secondaryLight,
  },
  memberText: {
    flex: 1,
  },
  memberName: {
    ...typography.bodyStrong,
    color: colors.text,
  },
  memberNote: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 2,
  },
  metrics: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  metricChip: {
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: "#F8FEFF",
    paddingHorizontal: spacing.sm,
    paddingVertical: 7,
  },
  metricText: {
    fontSize: 11,
    color: colors.text,
  },
  requestActions: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  requestButton: {
    flex: 1,
  },
});
