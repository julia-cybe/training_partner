import { Ionicons } from '@expo/vector-icons';
import { Stack, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { ActivityRow } from '@/components/activity';
import {
  Body, Button, Card, Chip, ErrorText, errorMessage, Field, Label, ScalePicker, Screen, Title,
} from '@/components/ui';
import { BlockView, kindLabel } from '@/components/workout';
import { colors, kindColor, radius, space } from '@/constants/theme';
import { getActivitiesOn, getWorkout, saveFeedback, sendFeedbackToCoach } from '@/lib/api';
import { longLabel } from '@/lib/dates';
import { type Activity, type Feedback, feedbackOf, type Workout } from '@/lib/types';
import { useAuth } from '@/providers/auth';

const blankFeedback = (workoutId: string): Feedback => ({
  workout_id: workoutId, completed: true, rpe: null, enjoyment: null, energy: null, soreness: null,
  duration_min: null, results: '', notes: '', activity_id: null,
});

export default function WorkoutScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { session } = useAuth();
  const [workout, setWorkout] = useState<Workout | null>(null);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [feedback, setFeedback] = useState<Feedback>(blankFeedback(id));
  const [logging, setLogging] = useState(false);
  const [saving, setSaving] = useState(false);
  const [coachReply, setCoachReply] = useState<string | null>(null);
  const [coachBusy, setCoachBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const w = await getWorkout(id);
      setWorkout(w);
      if (w) {
        const fb = feedbackOf(w);
        if (fb) setFeedback(fb);
        setActivities(await getActivitiesOn(w.date));
      }
    } catch (e) {
      setError(errorMessage(e));
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const set = <K extends keyof Feedback>(key: K, value: Feedback[K]) => setFeedback((f) => ({ ...f, [key]: value }));

  const submit = async () => {
    if (!session || !workout) return;
    setSaving(true);
    setError(null);
    try {
      const { workout_id, completed, rpe, enjoyment, energy, soreness, duration_min, results, notes, activity_id } = feedback;
      await saveFeedback(session.user.id, {
        workout_id, completed, rpe, enjoyment, energy, soreness, duration_min, results, notes, activity_id,
      });
      setLogging(false);
      await load();
    } catch (e) {
      setError(errorMessage(e));
      setSaving(false);
      return;
    }
    setSaving(false);

    // Let the coach review the session and adapt upcoming training.
    setCoachBusy(true);
    try {
      const reply = await sendFeedbackToCoach(workout.id);
      setCoachReply(reply.changes ? `${reply.message}\n\n(${reply.changes} upcoming session${reply.changes === 1 ? '' : 's'} adjusted)` : reply.message);
    } catch (e) {
      setCoachReply(`Feedback saved, but the coach couldn't review it: ${errorMessage(e)}`);
    } finally {
      setCoachBusy(false);
    }
  };

  if (!workout) {
    return (
      <Screen edges={[]}>
        {error ? <ErrorText error={error} /> : <ActivityIndicator color={colors.accent} />}
      </Screen>
    );
  }

  const color = kindColor(workout.kind);
  const logged = feedbackOf(workout);

  return (
    <Screen edges={['bottom']}>
      <Stack.Screen options={{ title: longLabel(workout.date) }} />
      <View style={{ gap: space.sm }}>
        <View style={styles.tags}>
          <Text style={[styles.kind, { color, borderColor: color }]}>{kindLabel(workout.kind).toUpperCase()}</Text>
          <Text style={styles.meta}>{workout.duration_min ? `${workout.duration_min} min · ` : ''}{workout.intensity}</Text>
        </View>
        <Title>{workout.title}</Title>
        {workout.summary ? <Body muted>{workout.summary}</Body> : null}
        {workout.change_note ? (
          <View style={styles.changed}>
            <Ionicons name="sparkles" size={14} color={colors.accent} />
            <Text style={styles.changedText}>Adjusted by coach: {workout.change_note}</Text>
          </View>
        ) : null}
      </View>

      {workout.blocks.map((b, i) => <BlockView key={i} block={b} index={i} />)}

      {(coachBusy || coachReply) && (
        <Card style={{ borderColor: colors.accent }}>
          <Label style={{ color: colors.accent }}>Coach</Label>
          {coachBusy
            ? <View style={styles.thinking}><ActivityIndicator color={colors.accent} /><Body muted>Reviewing your session…</Body></View>
            : <Body>{coachReply}</Body>}
        </Card>
      )}

      {!logging && logged && (
        <Card>
          <View style={styles.loggedHeader}>
            <Label>{logged.completed ? 'Your log' : 'Skipped'}</Label>
            <Pressable onPress={() => setLogging(true)} hitSlop={8}><Text style={styles.edit}>Edit</Text></Pressable>
          </View>
          <Text style={styles.loggedStats}>
            {[logged.rpe && `RPE ${logged.rpe}/10`, logged.energy && `Energy ${logged.energy}/5`,
              logged.soreness && `Soreness ${logged.soreness}/5`, logged.duration_min && `${logged.duration_min} min`]
              .filter(Boolean).join('   ')}
          </Text>
          {logged.results ? <Body>{logged.results}</Body> : null}
          {logged.notes ? <Body muted>{logged.notes}</Body> : null}
        </Card>
      )}

      {!logging && !logged && (
        <Button title="Log this session" icon="create-outline" onPress={() => setLogging(true)} />
      )}

      {logging && (
        <Card style={{ gap: space.lg }}>
          <Label>How did it go?</Label>
          <View style={{ flexDirection: 'row', gap: space.sm }}>
            <Chip label="Completed" selected={feedback.completed} onPress={() => set('completed', true)} color={colors.success} />
            <Chip label="Skipped" selected={!feedback.completed} onPress={() => set('completed', false)} color={colors.textFaint} />
          </View>
          {feedback.completed && (
            <>
              <ScalePicker label="Effort (RPE)" min={1} max={10} value={feedback.rpe} onChange={(v) => set('rpe', v)}
                low="Very easy" high="Max effort" />
              <ScalePicker label="Energy" value={feedback.energy} onChange={(v) => set('energy', v)} low="Drained" high="Great" />
              <ScalePicker label="Soreness" value={feedback.soreness} onChange={(v) => set('soreness', v)} low="None" high="Very sore" />
              <ScalePicker label="Enjoyment" value={feedback.enjoyment} onChange={(v) => set('enjoyment', v)} low="Hated it" high="Loved it" />
              <Field label="Time taken (min)" keyboardType="number-pad" value={feedback.duration_min?.toString() ?? ''}
                onChangeText={(v) => set('duration_min', v ? Number(v.replace(/\D/g, '')) || null : null)} />
              <Field label="Results & scores" multiline value={feedback.results} onChangeText={(v) => set('results', v)}
                placeholder="e.g. Squats 5x3 @ 95 kg, metcon 12:41 Rx, 4 km avg 5:05/km" />
            </>
          )}
          <Field label="Notes for your coach" multiline value={feedback.notes} onChangeText={(v) => set('notes', v)}
            placeholder={feedback.completed ? 'How did it feel? Any pain, scaling, things you liked or hated?' : 'Why did you skip it?'} />
          {activities.length > 0 && feedback.completed && (
            <View style={{ gap: space.sm }}>
              <Label>Link Garmin activity</Label>
              {activities.map((a) => (
                <Pressable key={a.id} onPress={() => set('activity_id', feedback.activity_id === a.id ? null : a.id)}
                  style={[styles.activityPick, feedback.activity_id === a.id && { borderColor: colors.accent }]}>
                  <ActivityRow activity={a} showDate={false} />
                </Pressable>
              ))}
            </View>
          )}
          <ErrorText error={error} />
          <Button title="Save & send to coach" onPress={submit} loading={saving} />
          <Button title="Cancel" variant="ghost" onPress={() => setLogging(false)} />
        </Card>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  tags: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  kind: { fontSize: 11, fontWeight: '800', letterSpacing: 1, borderWidth: 1, borderRadius: radius.pill, paddingHorizontal: 8, paddingVertical: 2 },
  meta: { color: colors.textMuted, fontSize: 14 },
  changed: { flexDirection: 'row', gap: space.sm, backgroundColor: colors.accentSoft, borderRadius: radius.md, padding: space.md },
  changedText: { color: colors.text, fontSize: 14, flex: 1, lineHeight: 20 },
  thinking: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  loggedHeader: { flexDirection: 'row', justifyContent: 'space-between' },
  edit: { color: colors.accent, fontWeight: '700' },
  loggedStats: { color: colors.text, fontWeight: '700', fontSize: 15 },
  activityPick: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: space.sm },
});
