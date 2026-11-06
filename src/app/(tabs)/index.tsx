import { router, useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { ActivityRow } from '@/components/activity';
import { MonthGrid, WeekStrip } from '@/components/calendar';
import { Button, Card, Empty, ErrorText, errorMessage, Label, Screen } from '@/components/ui';
import { WorkoutCard } from '@/components/workout';
import { colors, radius, space } from '@/constants/theme';
import { getActivitiesOn, getWorkouts } from '@/lib/api';
import { addDays, longLabel, monthLabel, startOfMonth, startOfWeek, today } from '@/lib/dates';
import type { Activity, Workout } from '@/lib/types';

export default function CalendarScreen() {
  const [selected, setSelected] = useState(today());
  const [view, setView] = useState<'week' | 'month'>('week');
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load a window covering the visible month (plus overflow weeks) around the selected day.
  const rangeStart = startOfWeek(addDays(startOfMonth(selected), -7));
  const rangeEnd = addDays(rangeStart, 56);

  const load = useCallback(async () => {
    try {
      setError(null);
      const [w, a] = await Promise.all([getWorkouts(rangeStart, rangeEnd), getActivitiesOn(selected)]);
      setWorkouts(w);
      setActivities(a);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setLoading(false);
    }
  }, [rangeStart, rangeEnd, selected]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const byDate = useMemo(() => {
    const map = new Map<string, Workout[]>();
    for (const w of workouts) map.set(w.date, [...(map.get(w.date) ?? []), w]);
    return map;
  }, [workouts]);

  const dayWorkouts = byDate.get(selected) ?? [];
  const hasUpcoming = workouts.some((w) => w.date >= today());

  return (
    <Screen>
      <View style={styles.header}>
        <View>
          <Label>{monthLabel(selected)}</Label>
          <Text style={styles.title}>{longLabel(selected)}</Text>
        </View>
        <View style={styles.toggle}>
          {(['week', 'month'] as const).map((v) => (
            <Pressable key={v} onPress={() => setView(v)} accessibilityRole="button" accessibilityState={{ selected: view === v }}
              style={[styles.toggleItem, view === v && styles.toggleOn]}>
              <Text style={[styles.toggleText, view === v && { color: colors.text }]}>{v === 'week' ? 'Week' : 'Month'}</Text>
            </Pressable>
          ))}
        </View>
      </View>

      {view === 'week'
        ? <WeekStrip selected={selected} onSelect={setSelected} byDate={byDate} />
        : <MonthGrid selected={selected} onSelect={setSelected} byDate={byDate} />}

      {selected !== today() && (
        <Button variant="ghost" title="Jump to today" onPress={() => setSelected(today())} style={{ alignSelf: 'flex-start', minHeight: 32, paddingHorizontal: 0 }} />
      )}

      <ErrorText error={error} />
      {loading ? <ActivityIndicator color={colors.accent} /> : (
        <View style={{ gap: space.md }}>
          {dayWorkouts.map((w) => (
            <WorkoutCard key={w.id} workout={w} onPress={() => router.push({ pathname: '/workout/[id]', params: { id: w.id } })} />
          ))}

          {dayWorkouts.length === 0 && (
            hasUpcoming || selected < today() ? (
              <Empty icon="bed-outline" title={selected < today() ? 'Nothing was scheduled' : 'Rest day. Recover well.'} />
            ) : (
              <Empty icon="sparkles-outline" title="No training scheduled yet">
                <Button title="Ask your coach for a plan" icon="sparkles" onPress={() => router.push('/coach')} />
              </Empty>
            )
          )}

          {activities.length > 0 && (
            <Card>
              <Label>From your Garmin</Label>
              {activities.map((a) => <ActivityRow key={a.id} activity={a} showDate={false} />)}
            </Card>
          )}
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' },
  title: { color: colors.text, fontSize: 28, fontWeight: '800', letterSpacing: -0.5 },
  toggle: { flexDirection: 'row', backgroundColor: colors.surface, borderRadius: radius.pill, padding: 3 },
  toggleItem: { paddingHorizontal: space.md, paddingVertical: 6, borderRadius: radius.pill },
  toggleOn: { backgroundColor: colors.surfaceAlt },
  toggleText: { color: colors.textMuted, fontWeight: '700', fontSize: 13 },
});
