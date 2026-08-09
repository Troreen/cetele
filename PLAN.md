# Çetele delivery plan

This file is the authoritative delivery sequence. Product behavior remains authoritative in [`PRODUCT.md`](PRODUCT.md) and the [V1 product definition](docs/product/Cetele_V1_Product_Definition_v0.1.md); GitHub issues hold execution discussion.

## Current truth — 2026-08-09

- **V1 application scope is implemented and locally verified.** On 2026-08-09, the current candidate's `npm.cmd run verify` passed ESLint, strict TypeScript, 28 Vitest tests, and the production build. `npm.cmd run test:e2e` passed all 9 Playwright journeys.
- **Production readiness is gated.** The Supabase schema, RPCs, and RLS policies exist, but the migration has not been executed against a connected hosted project and the multi-identity allow/deny matrix has not been exercised.
- The local adapter proves application behavior and browser persistence only. Production authentication, PostgreSQL persistence, email delivery, and RLS remain **hosted-unverified**.
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

**Status:** ready; blocked only on the disposable hosted project and credentials

Follow the full [V1 verification contract](docs/verification/V1_VERIFICATION.md) in a disposable hosted project, using [`202608090001_cetele_v1.sql`](supabase/migrations/202608090001_cetele_v1.sql) and disposable subject, Direct Mentor, Mentor Above, peer, and outsider identities.

**Local preparation complete:** `npm.cmd run verify:hosted` now provides a fail-closed, redaction-safe 32-check initial identity matrix. The migration has explicit least-privilege grants, private hierarchy helpers, RLS identity-call hardening, missing FK/filter indexes, and static migration-contract tests. Hosted mutation failures are handled and surfaced to the user. None of this substitutes for executing the migration and matrix against PostgreSQL.

**Stopping condition:** every required allow and deny case passes; invitation/password setup, reload persistence, date locks, attention invalidation and reopening, note privacy, Shared Habit visibility, and attributable interventions are verified; the project reference and sanitized command output are recorded in the verification contract and [issue #3](https://github.com/Troreen/cetele/issues/3). Any defect discovered is fixed and both local gates are rerun before this milestone stops.

### 3. Produce the V1 release candidate

**Status:** pending Milestone 2

Reconcile the hosted evidence, local evidence, documentation, and issue state. Close issues #3 and #1 only after their stopping conditions are met.

**Stopping condition:** local verification and the hosted gate both pass on the same candidate revision; no known release-blocking V1 defect remains; `README.md`, this plan, and the verification contract state the final evidence truthfully; the candidate revision is committed and pushed.

## Evidence index

- Scope and invariants: [`PRODUCT.md`](PRODUCT.md), [`CONTEXT.md`](CONTEXT.md), and the [V1 product definition](docs/product/Cetele_V1_Product_Definition_v0.1.md)
- UX contract: [`DESIGN.md`](DESIGN.md) and the [visual direction](docs/product/cetele_visual_identity_ux_direction_v1.md)
- Local and hosted gates: [`docs/verification/V1_VERIFICATION.md`](docs/verification/V1_VERIFICATION.md)
- Production database contract: [`supabase/migrations/202608090001_cetele_v1.sql`](supabase/migrations/202608090001_cetele_v1.sql)
- Execution tracking: [issue #1](https://github.com/Troreen/cetele/issues/1) and [hosted-verification issue #3](https://github.com/Troreen/cetele/issues/3)

## Evidence rule

Record only checks performed against the named revision and environment. A plan, fixture, local adapter result, schema review, or migration file is not hosted Supabase evidence. Until Milestone 2 stops successfully, describe production persistence and RLS as **hosted-unverified**.
