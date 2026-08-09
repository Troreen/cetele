import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const baseMigration = readFileSync(
  path.resolve(process.cwd(), "supabase/migrations/202608090001_cetele_v1.sql"),
  "utf8",
).replace(/\s+/g, " ").toLowerCase();
const manualInvitationsMigration = readFileSync(
  path.resolve(process.cwd(), "supabase/migrations/202608090002_manual_secure_invitations.sql"),
  "utf8",
).replace(/\s+/g, " ").toLowerCase();
const upgradeFixesMigration = readFileSync(
  path.resolve(process.cwd(), "supabase/migrations/202608090003_post_v1_upgrade_fixes.sql"),
  "utf8",
).replace(/\s+/g, " ").toLowerCase();
const migration = `${baseMigration} ${manualInvitationsMigration} ${upgradeFixesMigration}`;

describe("hosted V1 migration contract", () => {
  it("gives authenticated users only the table operations used by the application", () => {
    expect(migration).toMatch(/revoke all privileges on table public\.profiles,[^;]*public\.audit_events from public, anon, authenticated;/);
    expect(migration).toContain("revoke all privileges on sequence public.audit_events_id_seq from public, anon, authenticated;");
    expect(migration).toContain("grant select on table public.profiles");
    expect(migration).toMatch(/grant select on table public\.profiles,[^;]*public\.audit_events to authenticated;/);
    expect(migration).toContain("grant insert on table public.habit_definitions to authenticated;");
    expect(migration).toContain("grant insert, update on table public.assignment_preferences, public.reminder_preferences to authenticated;");
    expect(migration).toContain("grant update on table public.profiles to authenticated;");
    expect(migration).not.toMatch(/grant [^;]*(delete|truncate)[^;]* to (anon|authenticated)/);
  });

  it("reconciles open attention whenever an assignment becomes terminal", () => {
    const correction = migration.slice(
      migration.indexOf("create or replace function public.end_habit_assignment"),
      migration.indexOf("create or replace function public.assign_habit_definition"),
    );
    expect(correction).not.toContain("if v_status = 'void'::public.assignment_status then");
    expect(correction).toContain("p_assignment_id = any(contributing_assignment_ids)");
    expect(correction).toContain("v_remaining := public.missed_assignment_ids");
    expect(correction).toContain("state = 'invalidated'");
    expect(correction).toContain("trigger_assignment_id = v_remaining[1], contributing_assignment_ids = v_remaining");
  });

  it("derives reconciliation candidate dates in the student's timezone", () => {
    const reconciliation = baseMigration.slice(
      baseMigration.indexOf("create or replace function public.reconcile_my_attention"),
      baseMigration.indexOf("create or replace function public.accept_mentorship_invitation"),
    );
    expect(reconciliation).toContain("min(a.created_at at time zone student_profile.timezone)::date");
  });

  it("upgrades legacy email invitations to expiring SHA-256 claims", () => {
    const legacyInvitations = baseMigration.slice(
      baseMigration.indexOf("create table public.mentorship_invitations"),
      baseMigration.indexOf("create table public.mentorship_relationships"),
    );
    expect(legacyInvitations).toContain("invitee_email text not null");
    expect(manualInvitationsMigration).toContain("add column token_hash text");
    expect(manualInvitationsMigration).toContain("add column expires_at timestamptz");
    expect(manualInvitationsMigration).toContain("set cancelled_at = now() where accepted_at is null and cancelled_at is null");
    expect(manualInvitationsMigration).toContain("alter column token_hash set not null");
    expect(manualInvitationsMigration).toContain("alter column expires_at set not null");
    expect(manualInvitationsMigration).toContain("drop column invitee_email");
    expect(manualInvitationsMigration).toContain("unique (token_hash)");
    expect(manualInvitationsMigration).toContain("token_hash ~ '^[0-9a-f]{64}$'");
    expect(manualInvitationsMigration).toContain("expires_at > created_at");
    expect(migration).toContain("create policy invitations_read_parties on public.mentorship_invitations for select to authenticated using (mentor_id = (select auth.uid()) or invited_user_id = (select auth.uid()));");
  });

  it("keeps auth-user provisioning independent from invitation metadata and email", () => {
    const provisioning = manualInvitationsMigration.slice(
      manualInvitationsMigration.indexOf("create or replace function public.handle_new_auth_user"),
      manualInvitationsMigration.indexOf("drop function if exists public.accept_mentorship_invitation"),
    );
    expect(provisioning).not.toContain("invitation_id");
    expect(provisioning).not.toContain("invitee_email");
    expect(provisioning).not.toContain("new.email");
    expect(provisioning).not.toContain("update public.mentorship_invitations");
  });

  it("claims invitations atomically through a service-role-only RPC", () => {
    const claim = manualInvitationsMigration.slice(
      manualInvitationsMigration.indexOf("create or replace function public.claim_mentorship_invitation"),
      manualInvitationsMigration.indexOf("revoke all on function public.claim_mentorship_invitation"),
    );
    expect(claim).toContain("returns uuid language plpgsql security definer set search_path = ''");
    expect(claim).toContain("where token_hash = lower(p_token_hash) for update");
    expect(claim).toContain("expires_at <= now()");
    expect(claim).toContain("invited_user_id is not null");
    expect(claim).toContain("accepted_at is not null");
    expect(claim).toContain("cancelled_at is not null");
    expect(claim).toContain("where student_id = p_user_id and status = 'active'");
    expect(claim).toContain("private.is_mentor_above(p_user_id, v_mentor)");
    expect(claim).toContain("insert into public.mentorship_relationships(mentor_id, student_id)");
    expect(claim).toContain("set invited_user_id = p_user_id, accepted_at = now()");
    expect(claim).toContain("'mentorship_invitation_accepted'");
    expect(claim).toContain("return v_invitation_id");
    expect(manualInvitationsMigration).toContain("drop function if exists public.accept_mentorship_invitation(uuid);");
    expect(manualInvitationsMigration).toContain("revoke all on function public.claim_mentorship_invitation(text, uuid) from public, anon, authenticated;");
    expect(manualInvitationsMigration).toContain("grant execute on function public.claim_mentorship_invitation(text, uuid) to service_role;");
  });

  it("preserves ended and void assignment history at the completion RPC boundary", () => {
    const removal = migration.slice(
      migration.indexOf("create or replace function public.remove_completion"),
      migration.indexOf("create or replace function public.end_habit_assignment"),
    );
    expect(removal).toContain("where a.id = p_assignment_id and a.status = 'active'");
  });

  it("carries every post-001 fix in an independently deployable upgrade migration", () => {
    const removal = upgradeFixesMigration.slice(
      upgradeFixesMigration.indexOf("create or replace function public.remove_completion"),
      upgradeFixesMigration.indexOf("create or replace function public.end_habit_assignment"),
    );
    const correction = upgradeFixesMigration.slice(
      upgradeFixesMigration.indexOf("create or replace function public.end_habit_assignment"),
      upgradeFixesMigration.indexOf("create or replace function public.reconcile_my_attention"),
    );
    const reconciliation = upgradeFixesMigration.slice(
      upgradeFixesMigration.indexOf("create or replace function public.reconcile_my_attention"),
      upgradeFixesMigration.indexOf("revoke all on function public.remove_completion"),
    );

    expect(removal).toContain("where a.id = p_assignment_id and a.status = 'active'");
    expect(correction).toContain("p_assignment_id = any(contributing_assignment_ids)");
    expect(correction).toContain("v_remaining := public.missed_assignment_ids");
    expect(reconciliation).toContain("min(a.created_at at time zone student_profile.timezone)::date");
    expect(upgradeFixesMigration).toContain("grant select on table public.audit_events to authenticated;");
  });

  it("resets Supabase role grants before exposing only intended RPCs", () => {
    const internalFunctions = [
      "public.handle_new_auth_user()",
      "private.is_direct_mentor(uuid, uuid)",
      "private.is_mentor_above(uuid, uuid)",
      "private.same_tree(uuid, uuid)",
      "public.reject_mentorship_cycle()",
      "public.missed_assignment_ids(uuid, date, date)",
    ];
    const authenticatedRpcs = [
      "public.record_completion(uuid, date, numeric, text)",
      "public.record_follow_up(uuid, text)",
      "public.remove_completion(uuid, date)",
      "public.end_habit_assignment(uuid, text)",
      "public.assign_habit_definition(uuid, uuid, numeric)",
      "public.grant_excused_day(uuid, uuid, date, text)",
      "public.record_daily_review()",
      "public.reconcile_my_attention()",
    ];

    for (const fn of [...internalFunctions, ...authenticatedRpcs]) {
      expect(upgradeFixesMigration).toContain(`revoke all on function ${fn} from public, anon, authenticated, service_role;`);
    }
    for (const fn of internalFunctions) {
      expect(upgradeFixesMigration).not.toContain(`grant execute on function ${fn} to authenticated;`);
    }
    for (const fn of authenticatedRpcs) {
      expect(upgradeFixesMigration).toContain(`grant execute on function ${fn} to authenticated;`);
    }
    expect(upgradeFixesMigration).toContain("revoke all on function public.claim_mentorship_invitation(text, uuid) from public, anon, authenticated, service_role;");
    expect(upgradeFixesMigration).toContain("grant execute on function public.claim_mentorship_invitation(text, uuid) to service_role;");
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
    const policies = baseMigration.slice(baseMigration.indexOf("create policy"));
    expect(policies.replaceAll("(select auth.uid())", "")).not.toContain("auth.uid()");
  });
});
