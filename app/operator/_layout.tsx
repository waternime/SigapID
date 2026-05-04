import { Stack } from "expo-router";
import { useOperatorPresence } from "@/hooks/useOperatorPresence";

export default function OperatorLayout() {
  useOperatorPresence();

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="dashboard" />
      <Stack.Screen name="report-detail" />
      <Stack.Screen name="chat" />
      <Stack.Screen name="history" />
      <Stack.Screen name="profile" />
    </Stack>
  );
}
