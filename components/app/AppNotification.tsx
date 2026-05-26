import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Animated,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAppTheme } from "@/hooks/useAppTheme";
import { colors, radius, shadow, spacing, typography } from "@/theme";

type NotificationTone = "success" | "danger" | "info" | "warning";

type NotificationPayload = {
  title: string;
  message?: string;
  tone?: NotificationTone;
  durationMs?: number;
};

type NotificationContextValue = {
  showNotification: (payload: NotificationPayload) => void;
  hideNotification: () => void;
};

const NotificationContext = createContext<NotificationContextValue | null>(null);

const toneMeta: Record<
  NotificationTone,
  {
    icon: React.ComponentProps<typeof MaterialCommunityIcons>["name"];
    color: string;
    background: string;
  }
> = {
  success: {
    icon: "check-circle-outline",
    color: colors.success,
    background: "#ECFDF5",
  },
  danger: {
    icon: "alert-circle-outline",
    color: colors.danger,
    background: "#FFF7F7",
  },
  info: {
    icon: "information-outline",
    color: colors.info,
    background: "#E0F2FE",
  },
  warning: {
    icon: "alert-outline",
    color: colors.warning,
    background: "#FFFBEB",
  },
};

export function AppNotificationProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { palette, mode } = useAppTheme();
  const insets = useSafeAreaInsets();
  const [notification, setNotification] = useState<NotificationPayload | null>(null);
  const translateY = useRef(new Animated.Value(-120)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const hideNotification = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }

    Animated.parallel([
      Animated.timing(translateY, {
        toValue: -120,
        duration: 180,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 160,
        useNativeDriver: true,
      }),
    ]).start(({ finished }) => {
      if (finished) {
        setNotification(null);
      }
    });
  }, [opacity, translateY]);

  const showNotification = useCallback(
    (payload: NotificationPayload) => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }

      setNotification({
        tone: "info",
        durationMs: 2800,
        ...payload,
      });

      Animated.parallel([
        Animated.spring(translateY, {
          toValue: 0,
          damping: 17,
          stiffness: 180,
          mass: 0.7,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 160,
          useNativeDriver: true,
        }),
      ]).start();

      timerRef.current = setTimeout(() => {
        hideNotification();
      }, payload.durationMs ?? 2800);
    },
    [hideNotification, opacity, translateY],
  );

  useEffect(
    () => () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    },
    [],
  );

  const value = useMemo(
    () => ({ showNotification, hideNotification }),
    [hideNotification, showNotification],
  );

  const tone = notification?.tone ?? "info";
  const meta = toneMeta[tone];
  const cardBackground =
    mode === "dark" ? palette.card : meta.background;

  return (
    <NotificationContext.Provider value={value}>
      {children}
      {!!notification && (
        <View pointerEvents="box-none" style={StyleSheet.absoluteFill}>
          <Animated.View
            style={[
              styles.wrap,
              {
                paddingTop: insets.top + spacing.sm,
                opacity,
                transform: [{ translateY }],
              },
            ]}
          >
            <Pressable
              onPress={hideNotification}
              style={[
                styles.card,
                {
                  backgroundColor: cardBackground,
                  borderColor: mode === "dark" ? palette.borderStrong : `${meta.color}55`,
                },
              ]}
            >
              <View style={[styles.iconWrap, { backgroundColor: `${meta.color}1F` }]}>
                <MaterialCommunityIcons
                  name={meta.icon}
                  size={24}
                  color={meta.color}
                />
              </View>
              <View style={styles.textBlock}>
                <Text style={[styles.title, { color: palette.text }]}>
                  {notification.title}
                </Text>
                {!!notification.message && (
                  <Text style={[styles.message, { color: palette.muted }]}>
                    {notification.message}
                  </Text>
                )}
              </View>
              <MaterialCommunityIcons
                name="close"
                size={18}
                color={palette.subtle}
              />
            </Pressable>
          </Animated.View>
        </View>
      )}
    </NotificationContext.Provider>
  );
}

export function useAppNotification() {
  const value = useContext(NotificationContext);

  if (!value) {
    throw new Error("useAppNotification must be used inside AppNotificationProvider");
  }

  return value;
}

const styles = StyleSheet.create({
  wrap: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
    paddingHorizontal: spacing.lg,
  },
  card: {
    minHeight: 74,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    ...shadow.md,
  },
  iconWrap: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
  },
  textBlock: {
    flex: 1,
    gap: 2,
  },
  title: {
    ...typography.bodyStrong,
  },
  message: {
    ...typography.caption,
    lineHeight: 17,
  },
});
