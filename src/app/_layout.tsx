import { QueryClientProvider } from '@tanstack/react-query';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useColorScheme } from 'react-native';

import { AdsProvider } from '@/ads/ads-provider';
import { AuthProvider, useAuth } from '@/auth/auth-provider';
import { Button } from '@/components/button';
import { StatusView } from '@/components/status-view';
import { ThemedText } from '@/components/themed-text';
import { queryClient } from '@/lib/query-client';
import { ProProvider } from '@/purchases/pro-provider';

export default function RootLayout() {
  const colorScheme = useColorScheme();
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ProProvider>
          <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
            <AdsProvider>
              <StatusBar style="auto" />
              <RootNavigator />
            </AdsProvider>
          </ThemeProvider>
        </ProProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

function RootNavigator() {
  const { status, profile, error, retry } = useAuth();

  if (status === 'unconfigured') {
    return (
      <StatusView
        emoji="🛠️"
        title="Supabase fehlt noch"
        message={
          <>
            Leg eine <ThemedText type="code">.env</ThemedText> an (Vorlage:{' '}
            <ThemedText type="code">.env.example</ThemedText>) und starte Expo neu. Details stehen
            im README.
          </>
        }
      />
    );
  }

  if (status === 'loading') {
    return <StatusView loading />;
  }

  if (status === 'error') {
    return (
      <StatusView
        emoji="📡"
        title="Keine Verbindung"
        message={error ?? 'Unbekannter Fehler'}
        action={<Button title="Nochmal versuchen" onPress={retry} />}
      />
    );
  }

  const onboarded = profile !== null;

  return (
    <Stack screenOptions={{ headerBackButtonDisplayMode: 'minimal' }}>
      <Stack.Protected guard={!onboarded}>
        <Stack.Screen name="(onboarding)/name" options={{ headerShown: false }} />
      </Stack.Protected>
      <Stack.Protected guard={onboarded}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="edit-profile" options={{ title: 'Profil bearbeiten', presentation: 'modal' }} />
        <Stack.Screen name="group/new" options={{ title: 'Neue Gruppe', presentation: 'modal' }} />
        <Stack.Screen name="group/[id]/index" options={{ title: '' }} />
        <Stack.Screen name="group/[id]/leaderboard" options={{ title: 'Rangliste' }} />
        <Stack.Screen name="join/index" options={{ title: 'Gruppe beitreten', presentation: 'modal' }} />
        <Stack.Screen name="join/[code]" options={{ title: 'Gruppe beitreten', presentation: 'modal' }} />
        <Stack.Screen name="bet/new" options={{ title: 'Neue Wette', presentation: 'modal' }} />
        <Stack.Screen name="bet/[id]" options={{ title: 'Wette' }} />
        <Stack.Screen name="pro" options={{ title: 'Pro', presentation: 'modal' }} />
      </Stack.Protected>
    </Stack>
  );
}
