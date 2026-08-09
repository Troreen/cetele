"use client";

import type { Action } from "./store";
import type { CeteleState } from "./types";
import { adoptHabitDefinition, assignHabitDefinition, createHabitDefinition, customizeHabitAssignment, endHabitAssignment, grantExcusedDay, inviteDirectStudent, markDailyReview, recordCompletion, recordFollowUp, removeCompletion, saveReminderPreferences, saveTheme } from "./actions";
import { previousDomainDate } from "./policy";

export async function persistAction(action: Action, state: CeteleState) {
  switch (action.type) {
    case "toggle-completion":
      if (state.completions.some((item) => item.assignmentId === action.assignmentId && item.date === state.today)) {
        await removeCompletion({ assignmentId: action.assignmentId, date: state.today });
      } else {
        await recordCompletion({ assignmentId: action.assignmentId, date: state.today, amount: action.amount ?? null, note: "" });
      }
      return;
    case "record-completion": await recordCompletion({ assignmentId: action.assignmentId, date: action.date, amount: action.amount, note: action.note }); return;
    case "mark-reviewed": await markDailyReview({ date: state.today }); return;
    case "follow-up": await recordFollowUp({ attentionId: action.attentionId, note: action.note }); return;
    case "complete-yesterday": await recordCompletion({ assignmentId: action.assignmentId, date: previousDomainDate(state.today), amount: action.amount, note: action.note }); return;
    case "set-completion-note": {
      const completion = state.completions.find((item) => item.assignmentId === action.assignmentId && item.date === action.date);
      await recordCompletion({ assignmentId: action.assignmentId, date: action.date, amount: completion?.amount ?? null, note: action.note }); return;
    }
    case "remove-completion": await removeCompletion({ assignmentId: action.assignmentId, date: action.date }); return;
    case "excuse": await grantExcusedDay({ studentId: action.studentId, assignmentId: action.assignmentId, date: action.date, note: action.note }); return;
    case "adopt": await adoptHabitDefinition({ definitionId: action.definitionId }); return;
    case "create-definition": await createHabitDefinition(action.definition); return;
    case "assign": await assignHabitDefinition({ definitionId: action.definitionId, studentId: action.studentId, target: action.target }); return;
    case "end-assignment": await endHabitAssignment({ assignmentId: action.assignmentId, reason: "Yanlış atama düzeltmesi" }); return;
    case "customize-assignment": await customizeHabitAssignment({ assignmentId: action.assignmentId, accent: action.accent, icon: action.icon, order: action.order }); return;
    case "reorder-assignments": await Promise.all(action.orderedIds.map((assignmentId, order) => {
      const assignment = state.assignments.find((item) => item.id === assignmentId);
      return assignment ? customizeHabitAssignment({ assignmentId, accent: assignment.accent, icon: assignment.icon, order }) : Promise.resolve();
    })); return;
    case "invite": await inviteDirectStudent({ name: action.name, email: action.email }); return;
    case "theme": await saveTheme({ theme: action.theme }); return;
    case "reminders": await saveReminderPreferences({ ...state.reminders, [action.key]: action.value }); return;
    case "hydrate": return;
  }
}
