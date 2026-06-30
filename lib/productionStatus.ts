// Shared production-night display logic.
//
// A production plan runs on the NIGHT OF its plan_date (the night before
// delivery) — it's a one-night event, not an open-ended state. So the status
// shown in the UI is derived from plan_date relative to today, NOT taken
// verbatim from the stored status. Used by both the manager dashboard and the
// production-worker dashboard so the whole app speaks the same language.
//
// This is a presentation layer only — the controllers and the State diagram
// (Draft → WaitingForMaterials → InProgress → Completed) are unchanged.

export const isInProgress = (s: string) => s === 'In Progress' || s === 'InProgress';
export const isWaiting = (s: string) => s === 'Waiting For Materials' || s === 'WaitingForMaterials';
export const isCancelled = (s: string) => s === 'Cancelled';

// Today's date in Israel time (servers run in UTC), as 'YYYY-MM-DD' for safe
// lexical comparison with the stored plan_date strings.
export function israelToday(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Jerusalem' });
}

export type Cycle = 'past' | 'today' | 'future';

export function productionCycle(planDate: string, today: string): Cycle {
  const d = (planDate || '').slice(0, 10);
  if (d < today) return 'past';
  if (d > today) return 'future';
  return 'today';
}

// Canonical display status:
//   'In Progress'           → "בייצור"        (only tonight's run)
//   'AwaitingProduction'    → "ממתין לייצור"   (a future night, not yet produced)
//   'Completed'             → "הושלם"          (its night has passed)
//   'Waiting For Materials' → "ממתין לחומרים"  (blocked, current/upcoming)
//   'Cancelled'             → "בוטל"
// ('AwaitingProduction' is a distinct key — 'Planned' already means a scheduled
//  delivery elsewhere in the app.)
export function productionDisplayStatus(dbStatus: string, cycle: Cycle): string {
  if (isCancelled(dbStatus)) return 'Cancelled';
  if (dbStatus === 'Completed') return 'Completed';
  if (isWaiting(dbStatus)) return cycle === 'past' ? 'Completed' : 'Waiting For Materials';
  if (isInProgress(dbStatus)) {
    if (cycle === 'future') return 'AwaitingProduction';
    if (cycle === 'today') return 'In Progress';
    return 'Completed'; // past production night → its run is over
  }
  return dbStatus;
}
