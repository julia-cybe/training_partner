import { useState } from 'react';
import { View } from 'react-native';

import { Button, Card, Chip, ErrorText, errorMessage, Field, Label } from '@/components/ui';
import { space } from '@/constants/theme';
import { saveProfile } from '@/lib/api';
import type { Profile } from '@/lib/types';

const FOCUS = [
  { id: 'crossfit', label: 'CrossFit' },
  { id: 'hyrox', label: 'HYROX' },
  { id: 'running', label: 'Running' },
  { id: 'strength', label: 'Strength' },
  { id: 'gymnastics', label: 'Gymnastics' },
  { id: 'endurance', label: 'Endurance' },
];
const LEVELS: Profile['experience'][] = ['beginner', 'intermediate', 'advanced', 'competitive'];

export const emptyProfile = (id: string): Profile => ({
  id, display_name: '', goals: '', experience: 'intermediate', focus: ['crossfit'], training_days: 5,
  session_minutes: 60, equipment: 'Full CrossFit box: barbell, rig, rower, bike, ski, dumbbells, kettlebells',
  benchmarks: '', injuries: '', event_name: null, event_date: null, units: 'kg',
});

export function ProfileForm({ initial, submitLabel, onSaved }: {
  initial: Profile; submitLabel: string; onSaved: () => void | Promise<void>;
}) {
  const [p, setP] = useState<Profile>(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const set = <K extends keyof Profile>(key: K, value: Profile[K]) => setP((prev) => ({ ...prev, [key]: value }));

  const toggleFocus = (id: string) =>
    set('focus', p.focus.includes(id) ? p.focus.filter((f) => f !== id) : [...p.focus, id]);

  const save = async () => {
    setBusy(true);
    setError(null);
    try {
      if (p.event_date && !/^\d{4}-\d{2}-\d{2}$/.test(p.event_date)) throw new Error('Event date must be YYYY-MM-DD');
      await saveProfile({ ...p, event_name: p.event_name || null, event_date: p.event_date || null });
      await onSaved();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={{ gap: space.lg }}>
      <Card>
        <Field label="Name" value={p.display_name ?? ''} onChangeText={(v) => set('display_name', v)} placeholder="What should your coach call you?" />
        <Field label="Goals" value={p.goals} onChangeText={(v) => set('goals', v)} multiline
          placeholder="e.g. Get my first muscle-up, run a sub-45 10k, compete at HYROX in spring" />
      </Card>

      <Card>
        <Label>Focus</Label>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
          {FOCUS.map((f) => <Chip key={f.id} label={f.label} selected={p.focus.includes(f.id)} onPress={() => toggleFocus(f.id)} />)}
        </View>
        <Label style={{ marginTop: space.sm }}>Experience</Label>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
          {LEVELS.map((l) => (
            <Chip key={l} label={l[0].toUpperCase() + l.slice(1)} selected={p.experience === l} onPress={() => set('experience', l)} />
          ))}
        </View>
      </Card>

      <Card>
        <Label>Training days per week</Label>
        <View style={{ flexDirection: 'row', gap: space.sm }}>
          {[2, 3, 4, 5, 6, 7].map((n) => (
            <Chip key={n} label={String(n)} selected={p.training_days === n} onPress={() => set('training_days', n)} />
          ))}
        </View>
        <Label style={{ marginTop: space.sm }}>Session length</Label>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
          {[30, 45, 60, 75, 90, 120].map((n) => (
            <Chip key={n} label={`${n} min`} selected={p.session_minutes === n} onPress={() => set('session_minutes', n)} />
          ))}
        </View>
        <Label style={{ marginTop: space.sm }}>Units</Label>
        <View style={{ flexDirection: 'row', gap: space.sm }}>
          {(['kg', 'lb'] as const).map((u) => <Chip key={u} label={u} selected={p.units === u} onPress={() => set('units', u)} />)}
        </View>
      </Card>

      <Card>
        <Field label="Equipment" value={p.equipment} onChangeText={(v) => set('equipment', v)} multiline />
        <Field label="Benchmarks & maxes" value={p.benchmarks} onChangeText={(v) => set('benchmarks', v)} multiline
          placeholder="e.g. Back squat 120 kg, Fran 4:30, 5k 22:40, 8 strict pull-ups" />
        <Field label="Injuries or limitations" value={p.injuries} onChangeText={(v) => set('injuries', v)} multiline
          placeholder="e.g. Left shoulder gets cranky with kipping" />
      </Card>

      <Card>
        <Field label="Target event (optional)" value={p.event_name ?? ''} onChangeText={(v) => set('event_name', v)}
          placeholder="e.g. HYROX Berlin, CrossFit Open" />
        <Field label="Event date" value={p.event_date ?? ''} onChangeText={(v) => set('event_date', v)}
          placeholder="YYYY-MM-DD" autoCapitalize="none" />
      </Card>

      <ErrorText error={error} />
      <Button title={submitLabel} onPress={save} loading={busy} disabled={!p.goals.trim() || p.focus.length === 0} />
    </View>
  );
}
