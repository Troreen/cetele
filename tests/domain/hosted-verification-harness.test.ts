import { describe, expect, it } from "vitest";
// @ts-expect-error The executable harness is intentionally plain Node ESM.
import { errorSummary, loadVerificationConfig, plannedMatrix, redact, REQUIRED_ENV_NAMES } from "../../scripts/verify-hosted-supabase.mjs";

function validEnv() {
  const env: Record<string, string> = {
    NEXT_PUBLIC_SUPABASE_URL: "https://project-ref.supabase.co",
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_example",
    SUPABASE_SECRET_KEY: "server-only-fixture",
  };
  for (const role of ["SUBJECT", "DIRECT", "SENIOR", "PEER", "OUTSIDER"]) {
    env[`CETELE_VERIFY_${role}_EMAIL`] = `${role.toLowerCase()}@example.test`;
    env[`CETELE_VERIFY_${role}_PASSWORD`] = `password-${role}`;
  }
  return env;
}

describe("privacy hosted verification harness", () => {
  it("fails closed and reports only missing variable names", () => {
    expect(() => loadVerificationConfig({})).toThrow(REQUIRED_ENV_NAMES.join(", "));
  });

  it("rejects secret browser keys and duplicate identities", () => {
    expect(() => loadVerificationConfig({ ...validEnv(), NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_secret_nope" })).toThrow("must not contain a secret key");
    const env = validEnv();
    env.CETELE_VERIFY_PEER_EMAIL = env.CETELE_VERIFY_SUBJECT_EMAIL;
    expect(() => loadVerificationConfig(env)).toThrow("distinct email");
  });

  it("redacts credentials and preserves structured diagnostics", () => {
    const output = redact("person@example.test Bearer abc.def sb_secret_abc eyJabc.def.ghi password", ["password"]);
    expect(output).not.toMatch(/person@example|abc\.def|sb_secret|eyJabc|password/);
    expect(errorSummary({ code: "42501", message: "permission denied" })).toContain('"code":"42501"');
  });

  it("replaces ancestor allows with explicit higher-mentor denials and lifecycle boundaries", () => {
    const matrix = plannedMatrix();
    expect(matrix).toHaveLength(48);
    expect(matrix).toEqual(expect.arrayContaining([
      { resource: "profile.subject", actor: "direct", expectation: "allow" },
      { resource: "profile.subject", actor: "senior", expectation: "deny" },
      { resource: "completion.subject", actor: "senior", expectation: "deny" },
      { resource: "attention.subject", actor: "peer", expectation: "deny" },
      { resource: "followup.direct-private", actor: "subject", expectation: "deny" },
      { resource: "profile.subject-after-withdrawal", actor: "direct", expectation: "deny" },
      { resource: "profile.incomplete-self", actor: "outsider", expectation: "deny" },
      { resource: "profile.subject-wrong-consent-recipient", actor: "direct", expectation: "deny" },
      { resource: "profile.subject-closure-recovery", actor: "subject", expectation: "allow" },
      { resource: "completion.subject-stale-jwt-closure", actor: "subject", expectation: "deny" },
      { resource: "claim.access-over-reservation", actor: "service-boundary", expectation: "deny" },
      { resource: "claim.invitation-replay", actor: "service-boundary", expectation: "deny" },
      { resource: "auth.refresh-after-session-revocation", actor: "peer", expectation: "deny" },
    ]));
    expect(matrix.some((entry: { actor: string; expectation: string }) => entry.actor === "senior" && entry.expectation === "allow")).toBe(false);
  });
});
