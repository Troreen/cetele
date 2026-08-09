# Çetele delivery plan

This file is the authoritative delivery sequence. Product behavior remains authoritative in [`PRODUCT.md`](PRODUCT.md) and the [V1 product definition](docs/product/Cetele_V1_Product_Definition_v0.1.md); GitHub issues hold execution discussion.

## Current truth — 2026-08-10

- **V1 application scope is implemented and locally verified.** On 2026-08-10, the current candidate's `npm.cmd run verify` passed ESLint, generated-route strict TypeScript, 79 Vitest tests, and the production build. `npm.cmd run test:e2e` passed all 9 Playwright Chrome journeys and exited cleanly through its owned Windows server lifecycle.
- **The hosted Supabase gate passed.** Migrations `001`, `002`, and additive upgrade migration `003` were applied to a disposable project. The redaction-safe executable matrix passed 134/134 and the complementary manual browser/database matrix passed across five isolated identities.
- The local adapter remains the safe development default. Production authentication, PostgreSQL persistence, manual invitation claiming, and RLS have now been verified against the disposable hosted environment described in the verification record.
- Keep `NEXT_PUBLIC_CETELE_DATA_ADAPTER=local` until Milestone 2 stops successfully.

## Milestone sequence

### 1. Checkpoint the verified V1

**Status:** complete — checkpoint `bba37e7` pushed to `origin/codex/complete-v1`

1. Re-run `npm.cmd run verify` and `npm.cmd run test:e2e` on the exact tree to be checkpointed.
2. Review the complete V1 diff, preserving unrelated user work and excluding secrets or local environment files.
3. Commit and push one coherent V1 milestone, then link the commit and fresh command results from [issue #1](https://github.com/Troreen/cetele/issues/1).

**Stopping condition:** both local commands pass on the checkpointed tree; documentation describes the same scope and verification boundary; the focused milestone commit is pushed and its evidence is linked.

**Evidence:** `npm.cmd run verify` passed with 18 Vitest tests and a production build; `npm.cmd run test:e2e` passed 9 Playwright journeys. The checkpoint was independently reviewed before publication, and the discovered sign-out, assignment-scoped Excused Day, and mistaken-assignment correction gaps were repaired test-first before the full gates were rerun.

### 2. Pass the hosted Supabase and RLS gate

**Status:** complete — hosted matrix 134/134 plus manual matrix passed on 2026-08-10

Follow the full [V1 verification contract](docs/verification/V1_VERIFICATION.md) in a disposable hosted project, using [`202608090001_cetele_v1.sql`](supabase/migrations/202608090001_cetele_v1.sql), [`202608090002_manual_secure_invitations.sql`](supabase/migrations/202608090002_manual_secure_invitations.sql), and the additive upgrade migration [`202608090003_post_v1_upgrade_fixes.sql`](supabase/migrations/202608090003_post_v1_upgrade_fixes.sql), plus disposable subject, Direct Mentor, Mentor Above, peer, and outsider identities.

**Evidence:** `npm.cmd run verify:hosted` passed 134/134 after the sequential `001` → `002` → `003` install. Manual evidence covered secure-link claim and exceptional denial states, reload persistence, today/yesterday edits, quantitative values, Daily Review, completion- and excuse-driven attention invalidation/reopening, private/upward Follow-up visibility, Shared Habit adoption, cross-tree denial, theme/reminder persistence, and database advisor review. The redaction-safe run record is linked below.

**Stopping condition:** every required allow and deny case passes; manual secure-link claim, link expiry/revocation/replay denial, credential setup, reload persistence, date locks, attention invalidation and reopening, note privacy, Shared Habit visibility, and attributable interventions are verified; the project reference and sanitized command output are recorded in the verification contract and [issue #3](https://github.com/Troreen/cetele/issues/3). Any defect discovered is fixed and both local gates are rerun before this milestone stops.

### 3. Produce the V1 release candidate

**Status:** ready to publish — local and hosted release gates passed; candidate commit and push pending

Reconcile the hosted evidence, local evidence, documentation, and issue state. Close issues #3 and #1 only after their stopping conditions are met.

**Stopping condition:** local verification and the hosted gate both pass on the same candidate revision; no known release-blocking V1 defect remains; `README.md`, this plan, and the verification contract state the final evidence truthfully; the candidate revision is committed and pushed.

## Evidence index

- Scope and invariants: [`PRODUCT.md`](PRODUCT.md), [`CONTEXT.md`](CONTEXT.md), and the [V1 product definition](docs/product/Cetele_V1_Product_Definition_v0.1.md)
- UX contract: [`DESIGN.md`](DESIGN.md) and the [visual direction](docs/product/cetele_visual_identity_ux_direction_v1.md)
- Local and hosted gates: [`docs/verification/V1_VERIFICATION.md`](docs/verification/V1_VERIFICATION.md)
- Production database contract: [`202608090001_cetele_v1.sql`](supabase/migrations/202608090001_cetele_v1.sql), [`202608090002_manual_secure_invitations.sql`](supabase/migrations/202608090002_manual_secure_invitations.sql), then [`202608090003_post_v1_upgrade_fixes.sql`](supabase/migrations/202608090003_post_v1_upgrade_fixes.sql)
- Execution tracking: [issue #1](https://github.com/Troreen/cetele/issues/1) and [hosted-verification issue #3](https://github.com/Troreen/cetele/issues/3)

## Evidence rule

Record only checks performed against the named revision and environment. A plan, fixture, local adapter result, schema review, or migration file is not hosted Supabase evidence. Hosted claims in this plan refer only to the disposable project and dated run record.
