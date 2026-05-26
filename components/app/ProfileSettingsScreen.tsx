import { useEffect, useMemo, useState } from "react";
import type React from "react";
import {
  Image,
  Modal,
  Pressable,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Href, router } from "expo-router";
import { useAuth } from "@/hooks/useAuth";
import { useProfileAvatar } from "@/hooks/useProfileAvatar";
import { useShakeDetectionSettings } from "@/hooks/useShakeDetectionSettings";
import { useAppNotification } from "@/components/app/AppNotification";
import { AppPalette, useAppTheme } from "@/hooks/useAppTheme";
import { supabase } from "@/utils/supabase";
import { colors, radius, shadow, spacing, typography } from "@/theme";
import { UnitType } from "@/types";
import { PrimaryAction, ScreenShell } from "@/components/app/MockAppUI";

type Role = "reporter" | "operator";

const unitOptions: {
  value: UnitType | null;
  label: string;
  icon: React.ComponentProps<typeof MaterialCommunityIcons>["name"];
}[] = [
  { value: null, label: "Operator Pusat", icon: "headset" },
  { value: "ambulance", label: "Ambulans", icon: "ambulance" },
  { value: "police", label: "Polisi", icon: "police-badge-outline" },
  { value: "firefighter", label: "Pemadam", icon: "fire-truck" },
];

