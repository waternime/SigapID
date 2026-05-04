import React, { useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useAuth } from "@/hooks/useAuth";
import { colors, radius, spacing, typography } from "@/theme";
import { UserRole } from "@/types";

export default function RegisterScreen() {
  const { signUp, loading } = useAuth();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<UserRole>("reporter");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleSubmit = async () => {
    const err: Record<string, string> = {};
    if (fullName.trim().length < 2) err.name = "Nama terlalu pendek";
    if (!email.includes("@")) err.email = "Email tidak valid";
    if (password.length < 6) err.password = "Password minimal 6 karakter";
    setErrors(err);
    if (Object.keys(err).length > 0) return;

    try {
      await signUp(email.trim().toLowerCase(), password, fullName.trim(), role);
      Alert.alert(
        "Pendaftaran berhasil",
        "Silakan masuk dengan akun yang baru dibuat.",
        [{ text: "OK", onPress: () => router.replace("/auth/LoginScreen") }],
      );
    } catch (e) {
      Alert.alert(
        "Pendaftaran gagal",
        e instanceof Error ? e.message : "Terjadi kesalahan",
      );
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.container}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={[typography.h1, { color: colors.text }]}>
            Buat Akun Baru
          </Text>
          <Text style={[typography.body, styles.subtitle]}>
            Daftar sebagai pelapor atau operator
          </Text>

          <View style={styles.roleRow}>
            <RoleCard
              selected={role === "reporter"}
              onPress={() => setRole("reporter")}
              icon="account-alert-outline"
              title="Pelapor"
              description="Saya butuh bantuan darurat"
            />
            <RoleCard
              selected={role === "dispatcher"}
              onPress={() => setRole("dispatcher")}
              icon="headset"
              title="Operator"
              description="Saya menerima laporan"
            />
          </View>

          <Input
            label="Nama Lengkap"
            value={fullName}
            onChangeText={setFullName}
            placeholder="Nama Anda"
            error={errors.name}
            autoCapitalize="words"
          />
          <Input
            label="Email"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            placeholder="nama@email.com"
            error={errors.email}
          />
          <Input
            label="Password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            placeholder="Minimal 6 karakter"
            error={errors.password}
          />

          <Button label="Daftar" onPress={handleSubmit} loading={loading} />

          <View style={styles.footerRow}>
            <Text style={typography.caption}>Sudah punya akun?</Text>
            <Text
              style={[typography.bodyStrong, styles.link]}
              onPress={() => router.replace("/auth/LoginScreen")}
            >
              Masuk
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const RoleCard = ({
  selected,
  onPress,
  icon,
  title,
  description,
}: {
  selected: boolean;
  onPress: () => void;
  icon: React.ComponentProps<typeof MaterialCommunityIcons>["name"];
  title: string;
  description: string;
}) => (
  <Pressable
    onPress={onPress}
    style={({ pressed }) => [
      styles.roleCard,
      selected && styles.roleCardSelected,
      pressed && { opacity: 0.85 },
    ]}
  >
    <View style={[styles.roleBadge, selected && styles.roleBadgeSelected]}>
      <MaterialCommunityIcons
        name={icon}
        size={24}
        color={selected ? colors.textInverse : colors.text}
      />
    </View>
    <Text style={[typography.bodyStrong, { color: selected ? colors.primary : colors.text }]}>
      {title}
    </Text>
    <Text style={styles.roleDesc}>{description}</Text>
  </Pressable>
);

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  container: {
    flexGrow: 1,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
    paddingBottom: spacing.xxxl,
  },
  subtitle: { color: colors.textMuted, marginTop: 4, marginBottom: spacing.xl },
  roleRow: { flexDirection: "row", gap: spacing.md, marginBottom: spacing.xl },
  roleCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing.lg,
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  roleCardSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
  },
  roleBadge: {
    width: 40,
    height: 40,
    borderRadius: radius.full,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surfaceMuted,
    marginBottom: spacing.sm,
  },
  roleBadgeSelected: {
    backgroundColor: colors.primary,
  },
  roleDesc: {
    fontSize: 11,
    color: colors.textMuted,
    textAlign: "center",
    marginTop: 2,
  },
  footerRow: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: spacing.xl,
    gap: spacing.xs,
  },
  link: { color: colors.primary },
});
