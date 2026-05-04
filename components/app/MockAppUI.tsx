import React from "react";
import {
  Alert,
  Image,
  Platform,
  Pressable,
  ScrollView,
  StyleProp,
  StyleSheet,
  Text,
  TextInput,
  View,
  ViewStyle,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Href, router } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import MapView, { Marker } from "react-native-maps";
import { colors, radius, shadow, spacing, typography } from "@/theme";

type IconName = React.ComponentProps<typeof MaterialCommunityIcons>["name"];
type Role = "reporter" | "operator";
type ReporterTab = "home" | "tracking" | "history" | "profile";
type OperatorTab = "home" | "history" | "profile";

interface NavItem {
  label: string;
  icon: IconName;
  route: Href;
  activeKey: string;
}

const reporterNavItems: NavItem[] = [
  {
    label: "Home",
    icon: "home-variant-outline",
    route: "/reporter/dashboard" as Href,
    activeKey: "home",
  },
  {
    label: "Tracking",
    icon: "navigation-variant-outline",
    route: "/reporter/tracking" as Href,
    activeKey: "tracking",
  },
  {
    label: "History",
    icon: "clock-outline",
    route: "/reporter/history" as Href,
    activeKey: "history",
  },
  {
    label: "Profile",
    icon: "account-outline",
    route: "/reporter/profile" as Href,
    activeKey: "profile",
  },
];

const operatorNavItems: NavItem[] = [
  {
    label: "Home",
    icon: "home-variant-outline",
    route: "/operator/dashboard" as Href,
    activeKey: "home",
  },
  {
    label: "History",
    icon: "clock-outline",
    route: "/operator/history" as Href,
    activeKey: "history",
  },
  {
    label: "Profile",
    icon: "account-outline",
    route: "/operator/profile" as Href,
    activeKey: "profile",
  },
];

export function navigateTo(route: Href) {
  router.push(route);
}

export function replaceTo(route: Href) {
  router.replace(route);
}

export function showComingSoon(label: string) {
  Alert.alert(label, "Fitur ini nanti bisa disambungkan ke backend.");
}

export function ScreenShell({
  role,
  activeTab,
  title,
  subtitle,
  action,
  children,
  scroll = true,
}: {
  role: Role;
  activeTab?: ReporterTab | OperatorTab;
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  scroll?: boolean;
}) {
  const content = (
    <View style={[styles.content, !scroll && styles.contentFixed]}>
      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text style={styles.title}>{title}</Text>
          {!!subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
        </View>
        {action}
      </View>
      {children}
    </View>
  );

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      {scroll ? (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {content}
        </ScrollView>
      ) : (
        <View style={styles.fixed}>{content}</View>
      )}
      {!!activeTab && <BottomNav role={role} activeTab={activeTab} />}
    </SafeAreaView>
  );
}