export function ProfileSettingsScreen({
  role,
  title,
  displayFallback,
  addressFallback,
  savedMessage,
  avatarTone = "primary",
}: {
  role: Role;
  title: string;
  displayFallback: string;
  addressFallback: string;
  savedMessage: string;
  avatarTone?: "primary" | "secondary";
}) {
  const { profile, signOut, refreshProfile } = useAuth();
  const [name, setName] = useState(profile?.full_name ?? "");
  const [address, setAddress] = useState(profile?.address ?? "");
  const [password, setPassword] = useState("");
  const [unitType, setUnitType] = useState<UnitType | null>(
    profile?.unit_type ?? null,
  );
  const [showPassword, setShowPassword] = useState(false);
  const [avatarPickerOpen, setAvatarPickerOpen] = useState(false);
  const { mode, palette, setMode } = useAppTheme();
  const { showNotification } = useAppNotification();
  const { uploading, updateAvatar } = useProfileAvatar();
  const {
    enabled: shakeDetectionEnabled,
    loading: shakeDetectionLoading,
    setEnabled: setShakeDetectionEnabled,
  } = useShakeDetectionSettings();
  const activeTab = "profile" as const;
  const isDark = mode === "dark";
  const visibleName = name.trim() || profile?.full_name || displayFallback;
  const visibleAddress = address.trim() || profile?.address || addressFallback;

  const screenRole = role === "operator" ? "operator" : "reporter";
  const signInRoute = "/auth/LoginScreen" as Href;
  const isOperator = profile?.role === "dispatcher" || role === "operator";
  const isReporter = profile?.role === "reporter" || role === "reporter";
  const unitLabel =
    unitOptions.find((option) => option.value === unitType)?.label ?? "Operator Pusat";

  useEffect(() => {
    setName(profile?.full_name ?? "");
    setAddress(profile?.address ?? "");
    setUnitType(profile?.unit_type ?? null);
  }, [profile?.address, profile?.full_name, profile?.unit_type]);

  const themeAction = useMemo(
    () => (
      <View
        style={[
          styles.themeSwitch,
          { backgroundColor: palette.toggle, borderColor: palette.border },
        ]}
      >
        <ThemeChoice
          active={!isDark}
          icon="white-balance-sunny"
          label="Light"
          onPress={() => setMode("light")}
        />
        <ThemeChoice
          active={isDark}
          icon="moon-waning-crescent"
          label="Dark"
          onPress={() => setMode("dark")}
        />
      </View>
    ),
    [isDark, palette.border, palette.toggle, setMode],
  );

  const handleSignOut = async () => {
    try {
      await signOut();
      router.replace(signInRoute);
    } catch (e) {
      showNotification({
        title: "Gagal keluar",
        message: e instanceof Error ? e.message : "Terjadi kesalahan",
        tone: "danger",
      });
    }
  };

  const handleUpdateProfile = async () => {
    if (!profile?.id) {
      showNotification({
        title: "Belum siap",
        message: "Profil belum terbaca. Coba login ulang.",
        tone: "warning",
      });
      return;
    }

    try {
      const { error: profileError } = await supabase
        .from("profiles")
        .update({
          full_name: name.trim() || profile.full_name,
          address: address.trim() || null,
          unit_type: isOperator ? unitType : null,
          ...(isOperator
            ? {
                is_available: true,
                last_active_at: new Date().toISOString(),
              }
            : {}),
        })
        .eq("id", profile.id);

      if (profileError) throw new Error(profileError.message);

      await refreshProfile();
      showNotification({
        title: "Profil diperbarui",
        message: savedMessage,
        tone: "success",
      });
    } catch (error) {
      showNotification({
        title: "Gagal update profil",
        message: error instanceof Error ? error.message : "Terjadi kesalahan.",
        tone: "danger",
      });
    }
  };

  const handleChangeUnitType = async (nextUnitType: UnitType | null) => {
    const previousUnitType = unitType;
    setUnitType(nextUnitType);

    if (!profile?.id || !isOperator) {
      return;
    }

    try {
      const { error: profileError } = await supabase
        .from("profiles")
        .update({
          unit_type: nextUnitType,
          is_available: true,
          last_active_at: new Date().toISOString(),
        })
        .eq("id", profile.id);

      if (profileError) throw new Error(profileError.message);

      await refreshProfile();
      showNotification({
        title: "Mode diperbarui",
        message: `Sekarang aktif sebagai ${unitOptions.find((option) => option.value === nextUnitType)?.label ?? "Operator Pusat"}.`,
        tone: "success",
      });
    } catch (error) {
      setUnitType(previousUnitType);
      showNotification({
        title: "Gagal mengganti mode",
        message: error instanceof Error ? error.message : "Terjadi kesalahan.",
        tone: "danger",
      });
    }
  };

  const handleChangePassword = async () => {
    const nextPassword = password.trim();

    if (nextPassword.length < 6) {
      showNotification({
        title: "Password belum valid",
        message: "Password baru minimal 6 karakter.",
        tone: "warning",
      });
      return;
    }

    try {
      const { error: passwordError } = await supabase.auth.updateUser({
        password: nextPassword,
      });

      if (passwordError) throw new Error(passwordError.message);

      setPassword("");
      setShowPassword(false);
      showNotification({
        title: "Password tersimpan",
        message: "Password berhasil diperbarui.",
        tone: "success",
      });
    } catch (error) {
      showNotification({
        title: "Gagal ubah password",
        message: error instanceof Error ? error.message : "Terjadi kesalahan.",
        tone: "danger",
      });
    }
  };

  const handleToggleShakeDetection = async (enabled: boolean) => {
    try {
      await setShakeDetectionEnabled(enabled);
      showNotification({
        title: enabled ? "Deteksi guncangan aktif" : "Deteksi guncangan mati",
        message: enabled
          ? "SigapID akan memantau benturan kuat di perangkat ini."
          : "Peringatan guncangan dimatikan di perangkat ini.",
        tone: enabled ? "success" : "info",
      });
    } catch (error) {
      showNotification({
        title: "Gagal menyimpan pengaturan",
        message: error instanceof Error ? error.message : "Terjadi kesalahan.",
        tone: "danger",
      });
    }
  };

  const handleUpdateAvatar = async (source: "camera" | "library") => {
    try {
      setAvatarPickerOpen(false);
      const avatarUrl = await updateAvatar(source);

      if (avatarUrl) {
        showNotification({
          title: "Foto tersimpan",
          message: "Foto profil berhasil diperbarui.",
          tone: "success",
        });
      }
    } catch (error) {
      showNotification({
        title: "Gagal update foto",
        message: error instanceof Error ? error.message : "Terjadi kesalahan.",
        tone: "danger",
      });
    }
  };

  const handleAvatarPress = () => {
    if (uploading) return;

    setAvatarPickerOpen(true);
  };

  return (
    <ScreenShell
      role={screenRole}
      activeTab={activeTab}
      title={title}
      subtitle="Kelola data akun dan keamanan."
      action={themeAction}
      titleColor={palette.text}
      subtitleColor={palette.muted}
    >
      <View
        style={[
          styles.identityCard,
          {
            backgroundColor: palette.card,
            borderColor: palette.border,
          },
        ]}
      >
        <ProfilePhoto
          name={visibleName}
          imageUri={profile?.avatar_url}
          tone={avatarTone}
          onPress={handleAvatarPress}
        />
        <Text style={[styles.name, { color: palette.text }]}>{visibleName}</Text>
        <Text style={[styles.avatarHint, { color: palette.muted }]}>
          {uploading ? "Mengunggah foto..." : "Ketuk foto untuk mengganti"}
        </Text>
        <Text style={[styles.meta, { color: colors.secondary }]}>
          ID: {profile?.user_code ?? "Belum tersedia"}
        </Text>
        {isOperator && (
          <Text style={[styles.meta, { color: colors.secondary }]}>
            Mode: {unitLabel}
          </Text>
        )}
        <Text style={[styles.address, { color: palette.subtle }]}>
          {visibleAddress}
        </Text>
      </View>

      <View
        style={[
          styles.formCard,
          {
            backgroundColor: palette.card,
            borderColor: palette.border,
          },
        ]}
      >
        <ProfileRow
          icon="account-outline"
          label="Username"
          value={name}
          onChangeText={setName}
          placeholder={displayFallback}
          palette={palette}
        />
        <ProfileRow
          icon="map-marker-outline"
          label="Alamat"
          value={address}
          onChangeText={setAddress}
          placeholder={addressFallback}
          palette={palette}
        />
        {isReporter && (
          <ShakeDetectionRow
            enabled={shakeDetectionEnabled}
            loading={shakeDetectionLoading}
            palette={palette}
            onChange={handleToggleShakeDetection}
          />
        )}
        {isOperator && (
          <UnitTypeSelector
            value={unitType}
            onChange={handleChangeUnitType}
            palette={palette}
          />
        )}
        <ProfileRow
          icon="lock-outline"
          label="Password"
          value={password}
          onChangeText={setPassword}
          placeholder="********"
          palette={palette}
          secureTextEntry={!showPassword}
          rightContent={
            <Pressable
              onPress={() => setShowPassword((current) => !current)}
              style={styles.showPassword}
            >
              <MaterialCommunityIcons
                name={showPassword ? "eye-off-outline" : "eye-outline"}
                size={18}
                color={palette.muted}
              />
              <Text style={[styles.showPasswordText, { color: palette.muted }]}>
                {showPassword ? "Sembunyikan" : "Tampilkan"}
              </Text>
            </Pressable>
          }
        />

        <PrimaryAction
          label="Ubah Password"
          tone="secondary"
          onPress={handleChangePassword}
        />
        <PrimaryAction
          label="Simpan Perubahan"
          tone="secondary"
          onPress={handleUpdateProfile}
        />
        <Pressable
          onPress={handleSignOut}
          style={({ pressed }) => [
            styles.signOutButton,
            { borderColor: palette.border },
            pressed && styles.pressed,
          ]}
        >
          <MaterialCommunityIcons name="logout" size={18} color={colors.danger} />
          <Text style={styles.signOutText}>Keluar</Text>
        </Pressable>
      </View>

      <Modal
        animationType="fade"
        transparent
        visible={avatarPickerOpen}
        onRequestClose={() => setAvatarPickerOpen(false)}
      >
        <View style={styles.modalBackdrop}>
          <View
            style={[
              styles.sourceSheet,
              { backgroundColor: palette.card, borderColor: palette.border },
            ]}
          >
            <Text style={[styles.sheetTitle, { color: palette.text }]}>
              Foto Profil
            </Text>
            <Text style={[styles.sheetCaption, { color: palette.muted }]}>
              Pilih sumber foto yang ingin dipakai.
            </Text>
            <View style={styles.sourceOptions}>
              <SourceOption
                icon="camera-outline"
                label="Kamera"
                caption="Ambil foto baru"
                palette={palette}
                onPress={() => handleUpdateAvatar("camera")}
              />
              <SourceOption
                icon="image-outline"
                label="Galeri"
                caption="Pilih dari library"
                palette={palette}
                onPress={() => handleUpdateAvatar("library")}
              />
            </View>
            <PrimaryAction
              label="Batal"
              tone="soft"
              onPress={() => setAvatarPickerOpen(false)}
            />
          </View>
        </View>
      </Modal>
    </ScreenShell>
  );
}

