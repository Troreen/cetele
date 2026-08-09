import type { CeteleState } from "./types";

export function person(state: CeteleState, id: string) {
  return state.people.find((item) => item.id === id);
}

export function definition(state: CeteleState, id: string) {
  return state.definitions.find((item) => item.id === id);
}

export function assignmentsFor(state: CeteleState, studentId: string) {
  return state.assignments
    .filter((item) => item.studentId === studentId && item.status === "active")
    .toSorted((a, b) => a.order - b.order);
}

export function directStudents(state: CeteleState, mentorId = state.currentUserId) {
  return state.people.filter((item) => item.mentorId === mentorId);
}

export function branchStudents(state: CeteleState, mentorId = state.currentUserId) {
  const result: CeteleState["people"] = [];
  const queue = directStudents(state, mentorId).map((person) => person.id);
  const visited = new Set<string>();
  while (queue.length) {
    const id = queue.shift();
    if (!id || visited.has(id)) continue;
    visited.add(id);
    const member = person(state, id);
    if (member) result.push(member);
    queue.push(...directStudents(state, id).map((child) => child.id));
  }
  return result;
}

export function completionFor(state: CeteleState, assignmentId: string, date: string) {
  return state.completions.find((item) => item.assignmentId === assignmentId && item.date === date);
}

export function recentDates(today: string, count = 7) {
  const base = new Date(`${today}T12:00:00Z`);
  return Array.from({ length: count }, (_, index) => {
    const date = new Date(base);
    date.setUTCDate(base.getUTCDate() - (count - 1 - index));
    return date.toISOString().slice(0, 10);
  });
}

export function currentWeekDates(today: string) {
  const date = new Date(`${today}T12:00:00Z`);
  const mondayOffset = (date.getUTCDay() + 6) % 7;
  date.setUTCDate(date.getUTCDate() - mondayOffset);
  return Array.from({ length: 7 }, (_, index) => {
    const weekday = new Date(date);
    weekday.setUTCDate(date.getUTCDate() + index);
    return weekday.toISOString().slice(0, 10);
  });
}

export function aggregateCompletionRatio(state: CeteleState, studentIds: string[], date = state.today) {
  const visibleStudents = new Set(studentIds);
  const assignments = state.assignments.filter((item) => item.status === "active" && visibleStudents.has(item.studentId));
  const eligible = assignments.filter((assignment) => !state.excuses.some((excuse) =>
    excuse.studentId === assignment.studentId
      && excuse.date === date
      && (excuse.assignmentId === null || excuse.assignmentId === assignment.id)));
  return {
    done: eligible.filter((assignment) => completionFor(state, assignment.id, date)).length,
    total: eligible.length,
  };
}

export function completionRatio(state: CeteleState, studentId: string, date = state.today) {
  const assignments = assignmentsFor(state, studentId);
  if (!assignments.length) return { done: 0, total: 0 };
  return { done: assignments.filter((item) => completionFor(state, item.id, date)).length, total: assignments.length };
}
