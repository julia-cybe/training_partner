import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TextInput, View } from 'react-native';

import { Body, Button, Card, Chip, ErrorText, errorMessage, Label, Screen, Title } from '@/components/ui';
import { colors, radius, space } from '@/constants/theme';
import { getActivePlan, getCoachMemory, getMessages, messageCoach, requestPlan } from '@/lib/api';
import { longLabel } from '@/lib/dates';
import type { CoachMessage, Plan } from '@/lib/types';

export default function CoachScreen() {
  const [plan, setPlan] = useState<Plan | null>(null);
  const [memory, setMemory] = useState('');
  const [messages, setMessages] = useState<CoachMessage[]>([]);
  const [weeks, setWeeks] = useState(2);
  const [request, setRequest] = useState('');
  const [text, setText] = useState('');
  const [busy, setBusy] = useState<null | 'plan' | 'extend' | 'message'>(null);
  const [showNotes, setShowNotes] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [p, m, msgs] = await Promise.all([getActivePlan(), getCoachMemory(), getMessages()]);
      setPlan(p);
      setMemory(m);
      setMessages(msgs);
    } catch (e) {
      setError(errorMessage(e));
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const run = async (kind: 'plan' | 'extend' | 'message') => {
    setBusy(kind);
    setError(null);
    try {
      if (kind === 'message') {
        await messageCoach(text.trim());
        setText('');
      } else {
        await requestPlan({ weeks, request: request.trim() || undefined, mode: kind === 'plan' ? 'new' : 'extend' });
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
          <Label>Current block · until {longLabel(plan.end_date)}</Label>
          <Text style={styles.planTitle}>{plan.title}</Text>
          {plan.goal ? <Body>{plan.goal}</Body> : null}
          {plan.rationale ? <Body muted>{plan.rationale}</Body> : null}
        </Card>
      ) : (
        <Card>
          <Label>No plan yet</Label>
          <Body>Your coach will write a training block from your profile, then adjust it as you log sessions and train with your Garmin.</Body>
        </Card>
      )}

      <Card style={{ gap: space.md }}>
        <Label>{plan ? 'Plan ahead' : 'Create your first plan'}</Label>
        <View style={{ flexDirection: 'row', gap: space.sm, alignItems: 'center' }}>
          <Body muted>Weeks</Body>
          {[1, 2, 3, 4].map((n) => <Chip key={n} label={String(n)} selected={weeks === n} onPress={() => setWeeks(n)} />)}
        </View>
        <TextInput
          value={request}
          onChangeText={setRequest}
          multiline
          placeholder="Anything specific? e.g. more running, no handstand work, deload week"
          placeholderTextColor={colors.textFaint}
          style={styles.input}
        />
        {plan && (
          <Button title={`Program next ${weeks} week${weeks > 1 ? 's' : ''}`} icon="arrow-forward" onPress={() => run('extend')}
            loading={busy === 'extend'} disabled={busy !== null} />
        )}
        <Button title={plan ? 'Start a new block' : 'Write my plan'} icon="sparkles" variant={plan ? 'secondary' : 'primary'}
          onPress={() => run('plan')} loading={busy === 'plan'} disabled={busy !== null} />
        {(busy === 'plan' || busy === 'extend') && (
          <Body muted>Your coach is writing your sessions. This can take a minute or two.</Body>
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
  composer: { flexDirection: 'row', gap: space.sm, alignItems: 'flex-end' },
});
