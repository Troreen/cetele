import { z } from "zod";

export const aliasSchema = z.string()
  .trim()
  .min(2, "Kullanıcı adı en az 2 karakter olmalı.")
  .max(40, "Kullanıcı adı en fazla 40 karakter olabilir.")
  .refine((value) => !value.includes("@"), "Kullanıcı adı bir e-posta adresi olamaz.");

type ClaimState = {
  expiresAt: string;
  revokedAt: string | null;
  consumedUses: number;
  maximumUses: number;
};

export function claimAvailability(claim: ClaimState, now = new Date()) {
  if (claim.revokedAt) return "revoked" as const;
  if (new Date(claim.expiresAt).getTime() <= now.getTime()) return "expired" as const;
  if (claim.consumedUses >= claim.maximumUses) return "exhausted" as const;
  return "available" as const;
}

export type ConsentPurpose = "core_tracking" | "direct_mentor_visibility";
export type ConsentEvent = {
  id: string;
  kind: "granted" | "withdrawn";
  purpose: ConsentPurpose;
  occurredAt: string;
  relatesTo: string | null;
};

export function effectiveConsent(events: ConsentEvent[], purpose: ConsentPurpose) {
  const relevant = events
    .filter((event) => event.purpose === purpose)
    .toSorted((left, right) => left.occurredAt.localeCompare(right.occurredAt));
  const withdrawn = new Set(relevant.filter((event) => event.kind === "withdrawn" && event.relatesTo).map((event) => event.relatesTo));
  return relevant.toReversed().find((event) => event.kind === "granted" && !withdrawn.has(event.id)) ?? null;
}

type IncompleteAccount = {
  userId: string;
  onboardingCompletedAt: string | null;
  cleanupAfter: string;
};

export function incompleteAccountsForCleanup(accounts: IncompleteAccount[], now = new Date()) {
  return accounts
    .filter((account) => account.onboardingCompletedAt === null && new Date(account.cleanupAfter).getTime() <= now.getTime())
    .map((account) => account.userId);
}

export function visibilityForDirectRelationship(
  viewerId: string,
  subjectId: string,
  directMentors: ReadonlyMap<string, string>,
) {
  if (viewerId === subjectId) return "subject" as const;
  return directMentors.get(subjectId) === viewerId ? "direct-mentor" as const : "none" as const;
}
