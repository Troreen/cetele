import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/server", () => ({ requireUser: vi.fn() }));

import { requireUser } from "@/lib/supabase/server";
import { loadCeteleState } from "@/modules/cetele/loader";

type QueryResult = { data: unknown; error: null };
type MockQuery = PromiseLike<QueryResult> & {
  select: (...args: unknown[]) => MockQuery;
  in: (...args: unknown[]) => MockQuery;
  eq: (...args: unknown[]) => MockQuery;
  is: (...args: unknown[]) => MockQuery;
  order: (...args: unknown[]) => MockQuery;
  maybeSingle: (...args: unknown[]) => Promise<QueryResult>;
};

function query(result: QueryResult): MockQuery {
  const builder: MockQuery = {
    select: () => builder,
    in: () => builder,
    eq: () => builder,
    is: () => builder,
    order: () => builder,
    maybeSingle: () => Promise.resolve(result),
    then: (onfulfilled, onrejected) => Promise.resolve(result).then(onfulfilled, onrejected),
  };
  return builder;
}

describe("loadCeteleState assignment visibility", () => {
  beforeEach(() => {
    vi.mocked(requireUser).mockReset();
    process.env.NEXT_PUBLIC_CETELE_DATA_ADAPTER = "supabase";
  });

  it("omits void assignments instead of exposing them as ended history", async () => {
    const assignment = {
      definition_id: "definition",
      student_id: "subject",
      assigned_by: "mentor",
      created_at: "2026-08-02T22:30:00.000Z",
      ended_at: null,
      target: null,
      assignment_preferences: [],
    };
    const results: Record<string, QueryResult> = {
      profiles: { data: [{ id: "subject", alias: "Ayşe", timezone: "Europe/Stockholm", group_name: null, theme: "dark" }], error: null },
      mentorship_invitations: { data: [{ id: "invitation", mentor_id: "mentor", expires_at: "2026-08-12T12:00:00.000Z" }], error: null },
      mentorship_relationships: { data: [], error: null },
      habit_definitions: { data: [], error: null },
      habit_assignments: { data: [
        { ...assignment, id: "active", status: "active" },
        { ...assignment, id: "ended", status: "ended", ended_at: "2026-08-08T22:30:00.000Z" },
        { ...assignment, id: "void", status: "void" },
      ], error: null },
      completions: { data: [], error: null },
      attention_items: { data: [], error: null },
      followups: { data: [], error: null },
      daily_reviews: { data: [], error: null },
      excused_days: { data: [], error: null },
      reminder_preferences: { data: null, error: null },
    };
    const supabase = {
      rpc: vi.fn().mockResolvedValue({ data: null, error: null }),
      from: vi.fn((table: string) => query(results[table] ?? { data: [], error: null })),
    };
    vi.mocked(requireUser).mockResolvedValue({ supabase, user: { id: "subject" } } as unknown as Awaited<ReturnType<typeof requireUser>>);

    const { state } = await loadCeteleState();

    expect(state.assignments.map(({ id, status, startedOn, endedOn }) => ({ id, status, startedOn, endedOn }))).toEqual([
      { id: "active", status: "active", startedOn: "2026-08-03", endedOn: null },
      { id: "ended", status: "ended", startedOn: "2026-08-03", endedOn: "2026-08-09" },
    ]);
    expect(state.people.find((person) => person.id === "invitation")).toMatchObject({ invitation: "pending", invitationExpiresAt: "2026-08-12T12:00:00.000Z" });
  });
});
