// Dates are plain 'YYYY-MM-DD' strings in the athlete's local time zone.

const pad = (n: number) => String(n).padStart(2, '0');

export const toISO = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

export const fromISO = (iso: string) => {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
};

export const today = () => toISO(new Date());

export const addDays = (iso: string, days: number) => {
  const d = fromISO(iso);
  d.setDate(d.getDate() + days);
  return toISO(d);
};

/** Monday of the week containing `iso`. */
export const startOfWeek = (iso: string) => {
  const d = fromISO(iso);
  const offset = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - offset);
  return toISO(d);
};

export const startOfMonth = (iso: string) => `${iso.slice(0, 7)}-01`;

export const addMonths = (iso: string, months: number) => {
  const d = fromISO(startOfMonth(iso));
  d.setMonth(d.getMonth() + months);
  return toISO(d);
};

const WEEKDAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

export const weekdayShort = (iso: string) => WEEKDAY_SHORT[fromISO(iso).getDay()];
export const dayOfMonth = (iso: string) => fromISO(iso).getDate();
export const monthLabel = (iso: string) => `${MONTHS[fromISO(iso).getMonth()]} ${fromISO(iso).getFullYear()}`;

export const longLabel = (iso: string) => {
  const t = today();
  if (iso === t) return 'Today';
  if (iso === addDays(t, 1)) return 'Tomorrow';
  if (iso === addDays(t, -1)) return 'Yesterday';
  const d = fromISO(iso);
  return `${WEEKDAY_SHORT[d.getDay()]}, ${MONTHS[d.getMonth()].slice(0, 3)} ${d.getDate()}`;
};

export const formatDuration = (seconds: number) => {
  const h = Math.floor(seconds / 3600);
  const m = Math.round((seconds % 3600) / 60);
  return h ? `${h}h ${pad(m)}m` : `${m} min`;
};

export const formatPace = (metersPerSecond: number) => {
  const secPerKm = 1000 / metersPerSecond;
  return `${Math.floor(secPerKm / 60)}:${pad(Math.round(secPerKm % 60))}/km`;
};

/** The device's IANA time zone; the weekly plan is written on Sunday evening in this zone. */
export const deviceTimeZone = () => Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
