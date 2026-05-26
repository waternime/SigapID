import { useCallback, useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { requestShakeAlertNotificationPermission } from "@/utils/shakeAlertNotifications";

const shakeDetectionStorageKey = "sigapid:shake-detection-enabled";
const defaultShakeDetectionEnabled = true;
const listeners = new Set<(enabled: boolean) => void>();

let cachedShakeDetectionEnabled: boolean | null = null;

function parseStoredValue(value: string | null) {
  if (value === "false") return false;
  if (value === "true") return true;
  return defaultShakeDetectionEnabled;
}

function emitShakeDetectionChange(enabled: boolean) {
  listeners.forEach((listener) => listener(enabled));
}

export async function getShakeDetectionEnabled() {
  if (cachedShakeDetectionEnabled !== null) {
    return cachedShakeDetectionEnabled;
  }

  const storedValue = await AsyncStorage.getItem(shakeDetectionStorageKey);
  const enabled = parseStoredValue(storedValue);
  cachedShakeDetectionEnabled = enabled;
  return enabled;
}

export async function saveShakeDetectionEnabled(enabled: boolean) {
  cachedShakeDetectionEnabled = enabled;
  await AsyncStorage.setItem(shakeDetectionStorageKey, enabled ? "true" : "false");

  if (enabled) {
    await requestShakeAlertNotificationPermission();
  }

  emitShakeDetectionChange(enabled);
}

export function useShakeDetectionSettings() {
  const [enabled, setEnabledState] = useState(defaultShakeDetectionEnabled);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    getShakeDetectionEnabled()
      .then((nextEnabled) => {
        if (mounted) {
          setEnabledState(nextEnabled);
        }
      })
      .finally(() => {
        if (mounted) {
          setLoading(false);
        }
      });

    const listener = (nextEnabled: boolean) => {
      setEnabledState(nextEnabled);
    };

    listeners.add(listener);

    return () => {
      mounted = false;
      listeners.delete(listener);
    };
  }, []);

  const setEnabled = useCallback(async (nextEnabled: boolean) => {
    setEnabledState(nextEnabled);
    await saveShakeDetectionEnabled(nextEnabled);
  }, []);

  return { enabled, loading, setEnabled };
}
