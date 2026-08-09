"use client";

import { createContext, use, useCallback, useEffect, useLayoutEffect, useMemo, useReducer, useState } from "react";
import { fixtureState } from "./fixtures";
import type { CeteleState, HabitDefinition, Theme } from "./types";
import type { DataAdapter } from "./loader";
import { persistAction } from "./persist-action";
import { previousDomainDate } from "./policy";

const STORAGE_KEY = "cetele-v1-state";

export type Action =
  | { type: "hydrate"; state: CeteleState }
  | { type: "toggle-completion"; assignmentId: string; amount?: number | null }
  | { type: "record-completion"; assignmentId: string; date: string; amount: number | null; note: string }
  | { type: "complete-yesterday"; assignmentId: string; note: string; amount: number | null }
  | { type: "set-completion-note"; assignmentId: string; date: string; note: string }
  | { type: "remove-completion"; assignmentId: string; date: string }
  | { type: "mark-reviewed" }
  | { type: "follow-up"; attentionId: string; note: string }
  | { type: "excuse"; studentId: string; assignmentId: string | null; date: string; note: string }
  | { type: "adopt"; definitionId: string }
  | { type: "create-definition"; definition: HabitDefinition }
  | { type: "assign"; definitionId: string; studentId: string; target: number | null }
  | { type: "end-assignment"; assignmentId: string }
  | { type: "customize-assignment"; assignmentId: string; accent: string; icon: "book" | "heart" | "walk" | "focus"; order: number }
  | { type: "reorder-assignments"; orderedIds: string[] }
  | { type: "invite"; name: string; email: string }
  | { type: "theme"; theme: Theme }
  | { type: "reminders"; key: "studentEnabled" | "mentorEnabled" | "studentTime" | "mentorTime"; value: boolean | string };

