import { useState } from "react";
import { Alert, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { useAuth } from "@/hooks/useAuth";
import { useProfileAvatar } from "@/hooks/useProfileAvatar";
import { supabase } from "@/utils/supabase";
import { colors, spacing, typography } from "@/theme";
import {
  Avatar,
  FieldCard,
  PrimaryAction,
  ScreenShell,
} from "@/components/app/MockAppUI";

export default function ReporterProfile() {
  const { profile, signOut, refreshProfile } = useAuth();
  const [name, setName] = useState(profile?.full_name ?? "");
  const [address, setAddress] = useState(profile?.address ?? "");
  const [password, setPassword] = useState("");
  const { uploading, updateAvatar } = useProfileAvatar();

  const handleSignOut = async () => {
    try {
      await signOut();
      router.replace("/auth/LoginScreen");
    } catch (e) {
      Alert.alert("Gagal keluar", e instanceof Error ? e.message : "Terjadi kesalahan");
    }
  };

  const handleUpdateProfile = async () => {
    if (!profile?.id) {
      Alert.alert("Belum siap", "Profil belum terbaca. Coba login ulang.");
      return;
    }

    try {
      const { error: profileError } = await supabase
        .from("profiles")
        .update({
          full_name: name.trim() || profile.full_name,
          address: address.trim() || null,
        })
        .eq("id", profile.id);

      if (profileError) throw new Error(profileError.message);

      if (password.trim()) {
        const { error: passwordError } = await supabase.auth.updateUser({
          password: password.trim(),
        });

        if (passwordError) throw new Error(passwordError.message);
        setPassword("");
      }

      await refreshProfile();
      Alert.alert("Tersimpan", "Profil berhasil diperbarui.");
    } catch (error) {
      Alert.alert(
        "Gagal update profile",
        error instanceof Error ? error.message : "Terjadi kesalahan.",
      );
    }
  };

  const handleUpdateAvatar = async (source: "camera" | "library") => {
    try {
      const avatarUrl = await updateAvatar(source);

      if (avatarUrl) {
        Alert.alert("Foto tersimpan", "Foto profil berhasil diperbarui.");
      }
    } catch (error) {
      Alert.alert(
        "Gagal update foto",
        error instanceof Error ? error.message : "Terjadi kesalahan.",
      );
    }
  };

  const handleAvatarPress = () => {
    Alert.alert("Foto Profil", "Pilih sumber foto profil.", [
      { text: "Kamera", onPress: () => handleUpdateAvatar("camera") },
      { text: "Galeri", onPress: () => handleUpdateAvatar("library") },
      { text: "Batal", style: "cancel" },
    ]);
  };

  return (
    <ScreenShell
      role="reporter"
      activeTab="profile"
      title="Profil"
      subtitle="Kelola identitas, alamat, dan keamanan akun."
    >
      <View style={styles.identity}>
        <Avatar
          name={profile?.full_name ?? "User"}
          imageUri={profile?.avatar_url}
          size={112}
          onPress={handleAvatarPress}
        />
        <Text style={styles.name}>{profile?.full_name ?? "User"}</Text>
        <Text style={styles.avatarHint}>
          {uploading ? "Mengunggah foto..." : "Ketuk foto untuk mengganti"}
        </Text>
        <Text style={styles.meta}>ID: {profile?.user_code ?? "Belum tersedia"}</Text>
        <Text style={styles.address}>
          {address || "Tambahkan alamat utama untuk mempercepat bantuan."}
        </Text>
      </View>

      <FieldCard
        label="Masukan Nama Baru"
        placeholder="nama"
        value={name}
        onChangeText={setName}
      />
      <FieldCard
        label="Masukan Alamat Baru"
        placeholder="jalan sepi rt 02 rw 03"
        value={address}
        onChangeText={setAddress}
      />
      <FieldCard
        label="Masukan Password Baru"
        placeholder="password baru"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />

      <PrimaryAction
        label="Update Profile"
        tone="soft"
        onPress={handleUpdateProfile}
      />
      <PrimaryAction
        label="Keluar"
        tone="danger"
        onPress={handleSignOut}
      />
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  identity: {
    alignItems: "center",
    gap: spacing.xs,
    paddingVertical: spacing.md,
  },
  name: {
    ...typography.h1,
    color: colors.text,
    marginTop: spacing.md,
  },
  meta: {
    ...typography.caption,
    color: colors.secondary,
  },
  avatarHint: {
    ...typography.caption,
    color: colors.textMuted,
  },
  address: {
    ...typography.caption,
    color: colors.textMuted,
    textAlign: "center",
    lineHeight: 19,
  },
});
