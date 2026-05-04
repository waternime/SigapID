import { ActivityIndicator, View } from "react-native";
import { Href, Redirect } from "expo-router";
import { useAuth } from "@/hooks/useAuth";
import { colors } from "@/theme";

export default function AppStartScreen() {
  const { initializing, session, profile } = useAuth();

  if (initializing) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: colors.bg,
        }}
      >
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!session || !profile) {
    return <Redirect href="/auth/LoginScreen" />;
  }

  if (profile.role === "dispatcher") {
    return <Redirect href={"/operator/dashboard" as Href} />;
  }

  return <Redirect href={"/reporter/dashboard" as Href} />;
}
