import { BedDouble, Clock, Sparkles } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { ActivityRow } from '@/components/activity';
import { MonthGrid, WeekStrip } from '@/components/calendar';
import { Button, Card, Empty, ErrorText, errorMessage, Label, Spinner } from '@/components/ui';
import { WorkoutCard } from '@/components/workout';
import { getActivitiesOn, getWorkouts } from '@/lib/api';
import { addDays, longLabel, monthLabel, startOfMonth, startOfWeek, today } from '@/lib/dates';
import type { Activity, Workout } from '@/lib/types';

export default function CalendarPage() {
  const navigate = useNavigate();
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

  useEffect(() => { load(); }, [load]);

  const byDate = useMemo(() => {
    const map = new Map<string, Workout[]>();
    for (const w of workouts) map.set(w.date, [...(map.get(w.date) ?? []), w]);
    return map;
  }, [workouts]);

  const dayWorkouts = byDate.get(selected) ?? [];
  const hasUpcoming = workouts.some((w) => w.date >= today());
  // Weeks after the last written one are written on the Sunday before them.
  const lastWritten = workouts.reduce((max, w) => (w.date > max ? w.date : max), '');
  const notWrittenYet = hasUpcoming && selected > lastWritten && startOfWeek(selected) > startOfWeek(lastWritten);

  return (
    <>
      <div className="cal-header">
        <div>
          <Label>{monthLabel(selected)}</Label>
          <h1 className="title">{longLabel(selected)}</h1>
        </div>
        <div className="seg" role="group" aria-label="Calendar view">
          {(['week', 'month'] as const).map((v) => (
            <button key={v} type="button" className={view === v ? 'on' : ''} aria-pressed={view === v} onClick={() => setView(v)}>
              {v === 'week' ? 'Week' : 'Month'}
            </button>
          ))}
        </div>
      </div>

      {view === 'week'
        ? <WeekStrip selected={selected} onSelect={setSelected} byDate={byDate} />
        : <MonthGrid selected={selected} onSelect={setSelected} byDate={byDate} />}

      {selected !== today() && (
        <Button variant="ghost" title="Jump to today" onClick={() => setSelected(today())} style={{ alignSelf: 'flex-start' }} />
      )}

      <ErrorText error={error} />
      {loading ? <div className="center" style={{ minHeight: 120 }}><Spinner /></div> : (
        <div className="stack">
          {dayWorkouts.map((w) => <WorkoutCard key={w.id} workout={w} onOpen={() => navigate(`/workout/${w.id}`)} />)}

          {dayWorkouts.length === 0 && notWrittenYet && (
            <Empty icon={Clock} title={`Your coach writes this week on ${longLabel(addDays(startOfWeek(selected), -1))} evening`} />
          )}
          {dayWorkouts.length === 0 && !notWrittenYet && (
            hasUpcoming || selected < today()
              ? <Empty icon={BedDouble} title={selected < today() ? 'Nothing was scheduled' : 'Rest day. Recover well.'} />
              : (
                <Empty icon={Sparkles} title="No training scheduled yet">
                  <Button title="Ask your coach for a plan" icon={Sparkles} onClick={() => navigate('/coach')} />
                </Empty>
              )
          )}

          {activities.length > 0 && (
            <Card>
              <Label>From your Garmin</Label>
              {activities.map((a) => <ActivityRow key={a.id} activity={a} showDate={false} />)}
            </Card>
          )}
        </div>
      )}
    </>
  );
}
