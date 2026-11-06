import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TextInput, View } from 'react-native';

import { Body, Button, Card, ErrorText, errorMessage, Label, Screen, Title } from '@/components/ui';
import { colors, radius, space } from '@/constants/theme';
import {
  getActivePlan, getCoachMemory, getLatestWeeklyRun, getMessages, messageCoach, startBlock, type WeeklyRun, writeNextWeek,
} from '@/lib/api';
import { addDays, longLabel, startOfWeek, today } from '@/lib/dates';
import type { CoachMessage, Plan } from '@/lib/types';

/** 1-based week number of today within a block starting on `start` (a Monday). */
const weekOfBlock = (start: string) =>
  Math.max(1, Math.floor((Date.parse(startOfWeek(today())) - Date.parse(start)) / (7 * 86400000)) + 1);

export default function CoachScreen() {
  const [plan, setPlan] = useState<Plan | null>(null);
  const [memory, setMemory] = useState('');
  const [messages, setMessages] = useState<CoachMessage[]>([]);
  const [lastRun, setLastRun] = useState<WeeklyRun | null>(null);
  const [request, setRequest] = useState('');
  const [text, setText] = useState('');
  const [busy, setBusy] = useState<null | 'plan' | 'next' | 'message'>(null);
  const [showNotes, setShowNotes] = useState(false);
  const [showOutline, setShowOutline] = useState(false);
  const nextMonday = addDays(startOfWeek(today()), 7);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [p, m, msgs, run] = await Promise.all([getActivePlan(), getCoachMemory(), getMessages(), getLatestWeeklyRun()]);
      setPlan(p);
      setLastRun(run);
      setMemory(m);
      setMessages(msgs);
    } catch (e) {
      setError(errorMessage(e));
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

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
      if (kind !== 'message') router.navigate('/');
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(null);
    }
  };

  return (
    <Screen>
      <Title>Coach</Title>

      {plan ? (
        <Card>
          <Label>Current block · week {weekOfBlock(plan.start_date)} of {plan.weeks}</Label>
          <Text style={styles.planTitle}>{plan.title}</Text>
          {plan.goal ? <Body>{plan.goal}</Body> : null}
          {plan.rationale ? <Body muted>{plan.rationale}</Body> : null}
          {plan.outline ? (
            <>
              <Button variant="ghost" title={showOutline ? 'Hide block outline' : 'Show block outline'}
                icon={showOutline ? 'chevron-up' : 'list'} onPress={() => setShowOutline(!showOutline)}
                style={{ alignSelf: 'flex-start', paddingHorizontal: 0, minHeight: 32 }} />
              {showOutline && <Body muted>{plan.outline}</Body>}
            </>
          ) : null}
        </Card>
      ) : (
        <Card>
          <Label>No plan yet</Label>
          <Body>Your coach designs a training block from your profile and writes the first week. After that, every Sunday evening it writes the next week based on how the last one went.</Body>
        </Card>
      )}

      <Card style={{ gap: space.md }}>
        <View style={styles.schedule}>
          <Ionicons name="time-outline" size={18} color={colors.accent} />
          <Body style={{ flex: 1 }}>
            {plan
              ? `Next week (from ${longLabel(nextMonday)}) is written automatically on Sunday evening.`
              : 'Start a block to begin weekly coaching.'}
          </Body>
        </View>
        {lastRun?.status === 'failed' && (
          <Body style={{ color: colors.danger }}>Last automatic run failed: {lastRun.detail}</Body>
        )}
        <TextInput
          value={request}
          onChangeText={setRequest}
          multiline
          placeholder="Anything specific? e.g. more running, no handstand work, I'm away on Friday"
          placeholderTextColor={colors.textFaint}
          style={styles.input}
        />
        {plan && (
          <Button title="Write next week now" icon="arrow-forward" variant="secondary" onPress={() => run('next')}
            loading={busy === 'next'} disabled={busy !== null} />
        )}
        <Button title={plan ? 'Start a new block' : 'Start my training'} icon="sparkles" variant={plan ? 'secondary' : 'primary'}
          onPress={() => run('plan')} loading={busy === 'plan'} disabled={busy !== null} />
        {(busy === 'plan' || busy === 'next') && (
          <Body muted>Your coach is writing your week. This can take a minute.</Body>
        )}
      </Card>

      <ErrorText error={error} />

      <View style={{ gap: space.sm }}>
        <Label>Conversation</Label>
        {messages.length === 0 && <Body muted>Tell your coach about travel, fatigue, niggles or new goals. They'll adapt your plan.</Body>}
        {messages.map((m) => (
          <View key={m.id} style={[styles.bubble, m.role === 'athlete' ? styles.mine : styles.theirs]}>
            <Text style={styles.bubbleText}>{m.content}</Text>
          </View>
        ))}
        {busy === 'message' && (
          <View style={[styles.bubble, styles.theirs, { flexDirection: 'row', gap: space.sm }]}>
            <ActivityIndicator color={colors.accent} size="small" /><Text style={styles.bubbleText}>Thinking…</Text>
          </View>
        )}
        <View style={styles.composer}>
          <TextInput
            value={text}
            onChangeText={setText}
            multiline
            placeholder="Message your coach"
            placeholderTextColor={colors.textFaint}
            style={[styles.input, { flex: 1, minHeight: 48 }]}
          />
          <Button title="" icon="send" onPress={() => run('message')} disabled={!text.trim() || busy !== null}
            style={{ width: 52 }} />
        </View>
      </View>

      <Card>
        <Button variant="ghost" title={showNotes ? "Hide coach's notes" : "What your coach knows about you"}
          icon={showNotes ? 'chevron-up' : 'book-outline'} onPress={() => setShowNotes(!showNotes)}
          style={{ alignSelf: 'flex-start', paddingHorizontal: 0, minHeight: 32 }} />
        {showNotes && (
          memory
            ? <Body muted>{memory}</Body>
            : <View style={{ flexDirection: 'row', gap: space.sm }}><Ionicons name="information-circle-outline" size={18} color={colors.textMuted} /><Body muted>Notes appear after your first plan.</Body></View>
        )}
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  planTitle: { color: colors.text, fontSize: 20, fontWeight: '800' },
  input: {
    backgroundColor: colors.surfaceAlt, color: colors.text, borderRadius: radius.md, padding: space.md,
    fontSize: 15, minHeight: 64, textAlignVertical: 'top', borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border,
  },
  bubble: { maxWidth: '88%', borderRadius: radius.lg, padding: space.md },
  mine: { alignSelf: 'flex-end', backgroundColor: colors.accent, borderBottomRightRadius: 4 },
  theirs: { alignSelf: 'flex-start', backgroundColor: colors.surface, borderBottomLeftRadius: 4, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border },
  bubbleText: { color: colors.text, fontSize: 15, lineHeight: 21 },
  schedule: { flexDirection: 'row', gap: space.sm, alignItems: 'flex-start' },
  composer: { flexDirection: 'row', gap: space.sm, alignItems: 'flex-end' },
});
