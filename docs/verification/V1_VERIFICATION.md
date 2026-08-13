# V1 verification gate

## Current boundary

The current candidate implements private Alias accounts, consent evidence, Access Codes, Mentorship Invitations, and direct-only mentorship authorization. It does not activate production signup and does not supply approved legal wording. A local fixture, migration review, or green browser test is not evidence of Supabase Auth delivery or production readiness.

The durable dated result is [`2026-08-12-private-accounts-consent-invitations.md`](2026-08-12-private-accounts-consent-invitations.md). Older 134/134 and 156/156 records remain historical evidence for the superseded ancestor-access model; they must not be used to justify current authorization.

## Required local gates

Run from the repository root on the exact candidate tree:

```powershell
npm.cmd run verify
npm.cmd run test:e2e
```

The tests must cover:

- Alias validation and absence of legal-name fields;
- production signup block and generic anti-enumeration responses;
- separate unchecked Terms, Core Tracking, and Direct Mentor choices;
- scanner-safe explicit POST before Supabase invite/recovery OTP exchange;
- hashed fragment claims, expiry, revocation, exhaustion, reservation concurrency, and replay denial;
- password update before atomic onboarding completion;
- append-only, version-bound consent evidence and withdrawal linkage;
- incomplete-account routing, bounded cleanup selection, deletion recovery, and stale-JWT database denial;
- direct-only UI, selectors, server actions, RPCs, RLS, and explicit indirect-mentor denial;
- export/deletion request paths and removal of branch aggregates and senior intervention.

Browser QA is bounded to the supported 320px/390px mobile and 1440px desktop surfaces in dark and light themes. Verify keyboard focus, unchecked controls, overflow, fragment scrubbing, direct-only navigation, and the fixture legal warning.

## Disposable hosted database gate

Only use a disposable Supabase project with synthetic identities. Never place credentials, emails, JWTs, raw claims, or secret keys in durable evidence.

Apply migrations in filename order through:

1. `202608120001_private_accounts_consent_invitations.sql`
2. `202608120002_private_policy_helper_grants.sql`
3. `202608120003_private_account_indexes_and_replay_guard.sql`
4. `202608120004_security_review_fixes.sql`
5. `202608120005_withdraw_all_active_grants.sql`

Then run:

```powershell
npm.cmd run verify:hosted
```

The committed `plannedMatrix()` is the row contract. It verifies owner and Direct Mentor allows plus Indirect Mentor, peer, outsider, and anonymous denials for profile, relationship, assignment, Completion, and Needs Attention records. It separately checks private Follow-up, exact-recipient consent, withdrawal, incomplete-account denial, recovery-only closure visibility, stale-JWT data denial, claim lifecycle/replay, and refresh-token failure after session revocation.

Any unexpected allow or deny is a gate failure. Never weaken RLS to make the matrix green.

## Hosted Auth boundary

Verify the selected Supabase Auth API against current official docs and installed package source. The candidate uses server-only `auth.admin.inviteUserByEmail`, keeps Confirm Email enabled, exchanges `token_hash` with `verifyOtp`, and requires an explicit user POST before exchange so mail scanners cannot consume a one-time token through GET.

A reserved synthetic address may be rejected by the hosted provider before user creation. Record that as an unverified delivery boundary; do not substitute a real address without Tarik's explicit Milestone 6 authorization.

## Advisors

Run both Supabase security and performance advisors after the final disposable migration. Review every warning:

- service-only tables with RLS and no client policy are intentional deny-by-default boundaries;
- authenticated `SECURITY DEFINER` warnings are expected only for reviewed, identity-checking application RPCs with empty `search_path` and explicit grants;
- leaked-password protection and other Auth settings remain activation blockers where not enabled;
- new foreign keys require covering indexes unless a documented reason says otherwise.

## Cleanup and recovery

`npm.cmd run cleanup:incomplete` and `npm.cmd run process:deletions` are dry-run by default. Both require explicit, different disposable and production refs. They deny app access first where a profile exists, revoke rows in `auth.sessions`, and only then delete through Auth Admin when the corresponding execute flag is explicitly supplied.

Already-issued JWTs cannot be assumed invalid merely because sessions or an Auth user were deleted. App-owned account/onboarding/consent state denies every RLS policy and sensitive RPC first; the hosted matrix separately proves stale-JWT application denial and refresh-token revocation. An authenticated export request unlocks a no-store direct JSON download; recovery email is read from Auth only for that response.

## Promotion boundary

Do not set `CETELE_ALLOW_NON_PRODUCTION_SIGNUP=true` in production, mutate the production project, create a real account, approve legal documents, or activate the Supabase adapter for real users as part of Milestones 0–5. Milestone 6 requires Tarik's explicit authorization plus qualified human/legal approval of controller details, Article 6/9 decisions, Terms, Privacy Notice, and Turkish wording.
