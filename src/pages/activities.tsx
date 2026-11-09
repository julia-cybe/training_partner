import { RefreshCw, Watch, Activity as Pulse } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

import { ActivityRow } from '@/components/activity';
import { Body, Button, Card, Empty, ErrorText, errorMessage, Field, Label, Title } from '@/components/ui';
import { connectGarmin, disconnectGarmin, getActivities, getGarminConnection, syncGarmin } from '@/lib/api';
import type { Activity, GarminConnection } from '@/lib/types';

export default function ActivitiesPage() {
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

  useEffect(() => { load(); }, [load]);

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
    <>
      <Title>Activities</Title>
      <Card>
        <div className="row" style={{ gap: 12 }}>
          <span className="garmin-badge"><Watch size={24} /></span>
          <div className="grow">
            <div style={{ fontWeight: 700, fontSize: 16 }}>
              {connection ? `Garmin · ${connection.athlete_name ?? connection.athlete_id}` : 'Connect your Garmin'}
            </div>
            <Body muted small>
              {connection
                ? connection.last_synced_at ? `Last synced ${new Date(connection.last_synced_at).toLocaleString()}` : 'Not synced yet'
                : 'Through intervals.icu: your coach sees your Forerunner sessions, resting HR, HRV and sleep.'}
            </Body>
          </div>
        </div>
        {connection ? (
          <div className="row">
            <Button title="Sync now" icon={RefreshCw} variant="secondary" onClick={() => act('sync')} loading={busy === 'sync'} disabled={busy !== null} className="grow" />
            <Button title="Disconnect" variant="danger" onClick={() => act('disconnect')} loading={busy === 'disconnect'} disabled={busy !== null} />
          </div>
        ) : (
          <form className="stack-sm" onSubmit={(e) => { e.preventDefault(); act('connect'); }}>
            <Body muted small>
              1. In intervals.icu, connect Garmin under Settings → Connections.<br />
              2. Under Settings → Developer Settings, copy your athlete ID and API key.
            </Body>
            <Field label="Athlete ID" value={athleteId} onChange={(e) => setAthleteId(e.target.value)} placeholder="i12345"
              autoCapitalize="none" autoCorrect="off" />
            <Field label="API key" type="password" value={apiKey} onChange={(e) => setApiKey(e.target.value)} placeholder="Paste your API key"
              autoCapitalize="none" autoCorrect="off" autoComplete="off" hint="Stored only on the server; the app never shows it again." />
            <Button type="submit" title="Connect" loading={busy === 'connect'} disabled={!athleteId.trim() || !apiKey.trim() || busy !== null} />
          </form>
        )}
        <ErrorText error={error} />
      </Card>

      {activities.length > 0 ? (
        <Card className="stack">
          <Label>Recent activities</Label>
          {activities.map((a) => <ActivityRow key={a.id} activity={a} />)}
        </Card>
      ) : connection ? <Empty icon={Pulse} title="No activities in the last 60 days yet" /> : null}
    </>
  );
}
