import { Bike, Dumbbell, Footprints, type LucideIcon, Activity as Pulse, Waves } from 'lucide-react';

import { formatDuration, formatPace, longLabel } from '@/lib/dates';
import type { Activity } from '@/lib/types';

const sportIcon = (sport: string): LucideIcon => {
  if (/Run/.test(sport)) return Footprints;
  if (/Ride|Cycl/.test(sport)) return Bike;
  if (/Swim/.test(sport)) return Waves;
  if (/Weight|Crossfit|Workout|HIIT/i.test(sport)) return Dumbbell;
  return Pulse;
};

export function ActivityRow({ activity, showDate = true }: { activity: Activity; showDate?: boolean }) {
  const Icon = sportIcon(activity.sport_type);
  const stats = [
    activity.distance_m ? `${(activity.distance_m / 1000).toFixed(2)} km` : null,
    activity.moving_time_s ? formatDuration(activity.moving_time_s) : null,
    activity.average_speed && /Run/.test(activity.sport_type) ? formatPace(activity.average_speed) : null,
    activity.average_hr ? `♥ ${Math.round(activity.average_hr)}` : null,
    activity.training_load ? `Load ${Math.round(activity.training_load)}` : null,
  ].filter(Boolean);
  return (
    <div className="act">
      <span className="act-icon"><Icon size={20} /></span>
      <div className="grow">
        <div className="act-name">{activity.name}</div>
        <div className="muted small">{showDate ? `${longLabel(activity.start_date_local.slice(0, 10))} · ` : ''}{activity.sport_type}</div>
        {stats.length > 0 && <div className="act-stats">{stats.join('   ')}</div>}
      </div>
    </div>
  );
}
