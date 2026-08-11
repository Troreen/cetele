import { afterEach, describe, expect, it, vi } from "vitest";
import { fixtureState } from "@/modules/cetele/fixtures";

const actions = vi.hoisted(() => ({
  adoptHabitDefinition: vi.fn(),
  assignHabitDefinition: vi.fn(),
  createHabitDefinition: vi.fn(),
  createManualInvitation: vi.fn(),
  customizeHabitAssignment: vi.fn(),
  endHabitAssignment: vi.fn(),
  grantExcusedDay: vi.fn(),
  markDailyReview: vi.fn(),
  recordCompletion: vi.fn(),
  recordFollowUp: vi.fn(),
  removeCompletion: vi.fn(),
  reorderHabitAssignments: vi.fn(),
  revokeManualInvitation: vi.fn(),
  saveReminderPreferences: vi.fn(),
  saveTheme: vi.fn(),
  saveViewPreferences: vi.fn(),
}));

vi.mock("@/modules/cetele/actions", () => actions);

import { persistAction } from "@/modules/cetele/persist-action";

describe("hosted action persistence", () => {
  afterEach(() => vi.clearAllMocks());

  it("persists assignment ordering through one atomic Server Action", async () => {
    const orderedIds = ["mentor-focus", "mentor-reading"];

    await persistAction({ type: "reorder-assignments", orderedIds }, fixtureState);

    expect(actions.reorderHabitAssignments).toHaveBeenCalledOnce();
    expect(actions.reorderHabitAssignments).toHaveBeenCalledWith({ orderedIds });
    expect(actions.customizeHabitAssignment).not.toHaveBeenCalled();
  });

  it("persists one Habit Assignment reminder without overwriting the others", async () => {
    await persistAction({ type: "habit-reminder", assignmentId: "mentor-focus", enabled: false, time: "19:15" }, fixtureState);

    expect(actions.saveReminderPreferences).toHaveBeenCalledWith({
      ...fixtureState.reminders,
      habits: {
        ...fixtureState.reminders.habits,
        "mentor-focus": { enabled: false, time: "19:15" },
      },
    });
  });

  it("persists calendar label preferences together", async () => {
    await persistAction({ type: "view-preferences", showMonthLabels: false, showDayLabels: true }, fixtureState);

    expect(actions.saveViewPreferences).toHaveBeenCalledWith({ showMonthLabels: false, showDayLabels: true });
  });
});
