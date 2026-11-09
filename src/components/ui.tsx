import { type LucideIcon } from 'lucide-react';
import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, TextareaHTMLAttributes } from 'react';

export const errorMessage = (e: unknown) =>
  e instanceof Error ? e.message : typeof e === 'object' && e && 'message' in e ? String(e.message) : 'Something went wrong';

export const Spinner = () => <span className="spinner" aria-label="Loading" />;

export function Title({ children }: { children: ReactNode }) {
  return <h1 className="title">{children}</h1>;
}
export function Label({ children, style }: { children: ReactNode; style?: React.CSSProperties }) {
  return <div className="label" style={style}>{children}</div>;
}
export function Body({ children, muted, small, pre }: { children: ReactNode; muted?: boolean; small?: boolean; pre?: boolean }) {
  return <p className={['body', muted && 'muted', small && 'small', pre && 'pre'].filter(Boolean).join(' ')}>{children}</p>;
}
export function Card({ children, accent, className = '' }: { children: ReactNode; accent?: boolean; className?: string }) {
  return <section className={`card ${accent ? 'accent' : ''} ${className}`}>{children}</section>;
}
export function ErrorText({ error }: { error: string | null }) {
  return error ? <p className="error" role="alert">{error}</p> : null;
}

export function Button({ title, icon: Icon, variant = 'primary', loading, className = '', ...props }: {
  title?: string; icon?: LucideIcon; variant?: 'primary' | 'secondary' | 'ghost' | 'danger'; loading?: boolean;
} & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button type="button" {...props} disabled={props.disabled || loading}
      className={`btn ${variant} ${title ? '' : 'icon'} ${className}`}>
      {loading ? <Spinner /> : (<>{Icon && <Icon size={18} />}{title}</>)}
    </button>
  );
}

export function Field({ label, hint, multiline, ...props }: { label: string; hint?: string; multiline?: boolean }
  & InputHTMLAttributes<HTMLInputElement> & TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <label className="field">
      <span className="label">{label}</span>
      {multiline
        ? <textarea className="input" {...(props as TextareaHTMLAttributes<HTMLTextAreaElement>)} />
        : <input className="input" {...(props as InputHTMLAttributes<HTMLInputElement>)} />}
      {hint && <span className="hint">{hint}</span>}
    </label>
  );
}

export function Chip({ label, selected, onClick, color }: { label: string; selected?: boolean; onClick?: () => void; color?: string }) {
  return (
    <button type="button" className={`chip ${selected ? 'on' : ''}`} aria-pressed={selected} onClick={onClick}
      style={selected && color ? { background: color, borderColor: color } : undefined}>
      {label}
    </button>
  );
}

export function ScalePicker({ label, value, onChange, min = 1, max = 5, low, high }: {
  label: string; value: number | null; onChange: (v: number) => void; min?: number; max?: number; low?: string; high?: string;
}) {
  const values = Array.from({ length: max - min + 1 }, (_, i) => min + i);
  return (
    <div className="stack-sm">
      <Label>{label}</Label>
      <div className="scale">
        {values.map((v) => (
          <button key={v} type="button" className={value === v ? 'on' : ''} aria-label={`${label} ${v}`} onClick={() => onChange(v)}>{v}</button>
        ))}
      </div>
      {(low || high) && <div className="scale-legend"><span className="hint">{low}</span><span className="hint">{high}</span></div>}
    </div>
  );
}

export function Empty({ icon: Icon, title, children }: { icon: LucideIcon; title: string; children?: ReactNode }) {
  return (
    <div className="empty">
      <Icon size={36} />
      <p>{title}</p>
      {children}
    </div>
  );
}
