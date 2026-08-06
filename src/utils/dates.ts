export function toISODate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function fromISODate(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function addDays(iso: string, days: number): string {
  const d = fromISODate(iso);
  d.setDate(d.getDate() + days);
  return toISODate(d);
}

export function startOfWeek(iso: string): string {
  const d = fromISODate(iso);
  const dow = d.getDay(); // 0 = søndag
  const diffToMonday = dow === 0 ? -6 : 1 - dow;
  d.setDate(d.getDate() + diffToMonday);
  return toISODate(d);
}

export function getWeekDates(anchorIso: string): string[] {
  const monday = startOfWeek(anchorIso);
  return Array.from({ length: 7 }, (_, i) => addDays(monday, i));
}

export function startOfMonth(iso: string): string {
  const d = fromISODate(iso);
  return toISODate(new Date(d.getFullYear(), d.getMonth(), 1));
}

export function endOfMonth(iso: string): string {
  const d = fromISODate(iso);
  return toISODate(new Date(d.getFullYear(), d.getMonth() + 1, 0));
}

export function isoWeekKey(iso: string): string {
  const d = fromISODate(iso);
  const target = new Date(d.valueOf());
  const dayNr = (d.getDay() + 6) % 7;
  target.setDate(target.getDate() - dayNr + 3);
  const firstThursday = target.valueOf();
  target.setMonth(0, 1);
  if (target.getDay() !== 4) target.setMonth(0, 1 + ((4 - target.getDay() + 7) % 7));
  const week = 1 + Math.round((firstThursday - target.valueOf()) / (7 * 24 * 60 * 60 * 1000));
  return `${d.getFullYear()}-W${String(week).padStart(2, "0")}`;
}

export function monthKey(iso: string): string {
  return iso.slice(0, 7); // yyyy-mm
}

export function formatDayLabel(iso: string): string {
  const label = fromISODate(iso).toLocaleDateString("nb-NO", { weekday: "long" });
  return label.charAt(0).toUpperCase() + label.slice(1);
}

export function formatDayDateLabel(iso: string): string {
  return fromISODate(iso).toLocaleDateString("nb-NO", { weekday: "long", day: "numeric", month: "long" });
}

export function isSameDay(a: string, b: string): boolean {
  return a === b;
}

export function todayISO(): string {
  return toISODate(new Date());
}
