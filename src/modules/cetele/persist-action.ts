"use client";

import type { Action } from "./store";
import type { CeteleState } from "./types";
import {
  adoptHabitDefinition,
  assignHabitDefinition,
  createHabitDefinition,
  createManualInvitation,
  customizeHabitAssignment,
  endHabitAssignment,
  grantExcusedDay,
  markDailyReview,
  recordCompletion,
  recordFollowUp,
  removeCompletion,
  reorderHabitAssignments,
  revokeManualInvitation,
  saveReminderPreferences,
  saveTheme,
  saveViewPreferences,
} from "./actions";
import { previousDomainDate } from "./policy";

type PersistableAction = Exclude<Action, { type: "hydrate" | "url-theme" }>;
type PersistenceHandler<Type extends PersistableAction["type"]> = (
  action: Extract<PersistableAction, { type: Type }>,
  state: CeteleState,
) => Promise<void>;

const persistenceHandlers = {
  "toggle-completion": async (action, state) => {
    if (state.completions.some((item) => item.assignmentId === action.assignmentId && item.date === state.today)) {
      await removeCompletion({ assignmentId: action.assignmentId, date: state.today });
    } else {
      await recordCompletion({ assignmentId: action.assignmentId, date: state.today, amount: action.amount ?? null, note: "" });
    }
  },
  "record-completion": async (action) => recordCompletion({ assignmentId: action.assignmentId, date: action.date, amount: action.amount, note: action.note }),
  "mark-reviewed": async (_action, state) => markDailyReview({ date: state.today }),
  "follow-up": async (action) => recordFollowUp({ attentionId: action.attentionId, note: action.note }),
  "complete-yesterday": async (action, state) => recordCompletion({ assignmentId: action.assignmentId, date: previousDomainDate(state.today), amount: action.amount, note: action.note }),
  "set-completion-note": async (action, state) => {
    const completion = state.completions.find((item) => item.assignmentId === action.assignmentId && item.date === action.date);
    await recordCompletion({ assignmentId: action.assignmentId, date: action.date, amount: completion?.amount ?? null, note: action.note });
  },
  "remove-completion": async (action) => removeCompletion({ assignmentId: action.assignmentId, date: action.date }),
  excuse: async (action) => grantExcusedDay({ studentId: action.studentId, assignmentId: action.assignmentId, date: action.date, note: action.note }),
  adopt: async (action) => adoptHabitDefinition({ definitionId: action.definitionId }),
  "create-definition": async (action) => createHabitDefinition(action.definition),
  assign: async (action) => assignHabitDefinition({ definitionId: action.definitionId, studentId: action.studentId, target: action.target }),
  "end-assignment": async (action) => endHabitAssignment({ assignmentId: action.assignmentId, reason: "Yanlış atama düzeltmesi" }),
  "customize-assignment": async (action) => customizeHabitAssignment({ assignmentId: action.assignmentId, accent: action.accent, icon: action.icon, order: action.order }),
  "reorder-assignments": async (action) => reorderHabitAssignments({ orderedIds: action.orderedIds }),
  invite: async (action) => { await createManualInvitation({ name: action.name }); },
  "revoke-invitation": async (action) => revokeManualInvitation({ invitationId: action.invitationId }),
  theme: async (action) => saveTheme({ theme: action.theme }),
  "view-preferences": async (action) => saveViewPreferences({ showMonthLabels: action.showMonthLabels, showDayLabels: action.showDayLabels }),
  "habit-reminder": async (action, state) => saveReminderPreferences({ ...state.reminders, habits: { ...state.reminders.habits, [action.assignmentId]: { enabled: action.enabled, time: action.time } } }),
  "mentor-reminder": async (action, state) => saveReminderPreferences({ ...state.reminders, mentorEnabled: action.enabled, mentorTime: action.time }),
} satisfies { [Type in PersistableAction["type"]]: PersistenceHandler<Type> };

export async function persistAction(action: Action, state: CeteleState) {
  if (action.type === "hydrate" || action.type === "url-theme") return;
  const handler = persistenceHandlers[action.type] as (
    selectedAction: PersistableAction,
    currentState: CeteleState,
  ) => Promise<void>;
  await handler(action, state);
}
