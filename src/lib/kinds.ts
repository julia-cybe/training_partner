// Colour and label per workout kind.
const COLORS: Record<string, string> = {
  strength: '#5b8cff', metcon: '#ff5a1f', run: '#2fbf71', hybrid: '#b57bff', endurance: '#20c1c9',
  gymnastics: '#f5b82e', recovery: '#8a94a6', rest: '#4a505b',
};
const LABELS: Record<string, string> = {
  strength: 'Strength', metcon: 'Metcon', run: 'Run', hybrid: 'Hybrid', endurance: 'Endurance',
  gymnastics: 'Gymnastics', recovery: 'Recovery', rest: 'Rest',
};
export const kindColor = (kind: string) => COLORS[kind] ?? COLORS.hybrid;
export const kindLabel = (kind: string) => LABELS[kind] ?? kind;