function BottomNav({
  role,
  activeTab,
}: {
  role: Role;
  activeTab: ReporterTab | OperatorTab;
}) {
  const items = role === "reporter" ? reporterNavItems : operatorNavItems;

  return (
    <View style={styles.bottomWrap}>
      <View style={styles.bottomNav}>
        {items.map((item) => {
          const active = item.activeKey === activeTab;
          return (
            <Pressable
              key={item.activeKey}
              onPress={() => navigateTo(item.route)}
              style={styles.navItem}
            >
              <MaterialCommunityIcons
                name={item.icon}
                size={18}
                color={active ? colors.primary : colors.textSubtle}
              />
              <Text style={[styles.navLabel, active && styles.navLabelActive]}>
                {item.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

export function IconButton({
  icon,
  onPress,
  tone = "neutral",
}: {
  icon: IconName;
  onPress?: () => void;
  tone?: "neutral" | "primary" | "secondary" | "danger";
}) {
  const color =
    tone === "danger"
      ? colors.danger
      : tone === "secondary"
        ? colors.secondary
        : tone === "primary"
          ? colors.primary
          : colors.text;

  return (
    <Pressable
      onPress={onPress ?? (() => showComingSoon("Aksi"))}
      style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}
    >
      <MaterialCommunityIcons name={icon} size={22} color={color} />
    </Pressable>
  );
}

export function PrimaryAction({
  label,
  icon,
  onPress,
  tone = "primary",
  style,
}: {
  label: string;
  icon?: IconName;
  onPress: () => void;
  tone?: "primary" | "secondary" | "soft" | "danger";
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.actionButton,
        tone === "secondary" && styles.actionSecondary,
        tone === "soft" && styles.actionSoft,
        tone === "danger" && styles.actionDanger,
        pressed && styles.pressed,
        style,
      ]}
    >
      {!!icon && (
        <MaterialCommunityIcons
          name={icon}
          size={18}
          color={tone === "soft" ? colors.primary : colors.textInverse}
        />
      )}
      <Text
        style={[
          styles.actionText,
          tone === "soft" && styles.actionTextSoft,
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

export function Card({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function StatusPill({
  label,
  tone = "success",
}: {
  label: string;
  tone?: "success" | "warning" | "danger" | "info" | "neutral";
}) {
  const palette = {
    success: [colors.success, "#DCFCE7"],
    warning: [colors.warning, "#FEF3C7"],
    danger: [colors.danger, colors.primaryLight],
    info: [colors.info, "#E0F2FE"],
    neutral: [colors.textMuted, colors.surfaceMuted],
  } as const;
  const [textColor, bgColor] = palette[tone];

  return (
    <View style={[styles.pill, { backgroundColor: bgColor }]}>
      <View style={[styles.pillDot, { backgroundColor: textColor }]} />
      <Text style={[styles.pillText, { color: textColor }]}>{label}</Text>
    </View>
  );
}

export function Avatar({
  name,
  tone = "primary",
  size = 48,
  imageUri,
  onPress,
}: {
  name: string;
  tone?: "primary" | "secondary";
  size?: number;
  imageUri?: string | null;
  onPress?: () => void;
}) {
  const initial = name.trim().charAt(0).toUpperCase() || "U";

  const avatar = (
    <View
      style={[
        styles.avatar,
        {
          width: size,
          height: size,
          borderRadius: Math.min(28, size / 3),
          backgroundColor: tone === "primary" ? colors.primaryLight : colors.secondaryLight,
        },
      ]}
    >
      {imageUri ? (
        <Image
          source={{ uri: imageUri }}
          style={[
            styles.avatarImage,
            {
              width: size,
              height: size,
              borderRadius: Math.min(28, size / 3),
            },
          ]}
        />
      ) : (
        <Text
          style={[
            styles.avatarText,
            { color: tone === "primary" ? colors.primary : colors.secondary },
          ]}
        >
          {initial}
        </Text>
      )}
    </View>
  );

  if (!onPress) {
    return avatar;
  }

  return (
    <Pressable onPress={onPress} style={({ pressed }) => pressed && styles.pressed}>
      {avatar}
    </Pressable>
  );
}

export function MiniMap({
  height = 132,
  latitude,
  longitude,
  operatorLatitude,
  operatorLongitude,
}: {
  height?: number;
  latitude?: number | null;
  longitude?: number | null;
  operatorLatitude?: number | null;
  operatorLongitude?: number | null;
}) {
  const hasLocation =
    typeof latitude === "number" && typeof longitude === "number";
  const hasOperatorLocation =
    typeof operatorLatitude === "number" && typeof operatorLongitude === "number";

  if (hasLocation && Platform.OS !== "web") {
    return (
      <View style={[styles.map, { height }]}>
        <MapView
          style={styles.liveMap}
          initialRegion={{
            latitude,
            longitude,
            latitudeDelta: 0.012,
            longitudeDelta: 0.012,
          }}
          region={{
            latitude,
            longitude,
            latitudeDelta: 0.012,
            longitudeDelta: 0.012,
          }}
          scrollEnabled={height > 150}
          zoomEnabled={height > 150}
          pitchEnabled={false}
          rotateEnabled={false}
        >
          <Marker
            coordinate={{ latitude, longitude }}
            title="Lokasi pelapor"
            pinColor={colors.danger}
          />
          {hasOperatorLocation && (
            <Marker
              coordinate={{
                latitude: operatorLatitude,
                longitude: operatorLongitude,
              }}
              title="Operator"
              pinColor={colors.success}
            />
          )}
        </MapView>
      </View>
    );
  }

  return (
    <View style={[styles.map, { height }]}>
      <View style={[styles.road, styles.roadA]} />
      <View style={[styles.road, styles.roadB]} />
      <View style={[styles.road, styles.roadC]} />
      <View style={[styles.mapPin, styles.mapPinUser]}>
        <MaterialCommunityIcons name="account" size={15} color={colors.textInverse} />
      </View>
      <View style={[styles.mapPin, styles.mapPinHelp]}>
        <MaterialCommunityIcons name="ambulance" size={15} color={colors.textInverse} />
      </View>
      <View style={[styles.mapPin, styles.mapPinAlert]}>
        <MaterialCommunityIcons name="map-marker" size={16} color={colors.textInverse} />
      </View>
    </View>
  );
}

export function InfoGrid({
  items,
}: {
  items: { label: string; value: string }[];
}) {
  return (
    <View style={styles.infoGrid}>
      {items.map((item) => (
        <View key={`${item.label}-${item.value}`} style={styles.infoBox}>
          <Text style={styles.infoLabel}>{item.label}</Text>
          <Text style={styles.infoValue}>{item.value}</Text>
        </View>
      ))}
    </View>
  );
}

export function FieldCard({
  label,
  placeholder,
  value,
  onChangeText,
  secureTextEntry,
}: {
  label: string;
  placeholder: string;
  value: string;
  onChangeText: (value: string) => void;
  secureTextEntry?: boolean;
}) {
  return (
    <Card style={styles.fieldCard}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        style={styles.fieldInput}
        placeholder={placeholder}
        placeholderTextColor="#CBD5E1"
        value={value}
        onChangeText={onChangeText}
        secureTextEntry={secureTextEntry}
      />
    </Card>
  );
}

export function ChatBubble({
  children,
  mine,
}: {
  children: React.ReactNode;
  mine?: boolean;
}) {
  return (
    <View style={[styles.chatBubble, mine && styles.chatBubbleMine]}>
      <Text style={[styles.chatText, mine && styles.chatTextMine]}>
        {children}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 116,
  },
  fixed: {
    flex: 1,
  },
  content: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    gap: spacing.lg,
  },
  contentFixed: {
    flex: 1,
  },
  header: {
    minHeight: 68,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  headerText: {
    flex: 1,
  },
  eyebrow: {
    ...typography.micro,
    color: colors.secondary,
    textTransform: "uppercase",
    letterSpacing: 1.4,
  },
  title: {
    ...typography.h1,
    color: colors.text,
    marginTop: spacing.xs,
  },
  subtitle: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: spacing.xs,
    lineHeight: 19,
  },
  bottomWrap: {
    position: "absolute",
    left: spacing.lg,
    right: spacing.lg,
    bottom: spacing.md,
  },
  bottomNav: {
    minHeight: 64,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 18,
    ...shadow.md,
  },
  navItem: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 3,
    minHeight: 56,
  },
  navLabel: {
    fontSize: 10,
    color: colors.textSubtle,
  },
  navLabelActive: {
    color: colors.primary,
    fontWeight: "700",
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  pressed: {
    opacity: 0.82,
    transform: [{ scale: 0.98 }],
  },
  actionButton: {
    minHeight: 48,
    borderRadius: 14,
    paddingHorizontal: spacing.lg,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    backgroundColor: colors.primary,
  },
  actionSecondary: {
    backgroundColor: "#2F80C5",
  },
  actionSoft: {
    backgroundColor: "#EFF6FF",
    borderWidth: 1,
    borderColor: "#BFDBFE",
  },
  actionDanger: {
    backgroundColor: colors.danger,
  },
  actionText: {
    ...typography.button,
    color: colors.textInverse,
  },
  actionTextSoft: {
    color: colors.primary,
  },
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: spacing.lg,
    ...shadow.sm,
  },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: radius.full,
  },
  pillDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  pillText: {
    fontSize: 11,
    fontWeight: "700",
  },
  avatar: {
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  avatarImage: {
    resizeMode: "cover",
  },
  avatarText: {
    fontSize: 16,
    fontWeight: "800",
  },
  map: {
    overflow: "hidden",
    borderRadius: radius.lg,
    backgroundColor: "#EAF8F6",
  },
  liveMap: {
    flex: 1,
  },
  road: {
    position: "absolute",
    height: 12,
    borderRadius: 999,
    backgroundColor: "rgba(46, 125, 101, 0.16)",
  },
  roadA: {
    width: 260,
    top: 30,
    left: -54,
    transform: [{ rotate: "20deg" }],
  },
  roadB: {
    width: 260,
    top: 82,
    right: -36,
    transform: [{ rotate: "-18deg" }],
  },
  roadC: {
    width: 240,
    top: 60,
    left: 90,
    backgroundColor: "rgba(96, 165, 250, 0.18)",
    transform: [{ rotate: "98deg" }],
  },
  mapPin: {
    position: "absolute",
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    ...shadow.sm,
  },
  mapPinUser: {
    left: "38%",
    top: "47%",
    backgroundColor: "#2F80C5",
  },
  mapPinHelp: {
    left: "55%",
    top: "34%",
    backgroundColor: colors.success,
  },
  mapPinAlert: {
    left: "68%",
    top: "22%",
    backgroundColor: colors.danger,
  },
  infoGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  infoBox: {
    flexGrow: 1,
    flexBasis: "46%",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    backgroundColor: "#F8FEFF",
  },
  infoLabel: {
    fontSize: 11,
    color: colors.textSubtle,
    marginBottom: spacing.xs,
  },
  infoValue: {
    ...typography.bodyStrong,
    color: colors.text,
  },
  fieldCard: {
    gap: spacing.sm,
  },
  fieldLabel: {
    ...typography.bodyStrong,
    color: colors.text,
    textAlign: "center",
  },
  fieldInput: {
    minHeight: 44,
    borderRadius: radius.md,
    backgroundColor: "#3F4444",
    color: colors.textInverse,
    paddingHorizontal: spacing.lg,
    textAlign: "center",
  },
  chatBubble: {
    maxWidth: "82%",
    alignSelf: "flex-start",
    borderRadius: 18,
    borderTopLeftRadius: 8,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chatBubbleMine: {
    alignSelf: "flex-end",
    borderTopLeftRadius: 18,
    borderTopRightRadius: 8,
    backgroundColor: "#E8F4FF",
    borderColor: "#BFDBFE",
  },
  chatText: {
    ...typography.caption,
    color: colors.text,
    lineHeight: 19,
  },
  chatTextMine: {
    color: colors.secondaryDark,
  },
});
