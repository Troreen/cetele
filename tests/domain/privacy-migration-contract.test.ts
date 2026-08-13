import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync("supabase/migrations/202608120001_private_accounts_consent_invitations.sql", "utf8");

describe("private accounts migration contract", () => {
  it("stores Alias profiles and never copies private email or invitation recipient identity", () => {
    expect(migration).toContain("rename column display_name to alias");
    expect(migration).toMatch(/drop column invitee_name/i);
    expect(migration.replace(/drop column invitee_name/ig, "")).not.toMatch(/invitee_(email|name)/i);
    expect(migration).not.toMatch(/public\.profiles[^;]*email/is);
    expect(migration).toContain("drop trigger if exists auth_user_profile on auth.users");
  });

  it("models limited Access Codes, single-use Mentorship Invitations, and pending registrations", () => {
    expect(migration).toContain("create table public.access_codes");
    expect(migration).toContain("maximum_uses integer not null");
    expect(migration).toContain("consumed_uses integer not null default 0");
    expect(migration).toContain("create table public.pending_registrations");
    expect(migration).toContain("for update");
    expect(migration).toContain("accepted_at is null");
  });

  it("keeps legal evidence append-only and separates Terms from Consent Grants", () => {
    expect(migration).toContain("create table public.legal_documents");
    expect(migration).toContain("create table public.legal_events");
    expect(migration).toContain("terms_accepted");
    expect(migration).toContain("consent_granted");
    expect(migration).toContain("consent_withdrawn");
    expect(migration).toMatch(/prevent_legal_event_mutation/i);
  });

  it("removes ancestor authorization and replaces it with direct-only denial boundaries", () => {
    expect(migration).toContain("drop function if exists private.is_mentor_above(uuid, uuid)");
    expect(migration).toContain("drop function if exists private.is_current_user_mentor_above(uuid)");
    expect(migration).not.toMatch(/senior_assignment_intervention/);
    expect(migration).toContain("drop column intervention_for_mentor_id");
    expect(migration).toContain("private.is_direct_mentor((select auth.uid()), student_id)");
    const withoutPolicyDrops = migration.replace(/drop policy if exists [^;]+;/g, "");
    expect(withoutPolicyDrops).not.toMatch(/profiles_read_upward|assignments_read_upward|writer_and_above|actor_and_above/);
  });

  it("protects every new exposed table with RLS, explicit grants, and narrow function execution", () => {
    for (const table of ["access_codes", "pending_registrations", "legal_documents", "legal_events", "account_requests", "deployment_controls"]) {
      expect(migration).toContain(`alter table public.${table} enable row level security;`);
    }
    expect(migration).toMatch(/revoke all[^;]+from public, anon, authenticated/is);
    expect(migration).toContain("set search_path = ''");
    expect(migration).toMatch(/revoke all on function private\./);
  });

  it("retains pseudonymous evidence after Auth deletion and revokes sessions first", () => {
    expect(migration).toContain("user_id uuid not null,");
    expect(migration).not.toMatch(/legal_events[\s\S]{0,300}references auth\.users\(id\)/i);
    expect(migration).toContain("delete from auth.sessions where user_id = p_user_id");
  });
});
