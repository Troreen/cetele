import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
// @ts-expect-error The executable harness is intentionally plain Node ESM.
import { errorSummary, loadVerificationConfig, plannedMatrix, redact, REQUIRED_ENV_NAMES } from "../../scripts/verify-hosted-supabase.mjs";

function validEnv() {
  const env: Record<string, string> = {
    NEXT_PUBLIC_SUPABASE_URL: "https://project-ref.supabase.co",
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_example",
  };
  for (const role of ["SUBJECT", "DIRECT", "SENIOR", "PEER", "OUTSIDER"]) {
    env[`CETELE_VERIFY_${role}_EMAIL`] = `${role.toLowerCase()}@example.test`;
    env[`CETELE_VERIFY_${role}_PASSWORD`] = `password-${role}`;
  }
  return env;
}

describe("hosted verification harness", () => {
  it("checks non-mentor visibility against the newly created unassigned shared definition", () => {
    const source = readFileSync("scripts/verify-hosted-supabase.mjs", "utf8");
    const artifactCreatedAt = source.indexOf("const artifactDefinitionCreated");
    const visibilityCheckAt = source.indexOf("shared-definition.non-mentor", source.indexOf("async function main"));
    const assignmentAt = source.indexOf("const assignmentResult");

    expect(artifactCreatedAt).toBeGreaterThan(0);
    expect(visibilityCheckAt).toBeGreaterThan(artifactCreatedAt);
    expect(visibilityCheckAt).toBeLessThan(assignmentAt);
    expect(source).not.toContain('.eq("visibility", "shared").limit(1).maybeSingle()');
  });

  it("fails closed and reports only missing variable names", () => {
    expect(() => loadVerificationConfig({})).toThrow(REQUIRED_ENV_NAMES.join(", "));
  });

  it("rejects secret keys and duplicate identities", () => {
    expect(() => loadVerificationConfig({ ...validEnv(), NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_secret_nope" })).toThrow("must not contain a secret key");
    const env = validEnv();
    env.CETELE_VERIFY_PEER_EMAIL = env.CETELE_VERIFY_SUBJECT_EMAIL;
    expect(() => loadVerificationConfig(env)).toThrow("distinct email");
  });

  it("redacts configured secrets and common credential shapes", () => {
    const output = redact("person@example.test Bearer abc.def sb_secret_abc eyJabc.def.ghi password", ["password"]);
    expect(output).not.toContain("person@example.test");
    expect(output).not.toContain("abc.def");
    expect(output).not.toContain("sb_secret_abc");
    expect(output).not.toContain("eyJabc.def.ghi");
    expect(output).not.toContain("password");
  });

  it("preserves structured Supabase diagnostics instead of object coercion", () => {
    const summary = errorSummary({ code: "42501", message: "permission denied", details: null, hint: null });
    expect(summary).toContain('"code":"42501"');
    expect(summary).toContain('"message":"permission denied"');
    expect(summary).not.toBe("[object Object]");
  });

  it("plans allow/deny checks for every identity and the anonymous boundary", () => {
    const matrix = plannedMatrix();
    expect(new Set(matrix.map((entry: { actor: string }) => entry.actor))).toEqual(new Set(["subject", "direct", "senior", "peer", "outsider", "anonymous"]));
    expect(matrix.some((entry: { expectation: string }) => entry.expectation === "allow")).toBe(true);
    expect(matrix.some((entry: { expectation: string }) => entry.expectation === "deny")).toBe(true);
    expect(matrix.some((entry: { resource: string }) => entry.resource.startsWith("rpc."))).toBe(true);
    expect(matrix).toEqual(expect.arrayContaining([
      { resource: "rpc.assign-subject", actor: "direct", expectation: "allow" },
      { resource: "rpc.remove-completion.active-assignment", actor: "subject", expectation: "allow" },
      { resource: "rpc.end-assignment", actor: "direct", expectation: "allow" },
      { resource: "rpc.remove-completion.ended-assignment", actor: "subject", expectation: "deny" },
      { resource: "attention.subject", actor: "subject", expectation: "deny" },
      { resource: "attention.subject", actor: "direct", expectation: "allow" },
      { resource: "attention.subject", actor: "senior", expectation: "allow" },
      { resource: "attention.subject", actor: "peer", expectation: "deny" },
      { resource: "attention.subject", actor: "outsider", expectation: "deny" },
      { resource: "attention.completion-invalidation", actor: "subject", expectation: "allow" },
      { resource: "attention.removal-reopening", actor: "subject", expectation: "allow" },
      { resource: "rpc.record-quantitative.yesterday", actor: "subject", expectation: "allow" },
      { resource: "rpc.record-binary.amount", actor: "subject", expectation: "deny" },
      { resource: "shared-definition.non-mentor", actor: "subject", expectation: "deny" },
      { resource: "profile.non-theme-self-write", actor: "subject", expectation: "deny" },
      { resource: "definition.direct-insert", actor: "direct", expectation: "deny" },
      { resource: "rpc.create-definition", actor: "direct", expectation: "allow" },
      { resource: "rpc.adopt-definition", actor: "direct", expectation: "allow" },
      { resource: "rpc.reorder-assignments", actor: "subject", expectation: "allow" },
      { resource: "assignment.void", actor: "subject", expectation: "deny" },
      { resource: "definition.void-link", actor: "direct", expectation: "deny" },
      { resource: "rpc.assign-subject-intervention", actor: "senior", expectation: "allow" },
      { resource: "rpc.grant-assignment-excuse", actor: "senior", expectation: "deny" },
      { resource: "daily-review.direct", actor: "senior", expectation: "allow" },
      { resource: "preference.subject-write", actor: "direct", expectation: "deny" },
      { resource: "table.audit_events", actor: "anonymous", expectation: "deny" },
      { resource: "rpc.claim_mentorship_invitation", actor: "anonymous", expectation: "deny" },
      { resource: "rpc.missed_assignment_ids", actor: "anonymous", expectation: "deny" },
    ]));
    expect(matrix).toHaveLength(156);
  });
});
