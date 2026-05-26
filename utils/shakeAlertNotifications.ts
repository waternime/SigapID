import { Platform } from "react-native";
import * as Notifications from "expo-notifications";
import { colors } from "@/theme";

export const shakeAlertCategoryId = "sigapid-shake-alert";
export const shakeAlertChannelId = "sigapid-emergency-alerts";
export const shakeAlertCancelActionId = "sigapid-shake-cancel";
export const shakeAlertOpenActionId = "sigapid-shake-open";
export const shakeAlertNotificationKind = "shake-alert";

let configured = false;

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    priority: Notifications.AndroidNotificationPriority.MAX,
  }),
});

export async function configureShakeAlertNotifications() {
  if (configured || Platform.OS === "web") return;

  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync(shakeAlertChannelId, {
      name: "Peringatan darurat",
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 500, 250, 500],
      lightColor: colors.danger,
      enableVibrate: true,
      enableLights: true,
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
    });
  }

  await Notifications.setNotificationCategoryAsync(shakeAlertCategoryId, [
    {
      identifier: shakeAlertCancelActionId,
      buttonTitle: "Batalkan",
      options: {
        isDestructive: true,
        opensAppToForeground: false,
      },
    },
    {
      identifier: shakeAlertOpenActionId,
      buttonTitle: "Buka",
      options: {
        opensAppToForeground: true,
      },
    },
  ]);

  configured = true;
}

export async function requestShakeAlertNotificationPermission() {
  if (Platform.OS === "web") return false;

  const currentPermission = await Notifications.getPermissionsAsync();
  const finalPermission = currentPermission.granted
    ? currentPermission
    : await Notifications.requestPermissionsAsync();

  if (finalPermission.granted) {
    await configureShakeAlertNotifications();
  }

  return finalPermission.granted;
}

export async function showShakeAlertNotification() {
  const granted = await requestShakeAlertNotificationPermission();

  if (!granted) return;

  await Notifications.scheduleNotificationAsync({
    content: {
      title: "Guncangan terdeteksi",
      body: "Jika ini tidak sengaja, tekan Batalkan. Jika tidak ada respons, buka SigapID.",
      sound: "default",
      priority: Notifications.AndroidNotificationPriority.MAX,
      color: colors.danger,
      vibrate: [0, 500, 250, 500],
      categoryIdentifier: shakeAlertCategoryId,
      data: {
        kind: shakeAlertNotificationKind,
      },
    },
    trigger: Platform.OS === "android" ? { channelId: shakeAlertChannelId } : null,
  });
}
