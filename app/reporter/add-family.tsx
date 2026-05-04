import { useState } from "react";
import { Alert, StyleSheet, Text } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/utils/supabase";
import { colors, spacing, typography } from "@/theme";
import {
  Card,
  FieldCard,
  PrimaryAction,
  ScreenShell,
} from "@/components/app/MockAppUI";

export default function ReporterAddFamily() {
  const { profile } = useAuth();
  const [familyId, setFamilyId] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    const normalizedCode = familyId.trim().toUpperCase();

    if (!normalizedCode) {
      Alert.alert("ID kosong", "Masukkan ID akun keluarga terlebih dahulu.");
      return;
    }

    if (!profile?.id) {
      Alert.alert("Belum siap", "Profile kamu belum terbaca. Coba login ulang.");
      return;
    }

    setSubmitting(true);

    const { data: foundProfiles, error: findError } = await supabase.rpc(
      "find_profile_by_user_code",
      { search_code: normalizedCode },
    );

    if (findError) {
      setSubmitting(false);
      Alert.alert("Gagal mencari akun", findError.message);
      return;
    }

    const targetProfile = foundProfiles?.[0];

    if (!targetProfile) {
      setSubmitting(false);
      Alert.alert("Akun tidak ditemukan", "Cek lagi ID akun keluarga.");
      return;
    }

    if (targetProfile.id === profile.id) {
      setSubmitting(false);
      Alert.alert("Tidak bisa", "Kamu tidak bisa menambahkan akun sendiri.");
      return;
    }

    const { error: insertError } = await supabase.from("family_members").insert({
      owner_id: profile.id,
      member_id: targetProfile.id,
      relationship_label: "Keluarga",
      status: "pending",
    });

    setSubmitting(false);

    if (insertError) {
      Alert.alert("Gagal menambahkan keluarga", insertError.message);
      return;
    }

    Alert.alert(
      "Permintaan dikirim",
      `${targetProfile.full_name ?? "Anggota keluarga"} akan muncul setelah permintaan diterima.`,
    );
  };

  return (
    <ScreenShell
      role="reporter"
      activeTab="home"
      title="Keluarga"
      subtitle="Gunakan ID akun agar pencarian anggota keluarga tidak tertukar nama."
    >
      <Card style={styles.heroCard}>
        <MaterialCommunityIcons
          name="account-plus-outline"
          size={34}
          color={colors.primary}
        />
        <Text style={styles.heroTitle}>Tambah Guardian</Text>
        <Text style={styles.heroText}>
          Minta ID akun dari anggota keluarga yang ingin dipantau.
        </Text>
      </Card>

      <FieldCard
        label="Masukan ID Akun Keluargamu"
        placeholder="contoh: 3453223"
        value={familyId}
        onChangeText={setFamilyId}
      />

      <PrimaryAction
        label={submitting ? "Mengirim..." : "Kirim Permintaan"}
        icon="send-outline"
        tone="secondary"
        onPress={handleSubmit}
      />
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  heroCard: {
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: "#FFF7F7",
    borderColor: "#FECACA",
  },
  heroTitle: {
    ...typography.h3,
    color: colors.text,
  },
  heroText: {
    ...typography.caption,
    color: colors.textMuted,
    textAlign: "center",
    lineHeight: 19,
  },
});
