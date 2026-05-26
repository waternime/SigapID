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
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Href, router } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import MapView, { Marker, Polyline } from "react-native-maps";
import { colors, radius, shadow, spacing, typography } from "@/theme";
import { useAppTheme } from "@/hooks/useAppTheme";

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
  backgroundColor,
  titleColor,
  subtitleColor,
  scroll = true,
}: {
  role: Role;
  activeTab?: ReporterTab | OperatorTab;
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  backgroundColor?: string;
  titleColor?: string;
  subtitleColor?: string;
  scroll?: boolean;
}) {
  const { palette } = useAppTheme();
  const insets = useSafeAreaInsets();
  const screenBackground = backgroundColor ?? palette.background;
  const resolvedTitleColor = titleColor ?? palette.text;
  const resolvedSubtitleColor = subtitleColor ?? palette.muted;
  const scrollPaddingBottom = (activeTab ? 116 : spacing.xl) + insets.bottom;
  const content = (
    <View style={[styles.content, !scroll && styles.contentFixed]}>
      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text style={[styles.title, { color: resolvedTitleColor }]}>{title}</Text>
          {!!subtitle && (
            <Text style={[styles.subtitle, { color: resolvedSubtitleColor }]}>
              {subtitle}
            </Text>
          )}
        </View>
        {action}
      </View>
      {children}
    </View>
  );

  return (
    <SafeAreaView
      style={[styles.safe, { backgroundColor: screenBackground }]}
      edges={["top", "bottom"]}
    >
      {scroll ? (
        <ScrollView
          style={[styles.scroll, { backgroundColor: screenBackground }]}
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: scrollPaddingBottom },
          ]}
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
  const { palette } = useAppTheme();
  const insets = useSafeAreaInsets();
  const items = role === "reporter" ? reporterNavItems : operatorNavItems;
  const bottomOffset = Math.max(spacing.md, insets.bottom + spacing.sm);

  return (
    <View style={[styles.bottomWrap, { bottom: bottomOffset }]}>
      <View
        style={[
          styles.bottomNav,
          { backgroundColor: palette.bottomNav, borderColor: palette.border },
        ]}
      >
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
                color={active ? colors.primary : palette.subtle}
              />
              <Text
                style={[
                  styles.navLabel,
                  { color: palette.subtle },
                  active && styles.navLabelActive,
                ]}
              >
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
  disabled = false,
}: {
  icon: IconName;
  onPress?: () => void;
  tone?: "neutral" | "primary" | "secondary" | "danger";
  disabled?: boolean;
}) {
  const { palette } = useAppTheme();
  const color = disabled
    ? palette.subtle
    : tone === "danger"
      ? colors.danger
      : tone === "secondary"
        ? palette.secondary
        : tone === "primary"
          ? colors.primary
          : palette.text;

  return (
    <Pressable
      disabled={disabled}
      onPress={disabled ? undefined : onPress ?? (() => showComingSoon("Aksi"))}
      accessibilityState={{ disabled }}
      style={({ pressed }) => [
        styles.iconButton,
        { backgroundColor: palette.surface, borderColor: palette.border },
        pressed && !disabled && styles.pressed,
        disabled && styles.disabledControl,
      ]}
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
  disabled = false,
}: {
  label: string;
  icon?: IconName;
  onPress: () => void;
  tone?: "primary" | "secondary" | "soft" | "danger";
  style?: StyleProp<ViewStyle>;
  disabled?: boolean;
}) {
  const { palette } = useAppTheme();
  const textColor = tone === "soft" ? colors.primary : colors.textInverse;
  const resolvedTextColor = disabled ? palette.subtle : textColor;

  return (
    <Pressable
      disabled={disabled}
      onPress={disabled ? undefined : onPress}
      accessibilityState={{ disabled }}
      style={({ pressed }) => [
        styles.actionButton,
        tone === "primary" && { backgroundColor: colors.primary },
        tone === "secondary" && { backgroundColor: "#2F80C5" },
        tone === "soft" && {
          backgroundColor: palette.secondarySoft,
          borderWidth: 1,
          borderColor: palette.borderStrong,
        },
        tone === "danger" && { backgroundColor: colors.danger },
        pressed && !disabled && styles.pressed,
        disabled && styles.disabledControl,
        style,
      ]}
    >
      {!!icon && (
        <MaterialCommunityIcons
          name={icon}
          size={18}
          color={resolvedTextColor}
        />
      )}
      <Text
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.72}
        style={[
          styles.actionText,
          { color: resolvedTextColor },
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
  const { palette } = useAppTheme();

  return (
    <View
      style={[
        styles.card,
        { backgroundColor: palette.card, borderColor: palette.border },
        style,
      ]}
    >
      {children}
    </View>
  );
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
  const { palette } = useAppTheme();
  const initial = name.trim().charAt(0).toUpperCase() || "U";

  const avatar = (
    <View
      style={[
        styles.avatar,
        {
          width: size,
          height: size,
          borderRadius: Math.min(28, size / 3),
          backgroundColor: tone === "primary" ? palette.primarySoft : palette.secondarySoft,
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
            { color: tone === "primary" ? colors.primary : palette.secondary },
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
  const { palette } = useAppTheme();
  const hasLocation =
    typeof latitude === "number" && typeof longitude === "number";
  const hasOperatorLocation =
    typeof operatorLatitude === "number" && typeof operatorLongitude === "number";
  const nativeMapEnabled =
    Platform.OS !== "web" &&
    hasLocation &&
    (Platform.OS !== "android" || !!process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY);
  const mapRegion =
    hasLocation && hasOperatorLocation
      ? {
          latitude: (latitude + operatorLatitude) / 2,
          longitude: (longitude + operatorLongitude) / 2,
          latitudeDelta: Math.max(0.012, Math.abs(latitude - operatorLatitude) * 2.4),
          longitudeDelta: Math.max(0.012, Math.abs(longitude - operatorLongitude) * 2.4),
        }
      : hasLocation
        ? {
            latitude,
            longitude,
            latitudeDelta: 0.012,
            longitudeDelta: 0.012,
          }
        : null;
  const routeCoordinates =
    hasLocation && hasOperatorLocation
      ? [
          { latitude: operatorLatitude, longitude: operatorLongitude },
          { latitude, longitude },
        ]
      : [];

  if (nativeMapEnabled) {
    return (
      <View style={[styles.map, { height }]}>
        <MapView
          style={styles.liveMap}
          initialRegion={mapRegion ?? undefined}
          region={mapRegion ?? undefined}
          scrollEnabled={height > 150}
          zoomEnabled={height > 150}
          pitchEnabled={false}
          rotateEnabled={false}
        >
          {routeCoordinates.length > 0 && (
            <Polyline
              coordinates={routeCoordinates}
              strokeColor={colors.secondary}
              strokeWidth={5}
              lineDashPattern={[1]}
              lineCap="round"
            />
          )}
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
              title="Unit bantuan"
              pinColor={colors.success}
            />
          )}
        </MapView>
      </View>
    );
  }

  return (
    <View style={[styles.map, { height, backgroundColor: palette.mapFallback }]}>
      <View style={[styles.road, styles.roadA]} />
      <View style={[styles.road, styles.roadB]} />
      <View style={[styles.road, styles.roadC]} />
      {hasLocation && hasOperatorLocation && (
        <View style={styles.routeLineFallback} />
      )}
      <View style={[styles.mapPin, styles.mapPinUser]}>
        <MaterialCommunityIcons name="account" size={15} color={colors.textInverse} />
      </View>
      <View style={[styles.mapPin, styles.mapPinHelp]}>
        <MaterialCommunityIcons name="ambulance" size={15} color={colors.textInverse} />
      </View>
      <View style={[styles.mapPin, styles.mapPinAlert]}>
        <MaterialCommunityIcons name="map-marker" size={16} color={colors.textInverse} />
      </View>
      <View style={styles.mapStatus}>
        <Text style={styles.mapStatusLine}>
          {hasLocation
            ? `Pelapor ${latitude.toFixed(5)}, ${longitude.toFixed(5)}`
            : "Menunggu GPS pelapor"}
        </Text>
        <Text style={styles.mapStatusLine}>
          {hasOperatorLocation
            ? `Unit ${operatorLatitude.toFixed(5)}, ${operatorLongitude.toFixed(5)}`
            : "Lokasi unit belum aktif"}
        </Text>
      </View>
    </View>
  );
}

export function InfoGrid({
  items,
}: {
  items: { label: string; value: string }[];
}) {
  const { palette } = useAppTheme();

  return (
    <View style={styles.infoGrid}>
      {items.map((item) => (
        <View
          key={`${item.label}-${item.value}`}
          style={[
            styles.infoBox,
            { backgroundColor: palette.cardSoft, borderColor: palette.border },
          ]}
        >
          <Text style={[styles.infoLabel, { color: palette.subtle }]}>
            {item.label}
          </Text>
          <Text style={[styles.infoValue, { color: palette.text }]}>
            {item.value}
          </Text>
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
  const { palette } = useAppTheme();

  return (
    <Card style={styles.fieldCard}>
      <Text style={[styles.fieldLabel, { color: palette.text }]}>{label}</Text>
      <TextInput
        style={[
          styles.fieldInput,
          { backgroundColor: palette.input, color: palette.text },
        ]}
        placeholder={placeholder}
        placeholderTextColor={palette.subtle}
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
  const { palette } = useAppTheme();

  return (
    <View
      style={[
        styles.chatBubble,
        {
          backgroundColor: palette.card,
          borderColor: palette.border,
        },
        mine && [
          styles.chatBubbleMine,
          {
            backgroundColor: palette.secondarySoft,
            borderColor: palette.borderStrong,
          },
        ],
      ]}
    >
      <Text
        style={[
          styles.chatText,
          { color: mine ? palette.secondary : palette.text },
        ]}
      >
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
    marginTop: spacing.xs,
  },
  subtitle: {
    ...typography.caption,
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
  disabledControl: {
    opacity: 0.55,
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
    flexShrink: 1,
    textAlign: "center",
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
  routeLineFallback: {
    position: "absolute",
    width: "36%",
    height: 5,
    left: "42%",
    top: "45%",
    borderRadius: 999,
    backgroundColor: colors.secondary,
    opacity: 0.75,
    transform: [{ rotate: "-28deg" }],
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
  mapStatus: {
    position: "absolute",
    left: spacing.sm,
    right: spacing.sm,
    bottom: spacing.sm,
    gap: 3,
    borderRadius: radius.md,
    backgroundColor: "rgba(255, 255, 255, 0.86)",
    paddingHorizontal: spacing.sm,
    paddingVertical: 7,
  },
  mapStatusLine: {
    fontSize: 10,
    fontWeight: "700",
    color: colors.text,
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
