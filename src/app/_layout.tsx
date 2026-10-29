import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useColorScheme } from 'react-native';

import { AuthProvider, useAuth } from '@/auth/auth-provider';
import { Button } from '@/components/button';
import { StatusView } from '@/components/status-view';
import { ThemedText } from '@/components/themed-text';

const queryClient = new QueryClient();

export default function RootLayout() {
  const colorScheme = useColorScheme();
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
          <StatusBar style="auto" />
          <RootNavigator />
        </ThemeProvider>
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
      </Stack.Protected>
    </Stack>
  );
}
