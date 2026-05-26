import { Stack } from "expo-router";
import { useShakeEmergencyAlert } from "@/hooks/useShakeEmergencyAlert";

export default function ReporterLayout() {
  useShakeEmergencyAlert();

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="dashboard" />
      <Stack.Screen name="family-detail" />
      <Stack.Screen name="add-family" />
      <Stack.Screen name="tracking" />
      <Stack.Screen name="chat" />
      <Stack.Screen name="call" />
      <Stack.Screen name="emergency-alert" />
      <Stack.Screen name="history" />
      <Stack.Screen name="profile" />
    </Stack>
  );
}
