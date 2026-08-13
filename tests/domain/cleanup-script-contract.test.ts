import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("incomplete-account cleanup boundary", () => {
  const source = readFileSync("scripts/cleanup-incomplete-accounts.mjs", "utf8");
  it("is dry-run by default and refuses production or an unnamed project", () => {
    expect(source).toContain('CETELE_CLEANUP_EXECUTE === "true"');
    expect(source).toContain("actualRef !== disposableRef || actualRef === productionRef");
  });
  it("selects only expired incomplete registrations and deletes through Auth Admin", () => {
    expect(source).toContain('.is("onboarding_completed_at", null).lte("cleanup_after"');
    expect(source).toContain("admin.auth.admin.deleteUser(account.user_id)");
    expect(source).not.toMatch(/console\.log\([^\n]*user_id/);
  });
});

describe("account deletion processing boundary", () => {
  const source = readFileSync("scripts/process-account-deletions.mjs", "utf8");
  it("waits for recovery expiry, blocks stale JWTs first, and is disposable-only", () => {
    expect(source).toContain('.lte("recovery_until"');
    expect(source.indexOf('account_state: "disabled"')).toBeLessThan(source.indexOf("admin.auth.admin.deleteUser"));
    expect(source).toContain("actualRef !== disposableRef || actualRef === productionRef");
    expect(source).toContain('CETELE_DELETION_EXECUTE === "true"');
  });
});
