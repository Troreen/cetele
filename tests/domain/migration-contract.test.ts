import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  path.resolve(process.cwd(), "supabase/migrations/202608090001_cetele_v1.sql"),
  "utf8",
).replace(/\s+/g, " ").toLowerCase();

describe("hosted V1 migration contract", () => {
  it("gives authenticated users only the table operations used by the application", () => {
    expect(migration).toMatch(/revoke all privileges on table public\.profiles,[^;]*public\.audit_events from public, anon, authenticated;/);
    expect(migration).toContain("revoke all privileges on sequence public.audit_events_id_seq from public, anon, authenticated;");
    expect(migration).toContain("grant select on table public.profiles");
    expect(migration).toContain("grant insert on table public.habit_definitions to authenticated;");
    expect(migration).toContain("grant insert, update on table public.assignment_preferences, public.reminder_preferences to authenticated;");
    expect(migration).toContain("grant update on table public.profiles to authenticated;");
    expect(migration).not.toMatch(/grant [^;]*(delete|truncate)[^;]* to (anon|authenticated)/);
  });

  it("keeps arbitrary-user hierarchy helpers outside the public RPC surface", () => {
    expect(migration).toContain("create schema if not exists private;");
    expect(migration).not.toMatch(/function public\.(is_direct_mentor|is_mentor_above|same_tree)\(/);
    expect(migration).not.toMatch(/grant execute on function private\.(is_direct_mentor|is_mentor_above|same_tree)\([^;]*to authenticated/);
    expect(migration).toContain("grant execute on function private.is_current_user_mentor_above(uuid) to authenticated;");
    expect(migration).toContain("grant execute on function private.is_in_current_user_tree(uuid) to authenticated;");
  });

  it("indexes hierarchy filters and every non-primary foreign-key side", () => {
    const requiredIndexes = [
      "create index invitations_by_mentor on public.mentorship_invitations(mentor_id);",
      "create index invitations_by_invited_user on public.mentorship_invitations(invited_user_id);",
      "create index definitions_by_source on public.habit_definitions(source_definition_id);",
      "create index definitions_by_source_creator on public.habit_definitions(source_creator_id);",
      "create index assignments_by_assigner on public.habit_assignments(assigned_by);",
      "create index assignments_by_intervention_mentor on public.habit_assignments(intervention_for_mentor_id);",
      "create index excuses_by_assignment on public.excused_days(assignment_id);",
      "create index excuses_by_grantor on public.excused_days(granted_by);",
      "create index attention_by_trigger_assignment on public.attention_items(trigger_assignment_id);",
      "create index followups_by_responsible_mentor on public.followups(responsible_mentor_id);",
      "create index attention_open_by_student on public.attention_items(student_id, second_missed_date) where state = 'open';",
    ];

    for (const index of requiredIndexes) expect(migration).toContain(index);
  });

  it("evaluates the authenticated identity through init plans in RLS policies", () => {
    const policies = migration.slice(migration.indexOf("create policy"));
    expect(policies.replaceAll("(select auth.uid())", "")).not.toContain("auth.uid()");
  });
});
