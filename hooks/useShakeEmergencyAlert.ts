import { useEffect, useRef } from "react";
import { AppState } from "react-native";
import { router, usePathname } from "expo-router";
import { Accelerometer } from "expo-sensors";
import { useShakeDetectionSettings } from "@/hooks/useShakeDetectionSettings";
import { showShakeAlertNotification } from "@/utils/shakeAlertNotifications";

const updateIntervalMs = 180;
const freeFallThreshold = 0.55;
const impactThreshold = 2.85;
const hardImpactThreshold = 3.7;
const freeFallWindowMs = 1300;
const triggerCooldownMs = 18_000;
let suppressedUntil = 0;

export function snoozeShakeEmergencyAlert(durationMs = 30_000) {
  suppressedUntil = Math.max(suppressedUntil, Date.now() + durationMs);
}

export function useShakeEmergencyAlert() {
  const pathname = usePathname();
  const { enabled, loading } = useShakeDetectionSettings();
  const pathnameRef = useRef(pathname);
  const lastTriggerAtRef = useRef(0);
  const lastFreeFallAtRef = useRef(0);
  const appStateRef = useRef(AppState.currentState);

  useEffect(() => {
    pathnameRef.current = pathname;
  }, [pathname]);

  useEffect(() => {
    if (loading || !enabled) return;

    Accelerometer.setUpdateInterval(updateIntervalMs);

    const appStateSubscription = AppState.addEventListener("change", (state) => {
      appStateRef.current = state;
    });

    const sensorSubscription = Accelerometer.addListener(({ x, y, z }) => {
      if (pathnameRef.current.includes("/emergency-alert")) return;

      const now = Date.now();
      if (now < suppressedUntil) return;
      if (now - lastTriggerAtRef.current < triggerCooldownMs) return;

      const force = Math.sqrt(x * x + y * y + z * z);
      const recentFreeFall = now - lastFreeFallAtRef.current <= freeFallWindowMs;
      const fallLikeImpact = force >= impactThreshold && recentFreeFall;
      const hardImpact = force >= hardImpactThreshold;

      if (force <= freeFallThreshold) {
        lastFreeFallAtRef.current = now;
        return;
      }

      if (!fallLikeImpact && !hardImpact) return;

      lastTriggerAtRef.current = now;
      showShakeAlertNotification().catch(() => undefined);

      if (appStateRef.current === "active") {
        router.push({
          pathname: "/reporter/emergency-alert",
          params: { source: "shake" },
        });
      }
    });

    return () => {
      appStateSubscription.remove();
      sensorSubscription.remove();
    };
  }, [enabled, loading]);
}
