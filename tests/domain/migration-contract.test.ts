import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const primary = readFileSync("supabase/migrations/202608120001_private_accounts_consent_invitations.sql", "utf8").replace(/\s+/g, " ").toLowerCase();
const grants = readFileSync("supabase/migrations/202608120002_private_policy_helper_grants.sql", "utf8").replace(/\s+/g, " ").toLowerCase();
const replay = readFileSync("supabase/migrations/202608120003_private_account_indexes_and_replay_guard.sql", "utf8").replace(/\s+/g, " ").toLowerCase();
const security = readFileSync("supabase/migrations/202608120004_security_review_fixes.sql", "utf8").replace(/\s+/g, " ").toLowerCase();
const current = `${primary} ${grants} ${replay} ${security}`;

describe("private account migration contract", () => {
  it("uses direct relationship predicates and removes transitive capabilities", () => {
    expect(primary).toContain("create or replace function private.is_direct_mentor(viewer uuid, subject uuid)");
    expect(primary).toContain("r.mentor_id = viewer and r.student_id = subject and r.status = 'active'");
    expect(primary).toContain("drop function if exists private.is_mentor_above(uuid, uuid)");
    expect(primary).toContain("alter table public.habit_assignments drop column intervention_for_mentor_id");
    expect(primary).not.toContain("senior_assignment_intervention");
  });

  it("denies personal records unless the viewer is the active subject or Direct Mentor", () => {
    for (const policy of ["profiles_read_direct", "assignments_read_direct", "completions_read_direct", "excuses_read_direct", "attention_read_direct"]) {
      expect(primary).toContain(`create policy ${policy}`);
    }
    expect(primary).toContain("private.is_direct_mentor((select auth.uid()), student_id)");
    expect(primary).not.toMatch(/create policy [^;]*(above|ancestor|intervention)/);
  });

  it("requires active account state inside every sensitive SECURITY DEFINER path", () => {
    for (const fn of ["record_completion", "remove_completion", "record_follow_up", "grant_excused_day", "reconcile_my_attention", "create_habit_definition", "adopt_habit_definition", "reorder_habit_assignments", "record_daily_review"]) {
      const start = primary.indexOf(`create or replace function public.${fn}`);
      const body = primary.slice(start, primary.indexOf("$$;", start));
      expect(start).toBeGreaterThan(0);
      expect(body).toContain("private.is_active_account((select auth.uid()))");
    }
  });

  it("keeps legal evidence append-only, version-bound, and linked on withdrawal", () => {
    expect(primary).toContain("foreign key (document_kind, document_version) references public.legal_documents(kind, version)");
    expect(primary).toContain("create trigger prevent_legal_event_mutation before update or delete");
    expect(primary).toContain("'consent_withdrawn', p_purpose");
    expect(primary).toContain("'settings_withdrawal_confirmation', v_grant.id");
  });

  it("limits registration binding to service role and onboarding completion to authenticated users", () => {
    expect(primary).toContain("revoke all on function public.begin_pending_registration(uuid, public.claim_kind, text) from public, anon, authenticated, service_role");
    expect(primary).toContain("grant execute on function public.begin_pending_registration(uuid, public.claim_kind, text) to service_role");
    expect(primary).toContain("grant execute on function public.complete_onboarding(text, text, text, text, text, boolean, boolean, boolean) to authenticated");
    expect(primary).toContain("email_confirmed_at is not null");
  });

  it("guards idempotent reservation from switching claims and indexes cleanup/expiry/FKs", () => {
    expect(replay).toContain("pending_registrations.claim_kind = excluded.claim_kind");
    expect(replay).toContain("access_code_id is not distinct from excluded.access_code_id");
    expect(replay).toContain("user already has a different pending registration");
    for (const index of ["pending_registrations_cleanup", "access_codes_expiry", "mentorship_invitations_expiry", "access_codes_created_by", "legal_events_document", "legal_events_relates_to"]) {
      expect(current).toContain(index);
    }
  });

  it("uses empty search paths and exposes only reviewed policy helpers", () => {
    expect(primary.match(/security definer set search_path = ''/g)?.length).toBeGreaterThanOrEqual(20);
    for (const fn of ["has_current_consent(uuid, public.consent_purpose)", "is_active_account(uuid)", "is_direct_mentor(uuid, uuid)", "is_directly_related(uuid, uuid)"]) {
      expect(grants).toContain(`grant execute on function private.${fn} to authenticated`);
    }
    expect(grants).not.toContain("begin_pending_registration");
    expect(grants).not.toContain("complete_onboarding");
  });

  it("binds visibility to the exact mentor and fails closed for activation", () => {
    expect(primary).toContain("recipient_scope ->> 'direct_mentor_id' = viewer::text");
    expect(primary).toContain("create table public.deployment_controls");
    expect(primary).toContain("account activation is disabled");
    expect(security).toContain("drop function private.same_mentorship_tree(uuid, uuid)");
  });
});
