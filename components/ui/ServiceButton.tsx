import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { colors, radius, shadow, spacing, typography } from "@/theme";
import { EmergencyType } from "@/types";
import { useAppTheme } from "@/hooks/useAppTheme";

type ServiceType = Exclude<EmergencyType, "sos">;
type IconName = React.ComponentProps<typeof MaterialCommunityIcons>["name"];

interface ServiceButtonProps {
  type: ServiceType;
  onPress: () => void;
  disabled?: boolean;
}

const config: Record<
  ServiceType,
  { label: string; icon: IconName; color: string; description: string }
> = {
  fire: {
    label: "Kebakaran",
    icon: "fire",
    color: colors.firefighter,
    description: "Api, asap, ledakan",
  },
  medical: {
    label: "Medis",
    icon: "medical-bag",
    color: colors.ambulance,
    description: "Kesehatan darurat",
  },
  crime: {
    label: "Kriminal",
    icon: "shield-alert-outline",
    color: colors.police,
    description: "Ancaman, kekerasan",
  },
  disaster: {
    label: "Bencana",
    icon: "weather-lightning",
    color: colors.warning,
    description: "Gempa, banjir, longsor",
  },
  police: {
    label: "Polisi",
    icon: "police-badge-outline",
    color: colors.police,
    description: "Kejahatan, gangguan",
  },
  ambulance: {
    label: "Ambulans",
    icon: "ambulance",
    color: colors.ambulance,
    description: "Medis darurat",
  },
  firefighter: {
    label: "Pemadam",
    icon: "fire-truck",
    color: colors.firefighter,
    description: "Kebakaran",
  },
};

export const ServiceButton: React.FC<ServiceButtonProps> = ({
  type,
  onPress,
  disabled,
}) => {
  const { palette } = useAppTheme();
  const c = config[type];
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.btn,
        { backgroundColor: palette.card, borderColor: palette.border },
        shadow.sm,
        pressed && !disabled && styles.pressed,
        disabled && { opacity: 0.5 },
      ]}
    >
      <View style={[styles.iconBubble, { backgroundColor: `${c.color}1A` }]}>
        <MaterialCommunityIcons name={c.icon} size={28} color={c.color} />
      </View>
      <Text style={[typography.bodyStrong, { color: palette.text }]}>
        {c.label}
      </Text>
      <Text style={[typography.caption, styles.desc, { color: palette.subtle }]}>
        {c.description}
      </Text>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  btn: {
    flex: 1,
    borderRadius: radius.xl,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.md,
    alignItems: "center",
    borderWidth: 1,
  },
  pressed: { transform: [{ scale: 0.97 }] },
  iconBubble: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.sm,
  },
  desc: {
    marginTop: 2,
    textAlign: "center",
  },
});
