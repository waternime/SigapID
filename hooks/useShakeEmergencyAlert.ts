import { useEffect, useRef } from "react";
import { AppState } from "react-native";
import { router, usePathname } from "expo-router";
import { Accelerometer } from "expo-sensors";

const updateIntervalMs = 180;
const shakeThreshold = 2.65;
const triggerCooldownMs = 18_000;

export function useShakeEmergencyAlert() {
  const pathname = usePathname();
  const pathnameRef = useRef(pathname);
  const lastTriggerAtRef = useRef(0);

  useEffect(() => {
    pathnameRef.current = pathname;
  }, [pathname]);

  useEffect(() => {
    let appIsActive = true;

    Accelerometer.setUpdateInterval(updateIntervalMs);

    const appStateSubscription = AppState.addEventListener("change", (state) => {
      appIsActive = state === "active";
    });

    const sensorSubscription = Accelerometer.addListener(({ x, y, z }) => {
      if (!appIsActive) return;
      if (pathnameRef.current.includes("/emergency-alert")) return;

      const now = Date.now();
      if (now - lastTriggerAtRef.current < triggerCooldownMs) return;

      const force = Math.sqrt(x * x + y * y + z * z);

      if (force >= shakeThreshold) {
        lastTriggerAtRef.current = now;
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
  }, []);
}
