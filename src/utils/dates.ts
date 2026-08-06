export function toISODate(d: Date): string {
  // Local date components, NOT toISOString() — toISOString() converts to UTC first, which
  // silently shifts the date backward for any timezone ahead of UTC (all of Norway, always).
  // That bug was the actual cause of "forward navigation does nothing": the +1 day intent
  // got cancelled out by the UTC rollback on every call.
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
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

export function weekNumber(iso: string): number {
  return Number(isoWeekKey(iso).split("-W")[1]);
}

export function formatMonthLabel(iso: string): string {
  const label = fromISODate(iso).toLocaleDateString("nb-NO", { month: "long", year: "numeric" });
  return label.charAt(0).toUpperCase() + label.slice(1);
}

export function formatShortDayLabel(iso: string): string {
  const label = fromISODate(iso).toLocaleDateString("nb-NO", { weekday: "short" });
  return label.charAt(0).toUpperCase() + label.slice(1).replace(".", "");
}

export function dayOfMonth(iso: string): number {
  return fromISODate(iso).getDate();
}

export function addMonths(iso: string, months: number): string {
  const d = fromISODate(iso);
  return toISODate(new Date(d.getFullYear(), d.getMonth() + months, 1));
}

/** All dates to show in a calendar-month grid, including the leading/trailing days from adjacent weeks. */
export function getMonthGridDates(anchorIso: string): string[] {
  const firstOfMonth = startOfMonth(anchorIso);
  const lastOfMonth = endOfMonth(anchorIso);
  const gridStart = startOfWeek(firstOfMonth);
  const gridEnd = addDays(startOfWeek(lastOfMonth), 6);
  const dates: string[] = [];
  let d = gridStart;
  while (d <= gridEnd) {
    dates.push(d);
    d = addDays(d, 1);
  }
  return dates;
}

export function isSameMonth(iso: string, anchorIso: string): boolean {
  return monthKey(iso) === monthKey(anchorIso);
}

export function todayISO(): string {
  return toISODate(new Date());
}
