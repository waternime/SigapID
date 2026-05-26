import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";
import type React from "react";
import { colors } from "@/theme";

export type AppThemeMode = "light" | "dark";

export const appPalettes = {
  light: {
    mode: "light",
    background: colors.bg,
    surface: colors.surface,
    surfaceMuted: colors.surfaceMuted,
    card: colors.surface,
    cardSoft: "#F8FEFF",
    border: colors.border,
    borderStrong: colors.borderStrong,
    rowBorder: "rgba(226, 232, 240, 0.9)",
    text: colors.text,
    muted: colors.textMuted,
    subtle: colors.textSubtle,
    inverse: colors.textInverse,
    primary: colors.primary,
    primarySoft: colors.primaryLight,
    secondary: colors.secondary,
    secondarySoft: colors.secondaryLight,
    bottomNav: colors.surface,
    input: colors.surface,
    toggle: colors.surfaceMuted,
    mapFallback: "#EAF8F6",
    shadow: colors.shadow,
  },
  dark: {
    mode: "dark",
    background: "#0F172A",
    surface: "#172033",
    surfaceMuted: "#243244",
    card: "#172033",
    cardSoft: "#1E293B",
    border: "rgba(148, 163, 184, 0.28)",
    borderStrong: "rgba(203, 213, 225, 0.35)",
    rowBorder: "rgba(148, 163, 184, 0.22)",
    text: "#F8FAFC",
    muted: "#CBD5E1",
    subtle: "#94A3B8",
    inverse: colors.textInverse,
    primary: "#F87171",
    primarySoft: "rgba(248, 113, 113, 0.16)",
    secondary: "#93C5FD",
    secondarySoft: "rgba(147, 197, 253, 0.16)",
    bottomNav: "#111827",
    input: "#111827",
    toggle: "#243244",
    mapFallback: "#163037",
    shadow: "rgba(0, 0, 0, 0.35)",
  },
} as const;

export type AppPalette = (typeof appPalettes)[AppThemeMode];

type AppThemeValue = {
  mode: AppThemeMode;
  palette: AppPalette;
  setMode: (mode: AppThemeMode) => void;
  toggleMode: () => void;
};

const AppThemeContext = createContext<AppThemeValue | null>(null);

export function AppThemeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setMode] = useState<AppThemeMode>("light");

  const toggleMode = useCallback(() => {
    setMode((current) => (current === "dark" ? "light" : "dark"));
  }, []);

  const value = useMemo(
    () => ({
      mode,
      palette: appPalettes[mode],
      setMode,
      toggleMode,
    }),
    [mode, toggleMode],
  );

  return (
    <AppThemeContext.Provider value={value}>
      {children}
    </AppThemeContext.Provider>
  );
}

export function useAppTheme() {
  const value = useContext(AppThemeContext);

  if (!value) {
    throw new Error("useAppTheme must be used inside AppThemeProvider");
  }

  return value;
}
