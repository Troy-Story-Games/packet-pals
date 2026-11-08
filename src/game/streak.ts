export interface Streak {
  count: number;
  lastDay: string | null;
}

/** Local calendar day as YYYY-MM-DD. */
export function today(date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function daysBetween(a: string, b: string): number {
  return Math.round((Date.parse(b) - Date.parse(a)) / 86_400_000);
}

/** Updates the streak for a visit on `day`. Missing a day resets it to 1. */
export function visitStreak(streak: Streak, day: string): Streak {
  if (streak.lastDay === day) return streak;
  const continues = streak.lastDay !== null && daysBetween(streak.lastDay, day) === 1;
  return { count: continues ? streak.count + 1 : 1, lastDay: day };
}
