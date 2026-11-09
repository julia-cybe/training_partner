import { ChevronLeft, Pencil, Sparkles } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { ActivityRow } from '@/components/activity';
import { Body, Button, Card, Chip, ErrorText, errorMessage, Field, Label, ScalePicker, Spinner } from '@/components/ui';
import { BlockView } from '@/components/workout';
import { getActivitiesOn, getWorkout, saveFeedback, sendFeedbackToCoach } from '@/lib/api';
import { longLabel } from '@/lib/dates';
import { kindColor, kindLabel } from '@/lib/kinds';
import { type Activity, type Feedback, feedbackOf, type Workout } from '@/lib/types';
import { useAuth } from '@/providers/auth';

const blankFeedback = (workoutId: string): Feedback => ({
  workout_id: workoutId, completed: true, rpe: null, enjoyment: null, energy: null, soreness: null,
  duration_min: null, results: '', notes: '', activity_id: null,
});

export default function WorkoutPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
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
      await saveFeedback(session.user.id, { workout_id, completed, rpe, enjoyment, energy, soreness, duration_min, results, notes, activity_id });
      setLogging(false);
      await load();
    } catch (e) {
      setError(errorMessage(e));
      setSaving(false);
      return;
    }
    setSaving(false);

    // Let the coach review the session and adapt the rest of the week.
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

  const back = (
    <div className="topbar">
      <button type="button" className="back" onClick={() => navigate(-1)}><ChevronLeft size={22} />{workout ? longLabel(workout.date) : 'Back'}</button>
    </div>
  );

  if (!workout) {
    return <main className="page">{back}{error ? <ErrorText error={error} /> : <div className="center" style={{ minHeight: 160 }}><Spinner /></div>}</main>;
  }

  const color = kindColor(workout.kind);
  const logged = feedbackOf(workout);

  return (
    <main className="page" style={{ paddingBottom: 'calc(32px + var(--safe-bottom))' }}>
      {back}
      <div className="stack-sm">
        <div className="row">
          <span className="pill" style={{ color, borderColor: color }}>{kindLabel(workout.kind).toUpperCase()}</span>
          <span className="muted">{workout.duration_min ? `${workout.duration_min} min · ` : ''}{workout.intensity}</span>
        </div>
        <h1 className="title">{workout.title}</h1>
        {workout.summary && <Body muted>{workout.summary}</Body>}
        {workout.change_note && <div className="changed"><Sparkles size={14} /><span>Adjusted by coach: {workout.change_note}</span></div>}
      </div>

      {workout.blocks.map((b, i) => <BlockView key={i} block={b} index={i} />)}

      {(coachBusy || coachReply) && (
        <Card accent>
          <Label>Coach</Label>
          {coachBusy ? <div className="row"><Spinner /><Body muted>Reviewing your session…</Body></div> : <Body pre>{coachReply}</Body>}
        </Card>
      )}

      {!logging && logged && (
        <Card>
          <div className="row between">
            <Label>{logged.completed ? 'Your log' : 'Skipped'}</Label>
            <Button variant="ghost" title="Edit" icon={Pencil} onClick={() => setLogging(true)} />
          </div>
          <p style={{ fontWeight: 700 }}>
            {[logged.rpe && `RPE ${logged.rpe}/10`, logged.energy && `Energy ${logged.energy}/5`,
              logged.soreness && `Soreness ${logged.soreness}/5`, logged.duration_min && `${logged.duration_min} min`].filter(Boolean).join('   ')}
          </p>
          {logged.results && <Body>{logged.results}</Body>}
          {logged.notes && <Body muted>{logged.notes}</Body>}
        </Card>
      )}

      {!logging && !logged && <Button title="Log this session" icon={Pencil} onClick={() => setLogging(true)} />}

      {logging && (
        <Card className="stack">
          <Label>How did it go?</Label>
          <div className="row">
            <Chip label="Completed" selected={feedback.completed} onClick={() => set('completed', true)} color="var(--success)" />
            <Chip label="Skipped" selected={!feedback.completed} onClick={() => set('completed', false)} color="var(--faint)" />
          </div>
          {feedback.completed && (
            <>
              <ScalePicker label="Effort (RPE)" min={1} max={10} value={feedback.rpe} onChange={(v) => set('rpe', v)} low="Very easy" high="Max effort" />
              <ScalePicker label="Energy" value={feedback.energy} onChange={(v) => set('energy', v)} low="Drained" high="Great" />
              <ScalePicker label="Soreness" value={feedback.soreness} onChange={(v) => set('soreness', v)} low="None" high="Very sore" />
              <ScalePicker label="Enjoyment" value={feedback.enjoyment} onChange={(v) => set('enjoyment', v)} low="Hated it" high="Loved it" />
              <Field label="Time taken (min)" inputMode="numeric" value={feedback.duration_min?.toString() ?? ''}
                onChange={(e) => set('duration_min', e.target.value ? Number(e.target.value.replace(/\D/g, '')) || null : null)} />
              <Field label="Results & scores" multiline value={feedback.results} onChange={(e) => set('results', e.target.value)}
                placeholder="e.g. Squats 5x3 @ 95 kg, metcon 12:41 Rx, 4 km avg 5:05/km" />
            </>
          )}
          <Field label="Notes for your coach" multiline value={feedback.notes} onChange={(e) => set('notes', e.target.value)}
            placeholder={feedback.completed ? 'How did it feel? Any pain, scaling, things you liked or hated?' : 'Why did you skip it?'} />
          {activities.length > 0 && feedback.completed && (
            <div className="stack-sm">
              <Label>Link Garmin activity</Label>
              {activities.map((a) => (
                <button key={a.id} type="button" className={`pick ${feedback.activity_id === a.id ? 'on' : ''}`}
                  onClick={() => set('activity_id', feedback.activity_id === a.id ? null : a.id)}>
                  <ActivityRow activity={a} showDate={false} />
                </button>
              ))}
            </div>
          )}
          <ErrorText error={error} />
          <Button title="Save & send to coach" onClick={submit} loading={saving} />
          <Button title="Cancel" variant="ghost" onClick={() => setLogging(false)} style={{ alignSelf: 'center' }} />
        </Card>
      )}
    </main>
  );
}
