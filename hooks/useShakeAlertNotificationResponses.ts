import { useEffect } from "react";
import { router } from "expo-router";
import * as Notifications from "expo-notifications";
import { Href } from "expo-router";
import { snoozeShakeEmergencyAlert } from "@/hooks/useShakeEmergencyAlert";
import {
  configureShakeAlertNotifications,
  shakeAlertCancelActionId,
  shakeAlertNotificationKind,
  shakeAlertOpenActionId,
} from "@/utils/shakeAlertNotifications";

export function useShakeAlertNotificationResponses() {
  useEffect(() => {
    configureShakeAlertNotifications().catch(() => undefined);

    const subscription = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        const kind = response.notification.request.content.data?.kind;

        if (kind !== shakeAlertNotificationKind) return;

        if (response.actionIdentifier === shakeAlertCancelActionId) {
          snoozeShakeEmergencyAlert(60_000);
          return;
        }

        if (
          response.actionIdentifier === shakeAlertOpenActionId ||
          response.actionIdentifier === Notifications.DEFAULT_ACTION_IDENTIFIER
        ) {
          router.push("/reporter/emergency-alert" as Href);
        }
      },
    );

    return () => {
      subscription.remove();
    };
  }, []);
}
