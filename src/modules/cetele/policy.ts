export type HabitMode = "binary" | "quantitative";
export type HistoryState = "completed" | "missed" | "excused";

type CompletionInput = {
  mode: HabitMode;
  amount: number | null;
  target: number | null;
};

type HistoryDay = { date: string; state: HistoryState };

type SharedHabit = {
  id: string;
  authorId: string;
  name: string;
  guide: string;
};

const DAY_MS = 86_400_000;

function epochDay(date: string): number {
  const [year, month, day] = date.split("-").map(Number);
  return Math.floor(Date.UTC(year, month - 1, day) / DAY_MS);
}

export function previousDomainDate(date: string): string {
  const [year, month, day] = date.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day - 1)).toISOString().slice(0, 10);
}

export function canEditCompletion(date: string, today: string): boolean {
  const offset = epochDay(today) - epochDay(date);
  return offset === 0 || offset === 1;
}

export function isMeaningfulCompletion(input: CompletionInput): boolean {
  return input.mode === "binary" || (input.amount ?? 0) > 0;
}

export function deriveAttention(
  missedDates: string[],
  completedDates: string[],
  today: string,
): { state: "open" | "invalidated"; triggerDates: string[] } | null {
  const misses = missedDates.toSorted();
  for (let index = misses.length - 1; index > 0; index -= 1) {
    const previous = misses[index - 1];
    const current = misses[index];
    if (epochDay(current) - epochDay(previous) !== 1 || epochDay(today) - epochDay(current) < 1) continue;
    return {
      state: completedDates.includes(previous) || completedDates.includes(current) ? "invalidated" : "open",
      triggerDates: [previous, current],
    };
  }
  return null;
}

export function calculateStreaks(days: HistoryDay[]): { current: number; best: number } {
  let current = 0;
  let best = 0;
  for (const day of days.toSorted((a, b) => a.date.localeCompare(b.date))) {
    if (day.state === "completed") {
      current += 1;
      best = Math.max(best, current);
    } else if (day.state === "missed") {
      current = 0;
    }
  }
  return { current, best };
}

export function visibilityFor(
  viewerId: string,
  subjectId: string,
  parents: ReadonlyMap<string, string>,
): "subject" | "mentor-above" | "none" {
  if (viewerId === subjectId) return "subject";
  let cursor = parents.get(subjectId);
  const visited = new Set<string>();
  while (cursor && !visited.has(cursor)) {
    if (cursor === viewerId) return "mentor-above";
    visited.add(cursor);
    cursor = parents.get(cursor);
  }
  return "none";
}

export function adoptSharedHabit(source: SharedHabit, adopterId: string, id: string) {
  return {
    id,
    authorId: adopterId,
    sourceDefinitionId: source.id,
    sourceAuthorId: source.authorId,
    name: source.name,
    guide: source.guide,
  };
}
