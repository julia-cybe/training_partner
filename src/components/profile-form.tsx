import { useState } from 'react';

import { Button, Card, Chip, ErrorText, errorMessage, Field, Label } from '@/components/ui';
import { saveProfile } from '@/lib/api';
import { deviceTimeZone } from '@/lib/dates';
import type { Profile } from '@/lib/types';

const FOCUS = [
  { id: 'crossfit', label: 'CrossFit' }, { id: 'hyrox', label: 'HYROX' }, { id: 'running', label: 'Running' },
  { id: 'strength', label: 'Strength' }, { id: 'gymnastics', label: 'Gymnastics' }, { id: 'endurance', label: 'Endurance' },
];
const LEVELS: Profile['experience'][] = ['beginner', 'intermediate', 'advanced', 'competitive'];

export const emptyProfile = (id: string): Profile => ({
  id, display_name: '', goals: '', experience: 'intermediate', focus: ['crossfit'], training_days: 5,
  session_minutes: 60, equipment: 'Full CrossFit box: barbell, rig, rower, bike, ski, dumbbells, kettlebells',
  benchmarks: '', injuries: '', event_name: null, event_date: null, units: 'kg', timezone: deviceTimeZone(),
});

export function ProfileForm({ initial, submitLabel, onSaved }: {
  initial: Profile; submitLabel: string; onSaved: () => void | Promise<void>;
}) {
  const [p, setP] = useState<Profile>(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const set = <K extends keyof Profile>(key: K, value: Profile[K]) => setP((prev) => ({ ...prev, [key]: value }));
  const toggleFocus = (id: string) => set('focus', p.focus.includes(id) ? p.focus.filter((f) => f !== id) : [...p.focus, id]);

  const save = async () => {
    setBusy(true);
    setError(null);
    try {
      if (p.event_date && !/^\d{4}-\d{2}-\d{2}$/.test(p.event_date)) throw new Error('Event date must be YYYY-MM-DD');
      await saveProfile({ ...p, event_name: p.event_name || null, event_date: p.event_date || null, timezone: deviceTimeZone() });
      await onSaved();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="stack">
      <Card>
        <Field label="Name" value={p.display_name ?? ''} onChange={(e) => set('display_name', e.target.value)} placeholder="What should your coach call you?" />
        <Field label="Goals" multiline value={p.goals} onChange={(e) => set('goals', e.target.value)}
          placeholder="e.g. Get my first muscle-up, run a sub-45 10k, compete at HYROX in spring" />
      </Card>

      <Card>
        <Label>Focus</Label>
        <div className="row wrap">{FOCUS.map((f) => <Chip key={f.id} label={f.label} selected={p.focus.includes(f.id)} onClick={() => toggleFocus(f.id)} />)}</div>
        <Label style={{ marginTop: 8 }}>Experience</Label>
        <div className="row wrap">
          {LEVELS.map((l) => <Chip key={l} label={l[0].toUpperCase() + l.slice(1)} selected={p.experience === l} onClick={() => set('experience', l)} />)}
        </div>
      </Card>

      <Card>
        <Label>Training days per week</Label>
        <div className="row wrap">{[2, 3, 4, 5, 6, 7].map((n) => <Chip key={n} label={String(n)} selected={p.training_days === n} onClick={() => set('training_days', n)} />)}</div>
        <Label style={{ marginTop: 8 }}>Session length</Label>
        <div className="row wrap">{[30, 45, 60, 75, 90, 120].map((n) => <Chip key={n} label={`${n} min`} selected={p.session_minutes === n} onClick={() => set('session_minutes', n)} />)}</div>
        <Label style={{ marginTop: 8 }}>Units</Label>
        <div className="row">{(['kg', 'lb'] as const).map((u) => <Chip key={u} label={u} selected={p.units === u} onClick={() => set('units', u)} />)}</div>
      </Card>

      <Card>
        <Field label="Equipment" multiline value={p.equipment} onChange={(e) => set('equipment', e.target.value)} />
        <Field label="Benchmarks & maxes" multiline value={p.benchmarks} onChange={(e) => set('benchmarks', e.target.value)}
          placeholder="e.g. Back squat 120 kg, Fran 4:30, 5k 22:40, 8 strict pull-ups" />
        <Field label="Injuries or limitations" multiline value={p.injuries} onChange={(e) => set('injuries', e.target.value)}
          placeholder="e.g. Left shoulder gets cranky with kipping" />
      </Card>

      <Card>
        <Field label="Target event (optional)" value={p.event_name ?? ''} onChange={(e) => set('event_name', e.target.value)} placeholder="e.g. HYROX Berlin, CrossFit Open" />
        <Field label="Event date" value={p.event_date ?? ''} onChange={(e) => set('event_date', e.target.value)} placeholder="YYYY-MM-DD" autoCapitalize="none" inputMode="numeric" />
      </Card>

      <ErrorText error={error} />
      <Button title={submitLabel} onClick={save} loading={busy} disabled={!p.goals.trim() || p.focus.length === 0} />
    </div>
  );
}
