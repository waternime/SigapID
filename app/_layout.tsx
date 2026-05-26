import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';
import { AuthProvider } from '@/hooks/useAuth';
import { AppThemeProvider, useAppTheme } from '@/hooks/useAppTheme';
import { AppNotificationProvider } from '@/components/app/AppNotification';
import { IncomingCallListener } from '@/hooks/useCallInvitations';
import { useShakeAlertNotificationResponses } from '@/hooks/useShakeAlertNotificationResponses';

export default function RootLayout() {
  return (
    <AppThemeProvider>
      <RootLayoutContent />
    </AppThemeProvider>
  );
}

function RootLayoutContent() {
  const { mode } = useAppTheme();
  useShakeAlertNotificationResponses();

  return (
    <ThemeProvider value={mode === 'dark' ? DarkTheme : DefaultTheme}>
      <AuthProvider>
        <AppNotificationProvider>
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="index" />
            <Stack.Screen name="auth/LoginScreen" options={{ title: 'Login' }} />
            <Stack.Screen name="auth/RegisterScreen" options={{ title: 'Daftar' }} />
            <Stack.Screen name="reporter" />
            <Stack.Screen name="operator" />
          </Stack>
          <IncomingCallListener />
        </AppNotificationProvider>
      </AuthProvider>
      <StatusBar style={mode === 'dark' ? 'light' : 'dark'} />
    </ThemeProvider>
  );
}
