import { ArrowRight, BookOpen, ChevronUp, Clock, List, SendHorizontal, Sparkles } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { Body, Button, Card, ErrorText, errorMessage, Label, Spinner, Title } from '@/components/ui';
import {
  getActivePlan, getCoachMemory, getLatestWeeklyRun, getMessages, messageCoach, startBlock, type WeeklyRun, writeNextWeek,
} from '@/lib/api';
import { addDays, longLabel, startOfWeek, today } from '@/lib/dates';
import type { CoachMessage, Plan } from '@/lib/types';

/** 1-based week number of today within a block starting on `start` (a Monday). */
const weekOfBlock = (start: string) =>
  Math.max(1, Math.floor((Date.parse(startOfWeek(today())) - Date.parse(start)) / (7 * 86400000)) + 1);

export default function CoachPage() {
  const navigate = useNavigate();
  const [plan, setPlan] = useState<Plan | null>(null);
  const [memory, setMemory] = useState('');
  const [messages, setMessages] = useState<CoachMessage[]>([]);
  const [lastRun, setLastRun] = useState<WeeklyRun | null>(null);
  const [request, setRequest] = useState('');
  const [text, setText] = useState('');
  const [busy, setBusy] = useState<null | 'plan' | 'next' | 'message'>(null);
  const [showNotes, setShowNotes] = useState(false);
  const [showOutline, setShowOutline] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const nextMonday = addDays(startOfWeek(today()), 7);

  const load = useCallback(async () => {
    try {
      const [p, m, msgs, run] = await Promise.all([getActivePlan(), getCoachMemory(), getMessages(), getLatestWeeklyRun()]);
      setPlan(p);
      setMemory(m);
      setMessages(msgs);
      setLastRun(run);
    } catch (e) {
      setError(errorMessage(e));
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const run = async (kind: 'plan' | 'next' | 'message') => {
    setBusy(kind);
    setError(null);
    try {
      if (kind === 'message') {
        await messageCoach(text.trim());
        setText('');
      } else {
        const note = request.trim() || undefined;
        await (kind === 'plan' ? startBlock(note) : writeNextWeek(note));
        setRequest('');
      }
      await load();
      if (kind !== 'message') navigate('/');
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(null);
    }
  };

  return (
    <>
      <Title>Coach</Title>

      {plan ? (
        <Card>
          <Label>Current block · week {weekOfBlock(plan.start_date)} of {plan.weeks}</Label>
          <h2 style={{ fontSize: 20, fontWeight: 800 }}>{plan.title}</h2>
          {plan.goal && <Body>{plan.goal}</Body>}
          {plan.rationale && <Body muted>{plan.rationale}</Body>}
          {plan.outline && (
            <>
              <Button variant="ghost" title={showOutline ? 'Hide block outline' : 'Show block outline'} icon={showOutline ? ChevronUp : List}
                onClick={() => setShowOutline(!showOutline)} style={{ alignSelf: 'flex-start' }} />
              {showOutline && <Body muted pre>{plan.outline}</Body>}
            </>
          )}
        </Card>
      ) : (
        <Card>
          <Label>No plan yet</Label>
          <Body>Your coach designs a training block from your profile and writes the first week. After that, every Sunday evening it writes the next week based on how the last one went.</Body>
        </Card>
      )}

      <Card>
        <div className="row" style={{ alignItems: 'flex-start' }}>
          <Clock size={18} color="var(--accent)" style={{ flex: 'none', marginTop: 2 }} />
          <Body>
            {plan
              ? `Next week (from ${longLabel(nextMonday)}) is written automatically on Sunday evening.`
              : 'Start a block to begin weekly coaching.'}
          </Body>
        </div>
        {lastRun?.status === 'failed' && <p className="error">Last automatic run failed: {lastRun.detail}</p>}
        <textarea className="input" value={request} onChange={(e) => setRequest(e.target.value)}
          placeholder="Anything specific? e.g. more running, no handstand work, I'm away on Friday" />
        {plan && (
          <Button title="Write next week now" icon={ArrowRight} variant="secondary" onClick={() => run('next')}
            loading={busy === 'next'} disabled={busy !== null} />
        )}
        <Button title={plan ? 'Start a new block' : 'Start my training'} icon={Sparkles} variant={plan ? 'secondary' : 'primary'}
          onClick={() => run('plan')} loading={busy === 'plan'} disabled={busy !== null} />
        {(busy === 'plan' || busy === 'next') && <Body muted>Your coach is writing your week. This can take a minute.</Body>}
      </Card>

      <ErrorText error={error} />

      <div className="stack-sm">
        <Label>Conversation</Label>
        {messages.length === 0 && <Body muted>Tell your coach about travel, fatigue, niggles or new goals. They'll adapt your plan.</Body>}
        {messages.map((m) => <div key={m.id} className={`bubble ${m.role === 'athlete' ? 'mine' : 'theirs'}`}>{m.content}</div>)}
        {busy === 'message' && <div className="bubble theirs row"><Spinner /> Thinking…</div>}
        <form className="composer" onSubmit={(e) => { e.preventDefault(); if (text.trim() && !busy) run('message'); }}>
          <textarea className="input" value={text} onChange={(e) => setText(e.target.value)} placeholder="Message your coach" rows={1} />
          <Button type="submit" icon={SendHorizontal} aria-label="Send" disabled={!text.trim() || busy !== null} />
        </form>
      </div>

      <Card>
        <Button variant="ghost" title={showNotes ? "Hide coach's notes" : 'What your coach knows about you'} icon={showNotes ? ChevronUp : BookOpen}
          onClick={() => setShowNotes(!showNotes)} style={{ alignSelf: 'flex-start' }} />
        {showNotes && (memory ? <Body muted pre>{memory}</Body> : <Body muted>Notes appear after your first plan.</Body>)}
      </Card>
    </>
  );
}
