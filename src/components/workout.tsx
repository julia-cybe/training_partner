import { Circle, CircleCheck, CircleX, Sparkles } from 'lucide-react';

import { kindColor, kindLabel } from '@/lib/kinds';
import { type Block, feedbackOf, type Workout } from '@/lib/types';

export function StatusIcon({ workout }: { workout: Workout }) {
  if (workout.status === 'completed') return <CircleCheck size={22} color="var(--success)" aria-label="Completed" />;
  if (workout.status === 'skipped') return <CircleX size={22} color="var(--faint)" aria-label="Skipped" />;
  return <Circle size={22} color="var(--faint)" aria-label="Planned" />;
}

export function WorkoutCard({ workout, onOpen }: { workout: Workout; onOpen: () => void }) {
  const color = kindColor(workout.kind);
  const fb = feedbackOf(workout);
  return (
    <button type="button" className="wcard" onClick={onOpen}>
      <span className="stripe" style={{ background: color }} />
      <span className="wbody">
        <span className="row">
          <span className="kind" style={{ color }}>{kindLabel(workout.kind).toUpperCase()}</span>
          <span className="muted small">{workout.duration_min ? `${workout.duration_min} min · ` : ''}{workout.intensity}</span>
          <span style={{ marginLeft: 'auto', display: 'flex' }}><StatusIcon workout={workout} /></span>
        </span>
        <span className="wtitle">{workout.title}</span>
        {workout.summary && <span className="muted">{workout.summary}</span>}
        <span className="preview">{workout.blocks.map((b) => b.title).join('  ·  ')}</span>
        {fb?.rpe ? <span className="muted small">Logged: RPE {fb.rpe}/10{fb.results ? ` · ${fb.results}` : ''}</span> : null}
        {workout.change_note && workout.status === 'planned' && (
          <span className="changed"><Sparkles size={13} /><span>Adjusted by coach: {workout.change_note}</span></span>
        )}
      </span>
    </button>
  );
}

export function BlockView({ block, index }: { block: Block; index: number }) {
  return (
    <section className="block">
      <div className="row" style={{ gap: 12 }}>
        <span className="badge">{String.fromCharCode(65 + index)}</span>
        <div className="grow">
          <h3>{block.title}</h3>
          {block.format && <div className="format">{block.format}</div>}
        </div>
      </div>
      <div>
        {block.items.map((item, i) => (
          <div key={i} className="item">
            <span className="movement">{item.movement}</span>
            <span className="rx">{item.prescription}</span>
            {item.notes && <span className="muted small">{item.notes}</span>}
          </div>
        ))}
      </div>
      {block.notes && <p className="blocknotes">{block.notes}</p>}
    </section>
  );
}
