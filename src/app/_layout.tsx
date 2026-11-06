import { DarkTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { Text, View } from 'react-native';

import { colors } from '@/constants/theme';
import { isConfigured } from '@/lib/supabase';
import { AuthProvider, useAuth } from '@/providers/auth';

SplashScreen.preventAutoHideAsync();

const theme = {
  ...DarkTheme,
  colors: { ...DarkTheme.colors, background: colors.bg, card: colors.bg, primary: colors.accent, text: colors.text, border: colors.border },
};

function RootNavigator() {
  const { loading, session, profile } = useAuth();

  useEffect(() => {
    if (!loading) SplashScreen.hideAsync();
  }, [loading]);

  if (loading) return null;

  const signedIn = Boolean(session);
  const ready = signedIn && Boolean(profile);

  return (
    <Stack screenOptions={{ headerStyle: { backgroundColor: colors.bg }, headerTintColor: colors.text, headerShadowVisible: false }}>
      <Stack.Protected guard={!signedIn}>
        <Stack.Screen name="sign-in" options={{ headerShown: false }} />
      </Stack.Protected>
      <Stack.Protected guard={signedIn && !profile}>
        <Stack.Screen name="onboarding" options={{ headerShown: false }} />
      </Stack.Protected>
      <Stack.Protected guard={ready}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="workout/[id]" options={{ title: '', headerBackTitle: 'Back' }} />
      </Stack.Protected>
    </Stack>
  );
}

function NotConfigured() {
  return (
    <View style={{ flex: 1, backgroundColor: colors.bg, justifyContent: 'center', padding: 24, gap: 12 }}>
      <Text style={{ color: colors.text, fontSize: 22, fontWeight: '800' }}>Supabase isn't configured</Text>
      <Text style={{ color: colors.textMuted, fontSize: 15, lineHeight: 22 }}>
        Copy .env.example to .env.local, add your Supabase URL and anon key, then restart `npx expo start`.
      </Text>
    </View>
  );
}

export default function RootLayout() {
  useEffect(() => {
    if (!isConfigured) SplashScreen.hideAsync();
  }, []);

  return (
    <ThemeProvider value={theme}>
      <StatusBar style="light" />
      {isConfigured ? (
        <AuthProvider>
          <RootNavigator />
        </AuthProvider>
      ) : <NotConfigured />}
    </ThemeProvider>
  );
}
