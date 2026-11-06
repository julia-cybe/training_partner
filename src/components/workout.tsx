import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, fonts, kindColor, radius, space } from '@/constants/theme';
import { type Block, feedbackOf, type Workout } from '@/lib/types';

const KIND_LABEL: Record<string, string> = {
  strength: 'Strength', metcon: 'Metcon', run: 'Run', hybrid: 'Hybrid', endurance: 'Endurance',
  gymnastics: 'Gymnastics', recovery: 'Recovery', rest: 'Rest',
};

export const kindLabel = (kind: string) => KIND_LABEL[kind] ?? kind;

export function StatusIcon({ workout }: { workout: Workout }) {
  if (workout.status === 'completed') return <Ionicons name="checkmark-circle" size={22} color={colors.success} />;
  if (workout.status === 'skipped') return <Ionicons name="close-circle" size={22} color={colors.textFaint} />;
  return <Ionicons name="ellipse-outline" size={22} color={colors.textFaint} />;
}

export function WorkoutCard({ workout, onPress }: { workout: Workout; onPress: () => void }) {
  const color = kindColor(workout.kind);
  const fb = feedbackOf(workout);
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => [styles.card, pressed && { opacity: 0.85 }]}>
      <View style={[styles.stripe, { backgroundColor: color }]} />
      <View style={styles.cardBody}>
        <View style={styles.row}>
          <Text style={[styles.kind, { color }]}>{kindLabel(workout.kind).toUpperCase()}</Text>
          <Text style={styles.meta}>
            {workout.duration_min ? `${workout.duration_min} min · ` : ''}{workout.intensity}
          </Text>
          <View style={{ marginLeft: 'auto' }}><StatusIcon workout={workout} /></View>
        </View>
        <Text style={styles.title}>{workout.title}</Text>
        {workout.summary ? <Text style={styles.summary} numberOfLines={2}>{workout.summary}</Text> : null}
        <Text style={styles.preview} numberOfLines={1}>
          {workout.blocks.map((b) => b.title).join('  ·  ')}
        </Text>
        {fb?.rpe ? <Text style={styles.meta}>Logged: RPE {fb.rpe}/10{fb.results ? ` · ${fb.results}` : ''}</Text> : null}
        {workout.change_note && workout.status === 'planned' ? (
          <View style={styles.changed}>
            <Ionicons name="sparkles" size={13} color={colors.accent} />
            <Text style={styles.changedText} numberOfLines={2}>Adjusted by coach: {workout.change_note}</Text>
          </View>
        ) : null}
      </View>
    </Pressable>
  );
}

export function BlockView({ block, index }: { block: Block; index: number }) {
  const letter = String.fromCharCode(65 + index);
  return (
    <View style={styles.block}>
      <View style={styles.blockHeader}>
        <View style={styles.badge}><Text style={styles.badgeText}>{letter}</Text></View>
        <View style={{ flex: 1 }}>
          <Text style={styles.blockTitle}>{block.title}</Text>
          {block.format ? <Text style={styles.format}>{block.format}</Text> : null}
        </View>
      </View>
      <View style={styles.items}>
        {block.items.map((item, i) => (
          <View key={i} style={styles.item}>
            <Text style={styles.movement}>{item.movement}</Text>
            <Text style={styles.prescription}>{item.prescription}</Text>
            {item.notes ? <Text style={styles.itemNotes}>{item.notes}</Text> : null}
          </View>
        ))}
      </View>
      {block.notes ? <Text style={styles.blockNotes}>{block.notes}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row', backgroundColor: colors.surface, borderRadius: radius.lg, overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border,
  },
  stripe: { width: 4 },
  cardBody: { flex: 1, padding: space.lg, gap: space.xs },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  kind: { fontSize: 12, fontWeight: '800', letterSpacing: 1 },
  meta: { color: colors.textMuted, fontSize: 13 },
  title: { color: colors.text, fontSize: 18, fontWeight: '700' },
  summary: { color: colors.textMuted, fontSize: 14, lineHeight: 20 },
  preview: { color: colors.textFaint, fontSize: 13, marginTop: space.xs },
  changed: {
    flexDirection: 'row', gap: space.xs, alignItems: 'flex-start', marginTop: space.xs,
    backgroundColor: colors.accentSoft, borderRadius: radius.sm, padding: space.sm,
  },
  changedText: { color: colors.text, fontSize: 13, flex: 1 },
  block: {
    backgroundColor: colors.surface, borderRadius: radius.lg, padding: space.lg, gap: space.md,
    borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border,
  },
  blockHeader: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  badge: {
    width: 32, height: 32, borderRadius: 16, backgroundColor: colors.accentSoft,
    alignItems: 'center', justifyContent: 'center',
  },
  badgeText: { color: colors.accent, fontWeight: '800', fontSize: 15 },
  blockTitle: { color: colors.text, fontSize: 17, fontWeight: '700' },
  format: { color: colors.accent, fontSize: 14, fontWeight: '600', marginTop: 2 },
  items: { gap: space.md },
  item: { gap: 2, paddingLeft: space.sm, borderLeftWidth: 2, borderLeftColor: colors.border },
  movement: { color: colors.text, fontSize: 15, fontWeight: '600' },
  prescription: { color: colors.text, fontSize: 15, fontFamily: fonts.mono },
  itemNotes: { color: colors.textMuted, fontSize: 13 },
  blockNotes: { color: colors.textMuted, fontSize: 14, lineHeight: 20, fontStyle: 'italic' },
});
