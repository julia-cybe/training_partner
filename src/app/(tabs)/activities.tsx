import * as Linking from 'expo-linking';
import { useFocusEffect } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useCallback, useState } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';

import { ActivityRow } from '@/components/activity';
import { Body, Button, Card, Empty, ErrorText, errorMessage, Label, Screen, Title } from '@/components/ui';
import { colors, space } from '@/constants/theme';
import { disconnectStrava, getActivities, getStravaConnection, startStravaConnect, syncStrava } from '@/lib/api';
import type { Activity, StravaConnection } from '@/lib/types';

const STRAVA_ORANGE = '#FC4C02';

export default function ActivitiesScreen() {
  const [connection, setConnection] = useState<StravaConnection | null>(null);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [busy, setBusy] = useState<null | 'connect' | 'sync' | 'disconnect'>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [c, a] = await Promise.all([getStravaConnection(), getActivities()]);
      setConnection(c);
      setActivities(a);
    } catch (e) {
      setError(errorMessage(e));
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const act = async (kind: 'connect' | 'sync' | 'disconnect') => {
    setBusy(kind);
    setError(null);
    try {
      if (kind === 'connect') {
        const returnUrl = Linking.createURL('strava-return');
        const { url } = await startStravaConnect(returnUrl);
        if (Platform.OS === 'web') {
          window.location.assign(url); // comes back to /strava-return
          return;
        }
        const result = await WebBrowser.openAuthSessionAsync(url, returnUrl);
        if (result.type === 'success') {
          const { queryParams } = Linking.parse(result.url);
          if (queryParams?.strava === 'error') throw new Error(String(queryParams.message ?? 'Strava connection failed'));
        }
      } else if (kind === 'sync') {
        await syncStrava();
      } else {
        await disconnectStrava();
      }
      await load();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(null);
    }
  };

  return (
    <Screen>
      <Title>Activities</Title>

      <Card>
        <View style={styles.row}>
          <View style={styles.badge}><Text style={styles.badgeText}>S</Text></View>
          <View style={{ flex: 1 }}>
            <Text style={styles.name}>{connection ? `Strava · ${connection.athlete_name ?? 'connected'}` : 'Connect your Garmin'}</Text>
            <Body muted style={{ fontSize: 13 }}>
              {connection
                ? connection.last_synced_at ? `Last synced ${new Date(connection.last_synced_at).toLocaleString()}` : 'Not synced yet'
                : 'Through Strava: your coach sees runs and workouts from your Forerunner.'}
            </Body>
          </View>
        </View>
        {connection ? (
          <View style={{ flexDirection: 'row', gap: space.sm }}>
            <Button title="Sync now" icon="sync" variant="secondary" onPress={() => act('sync')} loading={busy === 'sync'}
              disabled={busy !== null} style={{ flex: 1 }} />
            <Button title="Disconnect" variant="danger" onPress={() => act('disconnect')} loading={busy === 'disconnect'}
              disabled={busy !== null} />
          </View>
        ) : (
          <>
            <Button title="Connect with Strava" onPress={() => act('connect')} loading={busy === 'connect'}
              style={{ backgroundColor: STRAVA_ORANGE }} />
            <Body muted style={{ fontSize: 13 }}>
              In the Garmin Connect app, link Strava under Settings → Connected Apps so your Forerunner activities upload automatically.
            </Body>
          </>
        )}
        <ErrorText error={error} />
      </Card>

      {activities.length > 0 ? (
        <Card style={{ gap: space.lg }}>
          <Label>Recent activities</Label>
          {activities.map((a) => <ActivityRow key={a.id} activity={a} />)}
        </Card>
      ) : connection ? (
        <Empty icon="pulse-outline" title="No activities in the last 60 days yet" />
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: space.md, alignItems: 'center' },
  badge: { width: 44, height: 44, borderRadius: 10, backgroundColor: STRAVA_ORANGE, alignItems: 'center', justifyContent: 'center' },
  badgeText: { color: '#fff', fontWeight: '900', fontSize: 22 },
  name: { color: colors.text, fontSize: 16, fontWeight: '700' },
});
