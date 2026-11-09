import { Check, ChevronLeft, ChevronRight } from 'lucide-react';

import { kindColor } from '@/lib/kinds';
import { addDays, addMonths, dayOfMonth, monthLabel, startOfMonth, startOfWeek, today, weekdayShort } from '@/lib/dates';
import type { Workout } from '@/lib/types';

const WEEKDAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

function DayCell({ date, selected, dim, workouts, onSelect, wide }: {
  date: string; selected: boolean; dim?: boolean; workouts: Workout[]; onSelect: () => void; wide?: boolean;
}) {
  const done = workouts.length > 0 && workouts.every((w) => w.status !== 'planned');
  const cls = ['day', selected && 'selected', date === today() && 'today', dim && 'dim'].filter(Boolean).join(' ');
  return (
    <button type="button" className={cls} onClick={onSelect} aria-pressed={selected}
      aria-label={`${date}, ${workouts.length} sessions`}>
      {wide && <span className="wd">{weekdayShort(date)}</span>}
      <span className="num">{dayOfMonth(date)}</span>
      <span className="dots">
        {done ? <Check size={12} /> : workouts.slice(0, 3).map((w) => (
          <span key={w.id} className="dot" style={{ background: kindColor(w.kind), opacity: w.status === 'skipped' ? 0.3 : 1 }} />
        ))}
      </span>
    </button>
  );
}

export function WeekStrip({ selected, onSelect, byDate }: {
  selected: string; onSelect: (d: string) => void; byDate: Map<string, Workout[]>;
}) {
  const monday = startOfWeek(selected);
  const days = Array.from({ length: 7 }, (_, i) => addDays(monday, i));
  return (
    <div className="weekstrip">
      <button type="button" className="nav" onClick={() => onSelect(addDays(selected, -7))} aria-label="Previous week"><ChevronLeft size={20} /></button>
      {days.map((d) => <DayCell key={d} wide date={d} selected={d === selected} workouts={byDate.get(d) ?? []} onSelect={() => onSelect(d)} />)}
      <button type="button" className="nav" onClick={() => onSelect(addDays(selected, 7))} aria-label="Next week"><ChevronRight size={20} /></button>
    </div>
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
    <div className="month">
      <div className="month-head">
        <button type="button" onClick={() => onSelect(addMonths(selected, -1))} aria-label="Previous month"><ChevronLeft size={20} /></button>
        <h3>{monthLabel(first)}</h3>
        <button type="button" onClick={() => onSelect(addMonths(selected, 1))} aria-label="Next month"><ChevronRight size={20} /></button>
      </div>
      <div className="month-grid">
        {WEEKDAYS.map((d, i) => <div key={i} className="gh">{d}</div>)}
        {weeks.flat().map((d) => (
          <DayCell key={d} date={d} selected={d === selected} dim={d.slice(0, 7) !== month} workouts={byDate.get(d) ?? []} onSelect={() => onSelect(d)} />
        ))}
      </div>
    </div>
  );
}
