import { describe, expect, it } from "vitest";
import {
  aliasSchema,
  claimAvailability,
  effectiveConsent,
  incompleteAccountsForCleanup,
  visibilityForDirectRelationship,
} from "@/modules/cetele/account-policy";

describe("private account lifecycle", () => {
  it("accepts non-unique Aliases without legal-name semantics", () => {
    expect(aliasSchema.parse("  Gölge  ")).toBe("Gölge");
    expect(aliasSchema.parse("Gölge")).toBe("Gölge");
    expect(() => aliasSchema.parse("A")).toThrow();
    expect(() => aliasSchema.parse("tarik@example.com")).toThrow();
  });

  it.each([
    ["available", { expiresAt: "2099-01-01T00:00:00.000Z", revokedAt: null, consumedUses: 1, maximumUses: 2 }],
    ["expired", { expiresAt: "2020-01-01T00:00:00.000Z", revokedAt: null, consumedUses: 0, maximumUses: 1 }],
    ["revoked", { expiresAt: "2099-01-01T00:00:00.000Z", revokedAt: "2026-01-01T00:00:00.000Z", consumedUses: 0, maximumUses: 1 }],
    ["exhausted", { expiresAt: "2099-01-01T00:00:00.000Z", revokedAt: null, consumedUses: 1, maximumUses: 1 }],
  ] as const)("reports a claim as %s", (expected, claim) => {
    expect(claimAvailability(claim, new Date("2026-08-12T12:00:00.000Z"))).toBe(expected);
  });

  it("ends only the withdrawn Consent Grant and preserves evidence history", () => {
    const events = [
      { id: "grant-1", kind: "granted" as const, purpose: "core_tracking" as const, occurredAt: "2026-08-12T10:00:00.000Z", relatesTo: null },
      { id: "withdraw-1", kind: "withdrawn" as const, purpose: "core_tracking" as const, occurredAt: "2026-08-12T11:00:00.000Z", relatesTo: "grant-1" },
      { id: "grant-2", kind: "granted" as const, purpose: "direct_mentor_visibility" as const, occurredAt: "2026-08-12T10:05:00.000Z", relatesTo: null },
    ];
    expect(effectiveConsent(events, "core_tracking")).toBeNull();
    expect(effectiveConsent(events, "direct_mentor_visibility")?.id).toBe("grant-2");
    expect(events).toHaveLength(3);
  });

  it("selects only expired incomplete accounts for cleanup", () => {
    expect(incompleteAccountsForCleanup([
      { userId: "expired", onboardingCompletedAt: null, cleanupAfter: "2026-08-11T00:00:00.000Z" },
      { userId: "active", onboardingCompletedAt: null, cleanupAfter: "2026-08-13T00:00:00.000Z" },
      { userId: "complete", onboardingCompletedAt: "2026-08-11T10:00:00.000Z", cleanupAfter: "2026-08-11T00:00:00.000Z" },
    ], new Date("2026-08-12T12:00:00.000Z"))).toEqual(["expired"]);
  });

  it("allows self and one Direct Mentor but denies an Indirect Mentor", () => {
    const directMentors = new Map([["student", "direct"], ["direct", "indirect"]]);
    expect(visibilityForDirectRelationship("student", "student", directMentors)).toBe("subject");
    expect(visibilityForDirectRelationship("direct", "student", directMentors)).toBe("direct-mentor");
    expect(visibilityForDirectRelationship("indirect", "student", directMentors)).toBe("none");
  });
});
