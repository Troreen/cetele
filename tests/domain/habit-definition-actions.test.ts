import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ requireUser: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: vi.fn(),
  requireUser: mocks.requireUser,
}));
vi.mock("@/lib/supabase/admin", () => ({ createSupabaseAdminClient: vi.fn() }));

import { adoptHabitDefinition, createHabitDefinition, recordCompletion, reorderHabitAssignments, saveReminderPreferences } from "@/modules/cetele/actions";

function authorClient() {
  const rpc = vi.fn().mockResolvedValue({ error: null });
  const responsibilityMaybeSingle = vi.fn().mockResolvedValue({ data: { student_id: "student-id" }, error: null });
  const responsibilityLimit = vi.fn(() => ({ maybeSingle: responsibilityMaybeSingle }));
  const responsibilityEqStatus = vi.fn(() => ({ limit: responsibilityLimit }));
  const responsibilityEqMentor = vi.fn(() => ({ eq: responsibilityEqStatus }));
  const responsibilitySelect = vi.fn(() => ({ eq: responsibilityEqMentor }));
  const profileSingle = vi.fn().mockResolvedValue({ data: { alias: "Mert" }, error: null });
  const profileEq = vi.fn(() => ({ single: profileSingle }));
  const profileSelect = vi.fn(() => ({ eq: profileEq }));
  const from = vi.fn((table: string) => table === "profiles" ? { select: profileSelect } : { select: responsibilitySelect });
  const supabase = { from, rpc };
  return { rpc, supabase };
}

describe("Habit Definition and ordering actions", () => {
  afterEach(() => vi.clearAllMocks());

  it("creates a Habit Definition through the canonical authenticated RPC", async () => {
    const client = authorClient();
    mocks.requireUser.mockResolvedValue({ user: { id: "mentor-id" }, supabase: client.supabase });

    await createHabitDefinition({
      id: "client-only-id",
      name: "Günlük okuma",
      description: "Açıklama",
      guide: "Rehber",
      why: "Neden",
      completionDefinition: "Anlamlı bir okuma",
      tips: "İpucu",
      mode: "quantitative",
      defaultTarget: 10,
      visibility: "shared",
    });

    expect(client.rpc).toHaveBeenCalledWith("create_habit_definition", {
      p_name: "Günlük okuma",
      p_description: "Açıklama",
      p_guide: "Rehber",
      p_why_it_matters: "Neden",
      p_completion_definition: "Anlamlı bir okuma",
      p_practical_tips: "İpucu",
      p_mode: "quantitative",
      p_default_target: 10,
      p_visibility: "shared",
    });
  });

  it("adopts a Shared Habit through the provenance-preserving RPC", async () => {
    const client = authorClient();
    mocks.requireUser.mockResolvedValue({ user: { id: "mentor-id" }, supabase: client.supabase });

    await adoptHabitDefinition({ definitionId: "2eec5f4a-cb74-46fd-bb66-080bcf87bd9c" });

    expect(client.rpc).toHaveBeenCalledWith("adopt_habit_definition", {
      p_source_definition_id: "2eec5f4a-cb74-46fd-bb66-080bcf87bd9c",
    });
  });

  it("reorders active assignments through one validated RPC", async () => {
    const rpc = vi.fn().mockResolvedValue({ error: null });
    mocks.requireUser.mockResolvedValue({ user: { id: "student-id" }, supabase: { rpc } });
    const orderedIds = [
      "dc4ea32b-b7f3-4eaa-b585-2f3373393e21",
      "467caea0-6703-46f3-953d-d79fc563b9f0",
    ];

    await reorderHabitAssignments({ orderedIds });

    expect(rpc).toHaveBeenCalledWith("reorder_habit_assignments", { p_assignment_ids: orderedIds });
  });

  it("rejects a fractional completion amount before persistence", async () => {
    await expect(recordCompletion({
      assignmentId: "dc4ea32b-b7f3-4eaa-b585-2f3373393e21",
      date: "2026-08-09",
      amount: 1.5,
      note: "",
    })).rejects.toMatchObject({ name: "ZodError" });
    expect(mocks.requireUser).not.toHaveBeenCalled();
  });

  it("persists reminders keyed by Habit Assignment", async () => {
    const upsert = vi.fn().mockResolvedValue({ error: null });
    const from = vi.fn(() => ({ upsert }));
    mocks.requireUser.mockResolvedValue({ user: { id: "student-id" }, supabase: { from } });

    await saveReminderPreferences({ habits: { "assignment-id": { enabled: true, time: "19:45" } }, mentorEnabled: true, mentorTime: "21:00" });

    expect(upsert).toHaveBeenCalledWith({ user_id: "student-id", habit_reminders: { "assignment-id": { enabled: true, time: "19:45" } }, mentor_enabled: true, mentor_time: "21:00" });
  });
});
