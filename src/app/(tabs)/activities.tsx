import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { ActivityRow } from '@/components/activity';
import { Body, Button, Card, Empty, ErrorText, errorMessage, Field, Label, Screen, Title } from '@/components/ui';
import { colors, space } from '@/constants/theme';
import { connectGarmin, disconnectGarmin, getActivities, getGarminConnection, syncGarmin } from '@/lib/api';
import type { Activity, GarminConnection } from '@/lib/types';

export default function ActivitiesScreen() {
  const [connection, setConnection] = useState<GarminConnection | null>(null);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [athleteId, setAthleteId] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [busy, setBusy] = useState<null | 'connect' | 'sync' | 'disconnect'>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [c, a] = await Promise.all([getGarminConnection(), getActivities()]);
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
        await connectGarmin(athleteId.trim(), apiKey.trim());
        setApiKey('');
      } else if (kind === 'sync') {
        await syncGarmin();
      } else {
        await disconnectGarmin();
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
          <View style={styles.badge}><Ionicons name="watch" size={24} color="#fff" /></View>
          <View style={{ flex: 1 }}>
            <Text style={styles.name}>
              {connection ? `Garmin · ${connection.athlete_name ?? connection.athlete_id}` : 'Connect your Garmin'}
            </Text>
            <Body muted style={{ fontSize: 13 }}>
              {connection
                ? connection.last_synced_at ? `Last synced ${new Date(connection.last_synced_at).toLocaleString()}` : 'Not synced yet'
                : 'Through intervals.icu: your coach sees your Forerunner sessions, resting HR, HRV and sleep.'}
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
            <Body muted style={{ fontSize: 13 }}>
              1. In intervals.icu, connect Garmin under Settings → Connections.{'\n'}
              2. Under Settings → Developer Settings, copy your athlete ID and API key.
            </Body>
            <Field label="Athlete ID" value={athleteId} onChangeText={setAthleteId} placeholder="i12345"
              autoCapitalize="none" autoCorrect={false} />
            <Field label="API key" value={apiKey} onChangeText={setApiKey} placeholder="Paste your API key"
              autoCapitalize="none" autoCorrect={false} secureTextEntry
              hint="Stored only on the server; the app never shows it again." />
            <Button title="Connect" onPress={() => act('connect')} loading={busy === 'connect'}
              disabled={!athleteId.trim() || !apiKey.trim() || busy !== null} />
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
  badge: { width: 44, height: 44, borderRadius: 10, backgroundColor: colors.run, alignItems: 'center', justifyContent: 'center' },
  name: { color: colors.text, fontSize: 16, fontWeight: '700' },
});