function SourceOption({
  icon,
  label,
  caption,
  palette,
  onPress,
}: {
  icon: React.ComponentProps<typeof MaterialCommunityIcons>["name"];
  label: string;
  caption: string;
  palette: AppPalette;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.sourceOption,
        { backgroundColor: palette.cardSoft, borderColor: palette.border },
        pressed && styles.pressed,
      ]}
    >
      <View style={[styles.sourceIcon, { backgroundColor: palette.secondarySoft }]}>
        <MaterialCommunityIcons name={icon} size={22} color={palette.secondary} />
      </View>
      <View style={styles.sourceText}>
        <Text style={[styles.sourceTitle, { color: palette.text }]}>{label}</Text>
        <Text style={[styles.sourceCaption, { color: palette.muted }]}>
          {caption}
        </Text>
      </View>
      <MaterialCommunityIcons name="chevron-right" size={20} color={palette.subtle} />
    </Pressable>
  );
}

function ShakeDetectionRow({
  enabled,
  loading,
  palette,
  onChange,
}: {
  enabled: boolean;
  loading: boolean;
  palette: AppPalette;
  onChange: (enabled: boolean) => void;
}) {
  return (
    <View style={[styles.settingRow, { borderBottomColor: palette.rowBorder }]}>
      <View style={[styles.settingIcon, { backgroundColor: palette.primarySoft }]}>
        <MaterialCommunityIcons
          name="motion-sensor"
          size={22}
          color={colors.primary}
        />
      </View>
      <View style={styles.settingText}>
        <Text style={[styles.settingTitle, { color: palette.text }]}>
          Deteksi Guncangan
        </Text>
        <Text style={[styles.settingCaption, { color: palette.muted }]}>
          {enabled ? "Aktif di perangkat ini" : "Mati di perangkat ini"}
        </Text>
      </View>
      <Switch
        value={enabled}
        disabled={loading}
        onValueChange={onChange}
        trackColor={{ false: palette.surfaceMuted, true: colors.primaryLight }}
        thumbColor={enabled ? colors.primary : palette.subtle}
      />
    </View>
  );
}

