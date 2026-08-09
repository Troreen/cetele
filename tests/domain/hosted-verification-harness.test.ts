import { describe, expect, it } from "vitest";
// @ts-expect-error The executable harness is intentionally plain Node ESM.
import { loadVerificationConfig, plannedMatrix, redact, REQUIRED_ENV_NAMES } from "../../scripts/verify-hosted-supabase.mjs";

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

  it("plans both allow and deny checks for every identity", () => {
    const matrix = plannedMatrix();
    expect(new Set(matrix.map((entry: { actor: string }) => entry.actor))).toEqual(new Set(["subject", "direct", "senior", "peer", "outsider"]));
    expect(matrix.some((entry: { expectation: string }) => entry.expectation === "allow")).toBe(true);
    expect(matrix.some((entry: { expectation: string }) => entry.expectation === "deny")).toBe(true);
    expect(matrix.some((entry: { resource: string }) => entry.resource.startsWith("rpc."))).toBe(true);
  });
});
