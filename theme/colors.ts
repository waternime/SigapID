export const colors = {
  // Primary - emergency red
  primary: "#DC2626",
  primaryDark: "#991B1B",
  primaryLight: "#FEE2E2",

  // Secondary - trust blue
  secondary: "#1E3A8A",
  secondaryDark: "#1E293B",
  secondaryLight: "#DBEAFE",

  // Service-specific
  police: "#1E40AF",
  ambulance: "#DC2626",
  firefighter: "#EA580C",
  sos: "#B91C1C",

  // Status
  success: "#16A34A",
  warning: "#F59E0B",
  danger: "#DC2626",
  info: "#0EA5E9",

  // Neutrals
  bg: "#F8FAFC",
  bgElevated: "#FFFFFF",
  bgDark: "#0F172A",
  surface: "#FFFFFF",
  surfaceMuted: "#F1F5F9",

  border: "#E2E8F0",
  borderStrong: "#CBD5E1",

  text: "#0F172A",
  textMuted: "#475569",
  textSubtle: "#94A3B8",
  textInverse: "#FFFFFF",

  // Functional
  overlay: "rgba(15, 23, 42, 0.6)",
  shadow: "rgba(15, 23, 42, 0.08)",
  shadowStrong: "rgba(15, 23, 42, 0.18)",
} as const;

export type ColorKey = keyof typeof colors;
