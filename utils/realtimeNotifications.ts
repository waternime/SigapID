import { Platform } from "react-native";
import * as Notifications from "expo-notifications";
import { colors } from "@/theme";

export const realtimeAlertChannelId = "sigapid-realtime-alerts";

let configured = false;

export async function configureRealtimeNotifications() {
  if (configured || Platform.OS === "web") return;

  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync(realtimeAlertChannelId, {
      name: "Laporan dan panggilan",
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 180, 250],
      lightColor: colors.primary,
      enableVibrate: true,
      enableLights: true,
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
    });
  }

  configured = true;
}

export async function requestRealtimeNotificationPermission() {
  if (Platform.OS === "web") return false;

  const currentPermission = await Notifications.getPermissionsAsync();
  const finalPermission = currentPermission.granted
    ? currentPermission
    : await Notifications.requestPermissionsAsync();

  if (finalPermission.granted) {
    await configureRealtimeNotifications();
  }

  return finalPermission.granted;
}

export async function showRealtimeNotification({
  title,
  body,
  data,
}: {
  title: string;
  body: string;
  data?: Record<string, unknown>;
}) {
  const granted = await requestRealtimeNotificationPermission();

  if (!granted) return;

  await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      sound: "default",
      priority: Notifications.AndroidNotificationPriority.HIGH,
      color: colors.primary,
      vibrate: [0, 250, 180, 250],
      data,
    },
    trigger: Platform.OS === "android" ? { channelId: realtimeAlertChannelId } : null,
  });
}
