import React, { useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Href, router } from "expo-router";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useAuth } from "@/hooks/useAuth";
import { colors, spacing, typography } from "@/theme";
import { UserRole } from "@/types";

const dashboardPathByRole: Record<UserRole, Href> = {
  reporter: "/reporter/dashboard" as Href,
  dispatcher: "/operator/dashboard" as Href,
};

export default function LoginScreen() {
  const { signIn, loading } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});

  const handleLogin = async () => {
    const err: typeof errors = {};
    if (!email.includes("@")) err.email = "Email tidak valid";
    if (password.length < 6) err.password = "Password minimal 6 karakter";
    setErrors(err);
    if (Object.keys(err).length > 0) return;

    try {
      const profile = await signIn(email.trim().toLowerCase(), password);
      router.replace(dashboardPathByRole[profile.role]);
    } catch (e) {
      Alert.alert(
        "Login gagal",
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
          <View style={styles.brand}>
            <View style={styles.logo}>
              <Text style={styles.logoText}>S</Text>
            </View>
            <Text style={[typography.display, { color: colors.text }]}>
              SigapID
            </Text>
            <Text style={[typography.body, styles.tagline]}>
              Sistem Tanggap Darurat Indonesia
            </Text>
          </View>

          <View style={styles.form}>
            <Input
              label="Email"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              autoComplete="email"
              placeholder="nama@email.com"
              error={errors.email}
            />
            <Input
              label="Password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoComplete="password"
              placeholder="••••••••"
              error={errors.password}
            />

            <Button label="Masuk" onPress={handleLogin} loading={loading} />

            <View style={styles.footerRow}>
              <Text style={typography.caption}>Belum punya akun?</Text>
              <Text
                style={[typography.bodyStrong, styles.link]}
                onPress={() => router.push("/auth/RegisterScreen")}
              >
                Daftar
              </Text>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  container: {
    flexGrow: 1,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xxxl,
  },
  brand: { alignItems: "center", marginBottom: spacing.xxxl },
  logo: {
    width: 72,
    height: 72,
    borderRadius: 24,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.lg,
  },
  logoText: {
    color: colors.textInverse,
    fontSize: 36,
    fontWeight: "800",
  },
  tagline: { color: colors.textMuted, marginTop: 4 },
  form: { gap: spacing.sm },
  footerRow: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: spacing.xl,
    gap: spacing.xs,
  },
  link: { color: colors.primary },
});
