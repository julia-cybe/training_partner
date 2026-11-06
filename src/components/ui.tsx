import { Ionicons } from '@expo/vector-icons';
import type { ComponentProps, ReactNode } from 'react';
import {
  ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, type TextInputProps,
  type TextStyle, View, type ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors, maxContentWidth, radius, space } from '@/constants/theme';

export type IconName = ComponentProps<typeof Ionicons>['name'];

export function Screen({ children, scroll = true, edges = ['top'] }: {
  children: ReactNode;
  scroll?: boolean;
  edges?: ('top' | 'bottom')[];
}) {
  const content = <View style={styles.content}>{children}</View>;
  return (
    <SafeAreaView style={styles.screen} edges={edges}>
      {scroll ? (
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          {content}
        </ScrollView>
      ) : content}
    </SafeAreaView>
  );
}

export function Title({ children, style }: { children: ReactNode; style?: TextStyle }) {
  return <Text style={[styles.title, style]}>{children}</Text>;
}

export function Label({ children, style }: { children: ReactNode; style?: TextStyle }) {
  return <Text style={[styles.label, style]}>{children}</Text>;
}

export function Body({ children, muted, style }: { children: ReactNode; muted?: boolean; style?: TextStyle }) {
  return <Text style={[styles.body, muted && { color: colors.textMuted }, style]}>{children}</Text>;
}

export function Card({ children, style, onPress }: { children: ReactNode; style?: ViewStyle; onPress?: () => void }) {
  if (!onPress) return <View style={[styles.card, style]}>{children}</View>;
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.card, style, pressed && { opacity: 0.8 }]}>
      {children}
    </Pressable>
  );
}

export function Button({ title, onPress, variant = 'primary', loading, disabled, icon, style }: {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  loading?: boolean;
  disabled?: boolean;
  icon?: IconName;
  style?: ViewStyle;
}) {
  const bg = { primary: colors.accent, secondary: colors.surfaceAlt, ghost: 'transparent', danger: 'transparent' }[variant];
  const fg = { primary: '#fff', secondary: colors.text, ghost: colors.accent, danger: colors.danger }[variant];
  const off = disabled || loading;
  return (
    <Pressable
      onPress={onPress}
      disabled={off}
      accessibilityRole="button"
      style={({ pressed }) => [
        styles.button, { backgroundColor: bg }, variant === 'secondary' && styles.buttonBorder,
        (pressed || off) && { opacity: 0.6 }, style,
      ]}>
      {loading ? <ActivityIndicator color={fg} /> : (
        <>
          {icon && <Ionicons name={icon} size={18} color={fg} />}
          <Text style={[styles.buttonText, { color: fg }]}>{title}</Text>
        </>
      )}
    </Pressable>
  );
}

export function Field({ label, hint, ...props }: TextInputProps & { label: string; hint?: string }) {
  return (
    <View style={{ gap: space.xs }}>
      <Label>{label}</Label>
      <TextInput
        placeholderTextColor={colors.textFaint}
        {...props}
        style={[styles.input, props.multiline && { minHeight: 84, textAlignVertical: 'top' }, props.style]}
      />
      {hint ? <Text style={styles.hint}>{hint}</Text> : null}
    </View>
  );
}

export function Chip({ label, selected, onPress, color = colors.accent }: {
  label: string; selected?: boolean; onPress?: () => void; color?: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      style={[styles.chip, selected && { backgroundColor: color, borderColor: color }]}>
      <Text style={[styles.chipText, selected && { color: '#fff' }]}>{label}</Text>
    </Pressable>
  );
}

export function ScalePicker({ label, value, onChange, min = 1, max = 5, low, high }: {
  label: string; value: number | null; onChange: (v: number) => void;
  min?: number; max?: number; low?: string; high?: string;
}) {
  const values = Array.from({ length: max - min + 1 }, (_, i) => min + i);
  return (
    <View style={{ gap: space.xs }}>
      <Label>{label}</Label>
      <View style={styles.scale}>
        {values.map((v) => (
          <Pressable
            key={v}
            onPress={() => onChange(v)}
            accessibilityRole="button"
            accessibilityLabel={`${label} ${v}`}
            style={[styles.scaleItem, value === v && styles.scaleItemOn]}>
            <Text style={[styles.scaleText, value === v && { color: '#fff' }]}>{v}</Text>
          </Pressable>
        ))}
      </View>
      {(low || high) && (
        <View style={styles.scaleLegend}>
          <Text style={styles.hint}>{low}</Text>
          <Text style={styles.hint}>{high}</Text>
        </View>
      )}
    </View>
  );
}

export function Empty({ icon, title, children }: { icon: IconName; title: string; children?: ReactNode }) {
  return (
    <View style={styles.empty}>
      <Ionicons name={icon} size={36} color={colors.textFaint} />
      <Text style={styles.emptyTitle}>{title}</Text>
      {children}
    </View>
  );
}

export function ErrorText({ error }: { error: string | null }) {
  return error ? <Text style={styles.error}>{error}</Text> : null;
}

export const errorMessage = (e: unknown) =>
  e instanceof Error ? e.message : typeof e === 'object' && e && 'message' in e ? String(e.message) : 'Something went wrong';

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  scroll: { flexGrow: 1 },
  content: {
    flex: 1, width: '100%', maxWidth: maxContentWidth, alignSelf: 'center',
    padding: space.lg, gap: space.lg,
  },
  title: { color: colors.text, fontSize: 28, fontWeight: '800', letterSpacing: -0.5 },
  label: { color: colors.textMuted, fontSize: 12, fontWeight: '700', letterSpacing: 0.8, textTransform: 'uppercase' },
  body: { color: colors.text, fontSize: 15, lineHeight: 22 },
  card: {
    backgroundColor: colors.surface, borderRadius: radius.lg, padding: space.lg, gap: space.sm,
    borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border,
  },
  button: {
    minHeight: 48, borderRadius: radius.md, paddingHorizontal: space.lg,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: space.sm,
  },
  buttonBorder: { borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border },
  buttonText: { fontSize: 16, fontWeight: '700' },
  input: {
    backgroundColor: colors.surfaceAlt, color: colors.text, borderRadius: radius.md,
    paddingHorizontal: space.md, paddingVertical: space.md, fontSize: 16,
    borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border,
  },
  hint: { color: colors.textFaint, fontSize: 12 },
  chip: {
    paddingHorizontal: space.md, paddingVertical: space.sm, borderRadius: radius.pill,
    borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surfaceAlt,
  },
  chipText: { color: colors.text, fontWeight: '600', fontSize: 14 },
  scale: { flexDirection: 'row', gap: space.xs },
  scaleItem: {
    flex: 1, minHeight: 44, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center',
    backgroundColor: colors.surfaceAlt, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border,
  },
  scaleItemOn: { backgroundColor: colors.accent, borderColor: colors.accent },
  scaleText: { color: colors.text, fontWeight: '700', fontSize: 15 },
  scaleLegend: { flexDirection: 'row', justifyContent: 'space-between' },
  empty: { alignItems: 'center', gap: space.md, paddingVertical: space.xxl },
  emptyTitle: { color: colors.textMuted, fontSize: 16, fontWeight: '600', textAlign: 'center' },
  error: { color: colors.danger, fontSize: 14 },
});