export function reduceCeteleState(state: CeteleState, action: Action): CeteleState {
  switch (action.type) {
    case "hydrate": return action.state;
    case "toggle-completion": {
      const exists = state.completions.some((item) => item.assignmentId === action.assignmentId && item.date === state.today);
      return { ...state, completions: exists
        ? state.completions.filter((item) => !(item.assignmentId === action.assignmentId && item.date === state.today))
        : [...state.completions, { assignmentId: action.assignmentId, date: state.today, amount: action.amount ?? null, retrospective: false, note: "" }] };
    }
    case "record-completion": {
      const completions = state.completions.filter((item) => !(item.assignmentId === action.assignmentId && item.date === action.date));
      completions.push({ assignmentId: action.assignmentId, date: action.date, amount: action.amount, retrospective: action.date !== state.today, note: action.note });
      const attention = action.date === previousDomainDate(state.today) ? state.attention.map((item) => {
        if (!item.triggerDates.includes(action.date) || !(item.contributingAssignmentIds ?? [item.assignmentId]).includes(action.assignmentId)) return item;
        const remaining = (item.contributingAssignmentIds ?? [item.assignmentId]).filter((id) => id !== action.assignmentId);
        return remaining.length ? { ...item, assignmentId: remaining[0], contributingAssignmentIds: remaining } : { ...item, state: "invalidated" as const };
      }) : state.attention;
      return { ...state, completions, attention };
    }
    case "complete-yesterday": {
      const yesterday = previousDomainDate(state.today);
      const completions = state.completions.filter((item) => !(item.assignmentId === action.assignmentId && item.date === yesterday));
      completions.push({ assignmentId: action.assignmentId, date: yesterday, amount: action.amount, retrospective: true, note: action.note });
      const attention = state.attention.map((item) => {
        if (!item.triggerDates.includes(yesterday) || !(item.contributingAssignmentIds ?? [item.assignmentId]).includes(action.assignmentId)) return item;
        const remaining = (item.contributingAssignmentIds ?? [item.assignmentId]).filter((id) => id !== action.assignmentId);
        return remaining.length ? { ...item, assignmentId: remaining[0], contributingAssignmentIds: remaining } : { ...item, state: "invalidated" as const };
      });
      return { ...state, completions, attention };
    }
    case "set-completion-note": return { ...state, completions: state.completions.map((item) => item.assignmentId === action.assignmentId && item.date === action.date ? { ...item, note: action.note } : item) };
    case "remove-completion": {
      const assignment = state.assignments.find((item) => item.id === action.assignmentId);
      const isExcused = assignment && state.excuses.some((item) => item.studentId === assignment.studentId && item.date === action.date && (item.assignmentId === null || item.assignmentId === action.assignmentId));
      return { ...state,
        completions: state.completions.filter((item) => !(item.assignmentId === action.assignmentId && item.date === action.date)),
        attention: isExcused || !assignment ? state.attention : state.attention.map((item) => {
          if (item.studentId !== assignment.studentId || !item.triggerDates.includes(action.date)) return item;
          const contributing = Array.from(new Set([...(item.contributingAssignmentIds ?? [item.assignmentId]), action.assignmentId]));
          return { ...item, state: "open" as const, assignmentId: contributing[0], contributingAssignmentIds: contributing };
        }),
      };
    }
    case "mark-reviewed": return state.reviews.some((item) => item.mentorId === state.currentUserId && item.date === state.today) ? state : { ...state, reviews: [...state.reviews, { mentorId: state.currentUserId, date: state.today, reviewedAt: new Date().toISOString() }] };
    case "follow-up": return { ...state, attention: state.attention.map((item) => item.id === action.attentionId ? { ...item, state: "followed-up", followedUpBy: state.currentUserId, followedUpAt: new Date().toISOString(), privateNote: action.note } : item) };
    case "excuse": return { ...state,
      excuses: [...state.excuses, { studentId: action.studentId, assignmentId: action.assignmentId, date: action.date, note: action.note, grantedBy: state.currentUserId }],
      attention: state.attention.map((item) => {
        if (item.studentId !== action.studentId || !item.triggerDates.includes(action.date)) return item;
        const remaining = action.assignmentId === null ? [] : (item.contributingAssignmentIds ?? [item.assignmentId]).filter((id) => id !== action.assignmentId);
        return remaining.length ? { ...item, assignmentId: remaining[0], contributingAssignmentIds: remaining } : { ...item, state: "invalidated" as const };
      }),
    };
    case "adopt": {
      const source = state.definitions.find((item) => item.id === action.definitionId);
      if (!source) return state;
      const copy: HabitDefinition = { ...source, id: `adopted-${source.id}`, authorId: state.currentUserId, visibility: "private", sourceAuthor: state.people.find((person) => person.id === source.authorId)?.name ?? source.sourceAuthor };
      return { ...state, definitions: state.definitions.some((item) => item.id === copy.id) ? state.definitions : [...state.definitions, copy] };
    }
    case "create-definition": return { ...state, definitions: [...state.definitions, { ...action.definition, creatorName: state.people.find((person) => person.id === state.currentUserId)?.name }] };
    case "assign": {
      if (state.assignments.some((item) => item.definitionId === action.definitionId && item.studentId === action.studentId && item.status === "active")) return state;
      const definition = state.definitions.find((item) => item.id === action.definitionId);
      if (!definition) return state;
      return { ...state, assignments: [...state.assignments, { id: `${action.studentId}-${action.definitionId}`, definitionId: action.definitionId, studentId: action.studentId, assignedBy: state.currentUserId, target: action.target ?? definition.defaultTarget, accent: "#ff913f", icon: "heart", order: 99, status: "active" }] };
    }
    case "end-assignment": {
      const hasCompletion = state.completions.some((item) => item.assignmentId === action.assignmentId);
      return { ...state, assignments: hasCompletion
        ? state.assignments.map((item) => item.id === action.assignmentId ? { ...item, status: "ended" } : item)
        : state.assignments.filter((item) => item.id !== action.assignmentId) };
    }
    case "customize-assignment": return { ...state, assignments: state.assignments.map((item) => item.id === action.assignmentId ? { ...item, accent: action.accent, icon: action.icon, order: action.order } : item) };
    case "reorder-assignments": {
      const orderById = new Map(action.orderedIds.map((id, order) => [id, order]));
      return { ...state, assignments: state.assignments.map((item) => orderById.has(item.id) ? { ...item, order: orderById.get(item.id) ?? item.order } : item) };
    }
    case "invite": {
      const id = `invite-${Date.now()}`;
      return { ...state, people: [...state.people, { id, name: action.name, initials: action.name.split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase(), mentorId: state.currentUserId, invitation: "pending" }] };
    }
    case "theme": return { ...state, theme: action.theme };
    case "reminders": return { ...state, reminders: { ...state.reminders, [action.key]: action.value } };
  }
}

type StoreValue = { state: CeteleState; dispatch: React.Dispatch<Action>; reset: () => void; adapter: DataAdapter };
const StoreContext = createContext<StoreValue | null>(null);

export function CeteleProvider({ children, initialState = fixtureState, adapter = "local" }: { children: React.ReactNode; initialState?: CeteleState; adapter?: DataAdapter }) {
  const [state, rawDispatch] = useReducer(reduceCeteleState, initialState);
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (adapter === "local" && raw) rawDispatch({ type: "hydrate", state: JSON.parse(raw) as CeteleState });
    const ready = window.setTimeout(() => setHydrated(true), 0);
    return () => window.clearTimeout(ready);
  }, [adapter]);
  useLayoutEffect(() => { if (hydrated && adapter === "local") localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }, [adapter, hydrated, state]);
  useLayoutEffect(() => { document.documentElement.dataset.theme = state.theme; }, [state.theme]);
  const dispatch = useCallback((action: Action) => {
    if (adapter === "local") {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(reduceCeteleState(state, action)));
      rawDispatch(action);
    }
    else void persistAction(action, state).then(() => window.location.reload());
  }, [adapter, state]);
  const value = useMemo(() => ({ state, dispatch, adapter, reset: () => rawDispatch({ type: "hydrate", state: fixtureState }) }), [adapter, dispatch, state]);
  return <StoreContext value={value}>{children}</StoreContext>;
}

export function useCetele() {
  const value = use(StoreContext);
  if (!value) throw new Error("useCetele must be used within CeteleProvider");
  return value;
}
