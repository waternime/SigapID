import Constants from "expo-constants";
import { Alert } from "react-native";

export function isExpoGo() {
  return Constants.appOwnership === "expo";
}

export function showApkOnlyFeature(featureName: string) {
  Alert.alert(
    featureName,
    `${featureName} akan aktif di build APK. Di Expo Go fitur ini dikunci supaya testing chat dan maps tetap stabil.`,
  );
}
