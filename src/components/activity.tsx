import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';

import type { IconName } from '@/components/ui';
import { colors, radius, space } from '@/constants/theme';
import { formatDuration, formatPace, longLabel } from '@/lib/dates';
import type { Activity } from '@/lib/types';

const sportIcon = (sport: string): IconName => {
  if (/Run/.test(sport)) return 'walk';
  if (/Ride|Cycl/.test(sport)) return 'bicycle';
  if (/Swim/.test(sport)) return 'water';
  if (/Row/.test(sport)) return 'boat';
  if (/Weight|Crossfit|Workout|HIIT/i.test(sport)) return 'barbell';
  return 'pulse';
};

export function ActivityRow({ activity, showDate = true }: { activity: Activity; showDate?: boolean }) {
  const stats = [
    activity.distance_m ? `${(activity.distance_m / 1000).toFixed(2)} km` : null,
    activity.moving_time_s ? formatDuration(activity.moving_time_s) : null,
    activity.average_speed && /Run/.test(activity.sport_type) ? formatPace(activity.average_speed) : null,
    activity.average_hr ? `♥ ${Math.round(activity.average_hr)}` : null,
    activity.training_load ? `Load ${Math.round(activity.training_load)}` : null,
  ].filter(Boolean);
  return (
    <View style={styles.row}>
      <View style={styles.icon}><Ionicons name={sportIcon(activity.sport_type)} size={20} color={colors.run} /></View>
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={styles.name} numberOfLines={1}>{activity.name}</Text>
        <Text style={styles.meta}>
          {showDate ? `${longLabel(activity.start_date_local.slice(0, 10))} · ` : ''}{activity.sport_type}
        </Text>
        {stats.length > 0 && <Text style={styles.stats}>{stats.join('   ')}</Text>}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: space.md, alignItems: 'center' },
  icon: {
    width: 40, height: 40, borderRadius: radius.md, backgroundColor: 'rgba(47,191,113,0.12)',
    alignItems: 'center', justifyContent: 'center',
  },
  name: { color: colors.text, fontSize: 15, fontWeight: '700' },
  meta: { color: colors.textMuted, fontSize: 13 },
  stats: { color: colors.text, fontSize: 13, fontWeight: '600' },
});
