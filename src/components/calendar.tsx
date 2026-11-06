import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, kindColor, radius, space } from '@/constants/theme';
import { addDays, addMonths, dayOfMonth, monthLabel, startOfMonth, startOfWeek, today, weekdayShort } from '@/lib/dates';
import type { Workout } from '@/lib/types';

const WEEKDAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

function Dots({ workouts }: { workouts: Workout[] }) {
  return (
    <View style={styles.dots}>
      {workouts.slice(0, 3).map((w) => (
        <View
          key={w.id}
          style={[
            styles.dot,
            { backgroundColor: kindColor(w.kind) },
            w.status === 'skipped' && { opacity: 0.3 },
          ]}
        />
      ))}
    </View>
  );
}

function DayCell({ date, selected, muted, workouts, onPress, wide }: {
  date: string; selected: boolean; muted?: boolean; workouts: Workout[]; onPress: () => void; wide?: boolean;
}) {
  const isToday = date === today();
  const done = workouts.length > 0 && workouts.every((w) => w.status !== 'planned');
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${date}, ${workouts.length} sessions`}
      accessibilityState={{ selected }}
      style={[styles.cell, wide && styles.cellWide, selected && styles.cellSelected]}>
      {wide && <Text style={[styles.weekday, selected && styles.textOn]}>{weekdayShort(date)}</Text>}
      <View style={[styles.num, isToday && !selected && styles.numToday]}>
        <Text style={[styles.numText, muted && { color: colors.textFaint }, selected && styles.textOn]}>
          {dayOfMonth(date)}
        </Text>
      </View>
      {done ? <Ionicons name="checkmark" size={12} color={selected ? '#fff' : colors.success} /> : <Dots workouts={workouts} />}
    </Pressable>
  );
}

export function WeekStrip({ selected, onSelect, byDate }: {
  selected: string; onSelect: (d: string) => void; byDate: Map<string, Workout[]>;
}) {
  const monday = startOfWeek(selected);
  const days = Array.from({ length: 7 }, (_, i) => addDays(monday, i));
  return (
    <View style={styles.weekRow}>
      <Pressable onPress={() => onSelect(addDays(selected, -7))} hitSlop={8} accessibilityLabel="Previous week">
        <Ionicons name="chevron-back" size={20} color={colors.textMuted} />
      </Pressable>
      {days.map((d) => (
        <DayCell key={d} wide date={d} selected={d === selected} workouts={byDate.get(d) ?? []} onPress={() => onSelect(d)} />
      ))}
      <Pressable onPress={() => onSelect(addDays(selected, 7))} hitSlop={8} accessibilityLabel="Next week">
        <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
      </Pressable>
    </View>
  );
}

export function MonthGrid({ selected, onSelect, byDate }: {
  selected: string; onSelect: (d: string) => void; byDate: Map<string, Workout[]>;
}) {
  const first = startOfMonth(selected);
  const gridStart = startOfWeek(first);
  const month = selected.slice(0, 7);
  const weeks = Array.from({ length: 6 }, (_, w) => Array.from({ length: 7 }, (_, d) => addDays(gridStart, w * 7 + d)))
    .filter((week, i) => i < 5 || week[0].slice(0, 7) === month);

  return (
    <View style={styles.month}>
      <View style={styles.monthHeader}>
        <Pressable onPress={() => onSelect(addMonths(selected, -1))} hitSlop={8} accessibilityLabel="Previous month">
          <Ionicons name="chevron-back" size={20} color={colors.textMuted} />
        </Pressable>
        <Text style={styles.monthTitle}>{monthLabel(first)}</Text>
        <Pressable onPress={() => onSelect(addMonths(selected, 1))} hitSlop={8} accessibilityLabel="Next month">
          <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
        </Pressable>
      </View>
      <View style={styles.gridRow}>
        {WEEKDAYS.map((d, i) => <Text key={i} style={styles.gridHead}>{d}</Text>)}
      </View>
      {weeks.map((week) => (
        <View key={week[0]} style={styles.gridRow}>
          {week.map((d) => (
            <DayCell
              key={d}
              date={d}
              selected={d === selected}
              muted={d.slice(0, 7) !== month}
              workouts={byDate.get(d) ?? []}
              onPress={() => onSelect(d)}
            />
          ))}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  weekRow: { flexDirection: 'row', alignItems: 'center', gap: space.xs },
  cell: {
    flex: 1, alignItems: 'center', gap: 3, paddingVertical: space.xs, borderRadius: radius.md, minHeight: 44,
  },
  cellWide: { paddingVertical: space.sm, backgroundColor: colors.surface },
  cellSelected: { backgroundColor: colors.accent },
  weekday: { color: colors.textMuted, fontSize: 11, fontWeight: '700', textTransform: 'uppercase' },
  num: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  numToday: { borderWidth: 1.5, borderColor: colors.accent },
  numText: { color: colors.text, fontSize: 15, fontWeight: '700' },
  textOn: { color: '#fff' },
  dots: { flexDirection: 'row', gap: 3, height: 12, alignItems: 'center' },
  dot: { width: 6, height: 6, borderRadius: 3 },
  month: {
    backgroundColor: colors.surface, borderRadius: radius.lg, padding: space.md, gap: space.xs,
    borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border,
  },
  monthHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingBottom: space.sm },
  monthTitle: { color: colors.text, fontSize: 16, fontWeight: '700' },
  gridRow: { flexDirection: 'row' },
  gridHead: { flex: 1, textAlign: 'center', color: colors.textFaint, fontSize: 12, fontWeight: '700' },
});