function UnitTypeSelector({
  value,
  onChange,
  palette,
}: {
  value: UnitType | null;
  onChange: (value: UnitType | null) => void;
  palette: AppPalette;
}) {
  return (
    <View style={[styles.unitBox, { borderBottomColor: palette.rowBorder }]}>
      <View style={styles.unitHeader}>
        <MaterialCommunityIcons name="shield-account-outline" size={24} color={palette.muted} />
        <Text style={[styles.rowLabel, { color: palette.text }]}>Mode</Text>
      </View>
      <View style={styles.unitChoices}>
        {unitOptions.map((option) => {
          const selected = option.value === value;

          return (
            <Pressable
              key={option.value ?? "central"}
              onPress={() => onChange(option.value)}
              style={({ pressed }) => [
                styles.unitChoice,
                {
                  backgroundColor: selected ? colors.secondary : palette.cardSoft,
                  borderColor: selected ? colors.secondary : palette.border,
                },
                pressed && styles.pressed,
              ]}
            >
              <MaterialCommunityIcons
                name={option.icon}
                size={17}
                color={selected ? colors.textInverse : palette.muted}
              />
              <Text
                style={[
                  styles.unitChoiceText,
                  { color: selected ? colors.textInverse : palette.text },
                ]}
              >
                {option.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function ThemeChoice({
  active,
  icon,
  label,
  onPress,
}: {
  active: boolean;
  icon: React.ComponentProps<typeof MaterialCommunityIcons>["name"];
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.themeChoice, active && styles.themeChoiceActive]}
    >
      <MaterialCommunityIcons
        name={icon}
        size={16}
        color={active ? colors.textInverse : colors.textMuted}
      />
      <Text style={[styles.themeLabel, active && styles.themeLabelActive]}>
        {label}
      </Text>
    </Pressable>
  );
}

function ProfilePhoto({
  name,
  imageUri,
  tone,
  onPress,
}: {
  name: string;
  imageUri?: string | null;
  tone: "primary" | "secondary";
  onPress: () => void;
}) {
  const initial = name.trim().charAt(0).toUpperCase() || "U";
  const fallbackColor = tone === "primary" ? colors.primary : colors.secondary;

  return (
    <Pressable onPress={onPress} style={({ pressed }) => pressed && styles.pressed}>
      <View style={styles.avatarOuter}>
        <View style={styles.avatarInner}>
          {imageUri ? (
            <Image source={{ uri: imageUri }} style={styles.avatarImage} />
          ) : (
            <View style={[styles.avatarFallback, { backgroundColor: fallbackColor }]}>
              <Text style={styles.avatarInitial}>{initial}</Text>
            </View>
          )}
        </View>
      </View>
    </Pressable>
  );
}

function ProfileRow({
  icon,
  label,
  value,
  onChangeText,
  placeholder,
  palette,
  secureTextEntry,
  rightContent,
}: {
  icon: React.ComponentProps<typeof MaterialCommunityIcons>["name"];
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
  palette: AppPalette;
  secureTextEntry?: boolean;
  rightContent?: React.ReactNode;
}) {
  return (
    <View style={[styles.profileRow, { borderBottomColor: palette.rowBorder }]}>
      <MaterialCommunityIcons name={icon} size={24} color={palette.muted} />
      <Text style={[styles.rowLabel, { color: palette.text }]}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={palette.subtle}
        secureTextEntry={secureTextEntry}
        style={[styles.rowInput, { color: palette.text }]}
      />
      {rightContent ?? (
        <MaterialCommunityIcons
          name="pencil-outline"
          size={22}
          color={palette.muted}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  themeSwitch: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    borderWidth: 1,
    borderRadius: radius.full,
    padding: 3,
  },
  themeChoice: {
    minHeight: 34,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    borderRadius: radius.full,
    paddingHorizontal: spacing.sm,
  },
  themeChoiceActive: {
    backgroundColor: colors.secondary,
  },
  themeLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.textMuted,
  },
  themeLabelActive: {
    color: colors.textInverse,
  },
  identityCard: {
    alignItems: "center",
    gap: spacing.xs,
    borderWidth: 1,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    ...shadow.sm,
  },
  avatarOuter: {
    width: 112,
    height: 112,
    borderRadius: 56,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "rgba(15, 23, 42, 0.18)",
    backgroundColor: "rgba(255, 255, 255, 0.72)",
    ...shadow.md,
  },
  avatarInner: {
    width: 100,
    height: 100,
    borderRadius: 50,
    overflow: "hidden",
    backgroundColor: colors.surfaceMuted,
  },
  avatarImage: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  avatarFallback: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarInitial: {
    color: colors.textInverse,
    fontSize: 42,
    fontWeight: "800",
  },
  name: {
    ...typography.h1,
    marginTop: spacing.sm,
  },
  meta: {
    ...typography.caption,
    fontWeight: "700",
  },
  avatarHint: {
    ...typography.caption,
  },
  address: {
    ...typography.caption,
    textAlign: "center",
    lineHeight: 19,
  },
  formCard: {
    gap: spacing.md,
    borderWidth: 1,
    borderRadius: radius.xl,
    padding: spacing.lg,
    ...shadow.sm,
  },
  profileRow: {
    minHeight: 68,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    borderBottomWidth: 1,
  },
  rowLabel: {
    width: 86,
    ...typography.bodyStrong,
  },
  rowInput: {
    flex: 1,
    minHeight: 44,
    ...typography.bodyStrong,
  },
  unitBox: {
    gap: spacing.sm,
    borderBottomWidth: 1,
    paddingBottom: spacing.md,
  },
  unitHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  unitChoices: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  unitChoice: {
    minHeight: 38,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    borderRadius: radius.full,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
  },
  unitChoiceText: {
    fontSize: 12,
    fontWeight: "700",
  },
  settingRow: {
    minHeight: 70,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    borderBottomWidth: 1,
  },
  settingIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
  },
  settingText: {
    flex: 1,
  },
  settingTitle: {
    ...typography.bodyStrong,
  },
  settingCaption: {
    ...typography.caption,
    marginTop: 2,
  },
  showPassword: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  showPasswordText: {
    ...typography.caption,
    textDecorationLine: "underline",
  },
  signOutButton: {
    minHeight: 46,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    borderWidth: 1,
    borderRadius: radius.lg,
  },
  signOutText: {
    ...typography.button,
    color: colors.danger,
  },
  pressed: {
    opacity: 0.82,
    transform: [{ scale: 0.98 }],
  },
  modalBackdrop: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(15, 23, 42, 0.42)",
  },
  sourceSheet: {
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
  sourceOptions: {
    gap: spacing.sm,
  },
  sourceOption: {
    minHeight: 72,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: spacing.md,
  },
  sourceIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
  },
  sourceText: {
    flex: 1,
  },
  sourceTitle: {
    ...typography.bodyStrong,
  },
  sourceCaption: {
    ...typography.caption,
    marginTop: 2,
  },
});
