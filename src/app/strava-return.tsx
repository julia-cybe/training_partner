import { router, useLocalSearchParams } from 'expo-router';
import { useEffect } from 'react';
import { ActivityIndicator } from 'react-native';

import { Body, Button, Screen, Title } from '@/components/ui';
import { colors } from '@/constants/theme';

// Strava sends the browser back here after connecting (web). On iOS/Android the
// in-app browser session catches this URL and closes instead.
export default function StravaReturn() {
  const { strava, message } = useLocalSearchParams<{ strava?: string; message?: string }>();

  useEffect(() => {
    if (strava === 'connected') {
      const t = setTimeout(() => router.replace('/activities'), 800);
      return () => clearTimeout(t);
    }
  }, [strava]);

  return (
    <Screen>
      {strava === 'error' ? (
        <>
          <Title>Strava not connected</Title>
          <Body muted>{message ?? 'Something went wrong.'}</Body>
          <Button title="Back to activities" onPress={() => router.replace('/activities')} />
        </>
      ) : (
        <>
          <Title>Strava connected</Title>
          <ActivityIndicator color={colors.accent} />
        </>
      )}
    </Screen>
  );
}
