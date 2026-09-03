# Privacy-preserving accounts, consent, and invitations

**Status:** Milestones 0–5 implemented and verified; Milestone 6 blocked

**Date:** 2026-08-12

**Owner:** Mülahaza repository
**Production boundary:** Do not create the first real account, apply a production migration, or admit real users until every pre-production gate in this plan is met and Tarik explicitly authorizes the production operation.

This is the authoritative implementation handoff for Mülahaza account creation, authentication, legal surfaces, consent, invitations, and the removal of transitive mentor visibility. Read it together with [`PRODUCT.md`](../../PRODUCT.md), [`CONTEXT.md`](../../CONTEXT.md), [`DESIGN.md`](../../DESIGN.md), the [privacy research](../research/2026-08-12-privacy-preserving-identity-and-invitations.md), and [`V1_VERIFICATION.md`](../verification/V1_VERIFICATION.md). Where the older V1 product definition or verification fixtures require legal names, pre-identified invitees, ancestor access, branch aggregates, or senior intervention, this plan and the updated root product/domain documents supersede them.

This plan defines product and engineering behavior. It is not legal advice and must not be presented as a finding that Mülahaza is GDPR-compliant.

## Settled decisions

1. Mülahaza never asks for or stores legal names.
2. Each person has a stable random Auth UUID and a user-chosen, non-unique **Alias**. The Alias is what other authorized users see.
3. A private verified email remains inside Supabase Auth for sign-in, verification, recovery, and security notices. Application profile, invitation, habit, analytics, and log tables do not copy it.
4. Supabase manages password hashes. Application tables and logs never contain plaintext passwords, password hashes, recovery tokens, or full bearer invitation secrets.
5. Account creation is invite-only. Unrestricted public signup is not a supported path.
6. Mülahaza distinguishes an **Access Code** from a **Mentorship Invitation**:
   - An Access Code is admin-issued, expiring, revocable, and usable up to a configured cap. It creates an independent account and no mentorship relationship.
   - A Mentorship Invitation is mentor-issued, expiring, revocable, and single-use. It creates one Direct Mentor relationship when onboarding finishes.
7. The mentor does not pre-enter the invitee's name or email. The invitee chooses their Alias and supplies their private email during onboarding.
8. Habit and accountability visibility is direct-only. A Direct Mentor may see the justified records of their Direct Students. Indirect mentors receive no profile, completion, note, attention, review, follow-up, audit, or aggregate branch visibility by virtue of ancestry.
9. Remove higher-mentor branch dashboards, branch aggregates, senior intervention assignment/follow-up, and transitive RLS authorization. This is a data-access removal, not a UI-only change.
10. No analytics or research consent is requested in this milestone because no such processing is being introduced.
11. A future **Encouragement Connection** may support peer-to-peer responsibility or encouragement. It is outside this milestone and must later be introduced as a mutual, separately consented, revocable relationship with a fresh privacy/DPIA review. Existing accounts and history are never enrolled or shared retroactively.

## Required legal decisions before real-user processing

Implementation may proceed against synthetic fixtures and a disposable hosted Supabase project. Real-user activation remains blocked until the following are supplied or approved by the responsible human/legal owner:

- The legal identity and contact details of the Data Controller and privacy contact.
- A documented purpose map and Article 6 basis for account/recovery, personal history, direct-mentor accountability, support, and security operations.
- A reviewed Article 9(2) exception for spiritual habit data. If explicit consent under Article 9(2)(a) is selected, counsel must approve the final consent structure and assess whether the mentorship context permits consent to be freely given.
- The final Terms of Service, Privacy Notice, and Turkish consent wording, each with a stable version and effective date.
- A Record of Processing Activities and a documented DPIA decision; completing a DPIA before beta is the prudent default for this plan.
- Adult-only beta eligibility, or a separately reviewed minors pathway. Do not collect dates of birth merely to postpone this decision.
- Processor agreements, subprocessor inventory, hosting/data locations, and international-transfer assessment for Supabase, Vercel, email delivery, monitoring, support, and backups.
- Retention and deletion periods for active/inactive accounts, pending registrations, invitations, consent evidence, support records, security logs, and backups.
- A named incident owner and a tested personal-data-breach assessment procedure.

## Target journeys

### A. Admin creates an Access Code

1. An authorized administrator chooses an expiry and a small maximum-use count.
2. The server generates a cryptographically random secret and stores only its cryptographic hash plus status metadata.
3. The raw code or claim URL is shown exactly once for private distribution.
4. The administrator can view created time, expiry, remaining uses, completed uses, and revoked/expired state, but cannot recover the raw secret.
5. Revocation prevents new registrations without affecting accounts already created legitimately.

The first production account uses a separately documented, one-time bootstrap Access Code. Its creation and redemption are explicit production operations requiring Tarik's authorization. Do not seed an admin password, legal name, reusable backdoor, or hard-coded production identity.

### B. Mentor creates a Mentorship Invitation

1. A signed-in user creates a single-use invitation for one future Direct Student.
2. No recipient name or email is collected.
3. The server returns a bearer claim link once. Keep the raw secret in the URL fragment where feasible so it is not sent in ordinary request URLs, referrers, analytics, or logs.
4. The invitation expires after the configured duration, is revocable before claim, and exposes only neutral pending copy such as “Unclaimed invitation”.
5. Completion creates exactly one active Direct Mentor relationship. Concurrent or replayed claims fail atomically.

### C. Invitee verifies contact and creates an account

The implementation session must confirm the current supported Supabase flow against the changelog and official Auth documentation before choosing APIs. The target behavior is fixed even if the exact API sequence changes:

1. The invitee presents a valid Access Code or Mentorship Invitation.
2. Mülahaza validates it without consuming a use and displays what accepting it will do. A Mentorship Invitation identifies the inviting mentor by Alias only after the claim secret is valid.
3. The invitee supplies an email. Mülahaza gives a generic response that does not reveal whether the email already has an account.
4. Supabase verifies control of that email through a production-capable email flow. Configure custom SMTP or another approved delivery mechanism; do not depend on the best-effort default provider for production.
5. An authenticated but incomplete Auth user is routed only to account setup. No `profiles` row, mentorship relationship, habit access, or general application session becomes active until setup completes.
6. The invitee chooses an Alias and password, reads the legal surfaces, makes each required affirmative choice, and submits once.
7. One trusted server transaction/RPC locks the claim record, verifies the authenticated Auth user and pending registration, validates current legal-document versions, consumes the invitation/code use, inserts the profile and legal evidence, creates the Direct Mentor relationship when applicable, and marks onboarding complete.
8. Failure is recoverable and idempotent. It must not leave a consumed invitation without an account, an active account without required legal evidence, or a relationship attached to the wrong user.
9. Expired incomplete Auth users and pending registrations follow the approved cleanup schedule. Cleanup revokes sessions before deleting Auth users.

Do not authorize with user-editable `user_metadata`. Registration grants, code ownership, onboarding completion, administrator authority, and consent state must be checked against trusted server/database state.

### D. Returning sign-in and recovery

- Sign in with private email and password through Supabase Auth.
- Provide password recovery through the verified email with generic anti-enumeration responses.
- Rate-limit signup, claim, login, resend, and recovery; add CAPTCHA/risk controls where appropriate.
- Revoke sessions when an account is disabled or deletion begins. Do not assume deleting an Auth user instantly invalidates every issued access token.
- An incomplete account always returns to setup or cleanup assistance, never to `/today`.

## Account-creation information architecture and copy contract

The surface is **Operate** mode inside the established “Quiet Ledger” visual world. It must feel like a calm private handover, not a legal wall or an enterprise provisioning form.

Use a short stepped flow on mobile and a compact centered panel on desktop:

1. **Invitation:** validate the invitation and explain whether it creates an independent account or a Direct Mentor relationship.
2. **Private sign-in:** collect and verify email, then set password.
3. **Your Mülahaza identity:** choose Alias; state plainly that Mülahaza does not ask for a legal name and that authorized people see only this Alias.
4. **Privacy and agreement:** show layered plain-language summaries, links to the complete legal documents, and separate unchecked controls.
5. **Confirmation:** summarize the account, direct mentor if applicable, visibility, and how consent can later be withdrawn.

Required controls when the explicit-consent route is approved:

- **Terms Acceptance — required:** “I accept the Terms of Service.” This forms the service agreement; it is not described as privacy consent.
- **Core Tracking Consent — required for a tracking account:** an express statement consenting to storage and use of assigned spiritual habits, daily completion history, and calculated attention state for the user's personal habit record.
- **Direct Mentor Visibility Consent — required only for a mentored account:** an express statement consenting to the named Direct Mentor seeing the exact categories and time window required for accountability.
- **Privacy Notice:** link and concise acknowledgement that explains the processing; do not phrase the whole Privacy Notice as something the user broadly “agrees to”. Record delivery/version evidence if counsel requires it.

Optional completion notes are empty by default. Prefer just-in-time disclosure beside the note field rather than forcing consent for unwritten notes at account creation. Adding no note must preserve ordinary tracking.

There is no higher-mentor, peer, analytics, marketing, or research checkbox in this milestone. Consent controls may not be preselected. The primary action stays disabled until the currently required choices are affirmatively made. Validation identifies the missing choice in Turkish, preserves completed fields, moves focus to the error summary, and remains fully keyboard and screen-reader operable.

The final Turkish legal wording is externally supplied/approved content. Implementation may use clearly marked non-production draft copy in fixtures, but must not fabricate controller details or claim legal approval.

## Consent and legal-evidence model

Use explicit domain distinctions:

- **Terms Acceptance:** acceptance of a versioned contract.
- **Privacy Notice Delivery:** evidence of which notice was presented, if required by the approved design.
- **Consent Grant:** affirmative permission for one named processing purpose and scope.
- **Consent Withdrawal:** append-only evidence ending a Consent Grant; never overwrite history to imply consent never existed.

Persist at minimum:

- Auth user UUID
- event kind and purpose key
- document/copy version and content hash
- granted/accepted/presented/withdrawn timestamp
- exact recipient scope relevant to that purpose
- affirmative-action method
- withdrawal relationship to the earlier grant

Do not collect an IP address solely as consent evidence unless the approved legal/security analysis establishes a need. Do not put sensitive habit content in legal-evidence rows.

Consent version changes must be classified:

- Editorial/non-material change: retain the prior grant if counsel approves the version mapping.
- New purpose, new recipient class, materially broader data, or changed consequence: require a new explicit grant before that processing begins.
- A future peer feature is always a new purpose/recipient scope and requires new opt-in from existing users.

Withdrawal must be as easy as granting consent:

- Withdrawing optional processing stops only that processing.
- Withdrawing Direct Mentor Visibility immediately blocks the mentor at server and RLS layers and ends/pauses the relationship according to the approved product rule.
- Withdrawing Core Tracking Consent stops future tracking and starts the approved export/closure/deletion path. Explain this consequence before consent and again before withdrawal.
- Never silently change legal basis after withdrawal.

## Data model and migration work

The implementation should produce additive, reviewable migrations first and verify them in a disposable hosted project. Reconfirm production contains no users before choosing any zero-user simplification.

Expected schema changes:

1. Replace legal-name semantics with Alias semantics across profiles, attribution snapshots, fixtures, DTOs, UI, and tests. Prefer a real `alias` column and remove `invitee_name`; do not merely relabel a field whose validation/copy still asks for a full name.
2. Add application-owned `access_codes` with hashed secret, expiry, maximum uses, consumed uses, revocation, creator, and minimal audit timestamps.
3. Refactor `mentorship_invitations` to contain no recipient identity before claim; retain hashed secret, mentor, expiry, revocation, claim state, and resulting user/relationship references.
4. Add trusted `pending_registrations` or an equivalent design that binds an Auth UUID to exactly one validated claim without copying email into application tables.
5. Add versioned legal-document metadata and append-only legal events/consent evidence.
6. Represent onboarding completion in trusted database/app metadata, not user metadata.
7. Replace every transitive ancestor policy/helper with direct-relationship predicates for personal/accountability data.
8. Remove policies and RPC paths that allow senior intervention, branch aggregation, ancestor review/follow-up access, or indirect profile discovery.
9. Preserve user-owned history when a Direct Mentor relationship ends; ending visibility must not delete the user's record.
10. Add indexes and uniqueness/check constraints for atomic invitation/code consumption, one active Direct Mentor, consent lookup, cleanup, and expiry.

Every table in an exposed schema requires explicit grants and RLS. `TO authenticated` is not authorization by itself. UPDATE policies require both ownership/relationship `USING` and `WITH CHECK`. Keep privileged functions in a non-exposed schema, set a safe search path, revoke default `PUBLIC` execution, grant only the intended roles, and include authenticated actor checks inside any justified `SECURITY DEFINER` function.

## Direct-only authorization matrix

At minimum, hosted verification must prove:

| Record | Owner | Direct Mentor | Indirect Mentor | Peer/outsider | Admin service boundary |
| --- | --- | --- | --- | --- | --- |
| Auth email/credential | Auth self-service | deny | deny | deny | only approved Auth administration |
| Alias/profile | self | direct student Alias only | deny | deny | minimal support path |
| Habit Assignment/history | self | allowed for direct student within approved scope | deny | deny | no routine content access |
| Completion Note | self | allowed only as disclosed | deny | deny | no routine content access |
| Attention state | self as defined by final UX; direct mentor operationally | allowed for direct student | deny | deny | no routine content access |
| Daily Review/Follow-up | writer | writer's own operational record | deny | deny | minimal support path |
| Invitation/code administration | creator or authorized admin | own invitations | deny | deny | authorized administration only |
| Consent evidence | self-readable where appropriate | deny | deny | deny | tightly scoped compliance support |

The application UI, server actions, RPCs, database views, and RLS must agree. A hidden route or button is not an authorization control.

## Removing higher-mentor visibility

Inventory and remove or replace all behavior that depends on ancestry, including:

- `private.is_mentor_above`, `private.is_current_user_mentor_above`, and every policy/RPC using them for personal or accountability access.
- Branch profile/relationship discovery and branch completion aggregation.
- Senior intervention assignment and Follow-up.
- “writer and above”, “actor and above”, and “reviewer and above” visibility.
- Network and library UI that lists indirect students or offers exceptional assignment.
- Fixture identities, selectors, component tests, E2E journeys, hosted matrices, copy, and docs that imply transitive access.

Retain only direct relationships. A person's Direct Mentor may themselves have a Direct Mentor, but those relationships do not compose into data access. Same-tree Shared Habit discovery is not personal-history visibility; keep it only if its implementation can avoid exposing profiles or accountability data, otherwise isolate it behind a separate product decision rather than preserving accidental ancestry access.

## Future Encouragement Connection

The future peer feature is feasible, but it must be designed as a new processing purpose rather than smuggled into the current mentorship consent.

When that work is proposed:

1. Update the purpose map, processing record, Privacy Notice, retention model, threat model, and DPIA/risk assessment before implementation.
2. Define the exact data peers can see. Default toward deliberately sent encouragement/status signals, not full history, notes, mentor records, or automatic religious profiling.
3. Require a mutual invitation/acceptance and a separate unchecked Consent Grant from both people.
4. Make refusal and withdrawal independent of core tracking and mentorship.
5. Share nothing retroactively. Existing history remains private unless a later, specific, informed choice explicitly covers a bounded historical range.
6. Allow either person to disconnect or block immediately; server authorization and RLS revoke access at once while preserving each user's own history.
7. Provide abuse reporting/safety rules before peer discovery or unsolicited contact exists.

The canonical spelling is **Encouragement Connection**. Implementation is intentionally absent from the current milestone.

## Implementation sequence and stopping conditions

### Milestone 0 — Reconfirm environment and legal inputs

- Read current `AGENTS.md`, Next.js 16 guides under `node_modules/next/dist/docs/` for the APIs being changed, and the current Supabase Auth changelog/docs.
- Inspect the current production-user count read-only. Treat prior “zero users” evidence as historical until reconfirmed.
- Inventory every current direct and transitive authorization path.
- Record which legal inputs are approved and which remain placeholders.

**Stop when:** the inventory accounts for every auth/invite/profile/ancestor policy and the production boundary is explicit. If legal copy is not approved, continue only with synthetic/disposable implementation and keep real-user activation blocked.

### Milestone 1 — Lock contracts with tests

- Add failing domain/component/migration-contract tests for Alias, code types, consent versions/events, incomplete onboarding, atomic claims, and direct-only visibility.
- Replace old tests that celebrate ancestor access with explicit denial cases; do not merely delete coverage.
- Extend the hosted verification matrix with direct mentor, indirect mentor, peer, outsider, incomplete account, withdrawn-consent, replay, expired, revoked, and exhausted-code identities.

**Stop when:** the new tests fail for the intended missing behavior and every removed privacy capability has a corresponding denial assertion.

### Milestone 2 — Implement schema and trusted account lifecycle

- Create and review migrations, functions, grants, RLS, cleanup seams, and consent evidence.
- Implement the verified-email/incomplete-user/setup transaction flow.
- Implement sign-in, resend, recovery, withdrawal session revocation, and generic failures.
- Run database advisors and the disposable hosted matrix.

**Stop when:** concurrency/replay tests prove codes cannot over-consume, incomplete users cannot enter the app, legal evidence and profile/relationship creation are atomic, and all indirect visibility is denied at the database layer.

### Milestone 3 — Implement invite administration and onboarding UX

- Build Access Code administration, Mentorship Invitation creation/revocation, claim states, account setup, legal layers, and completion/assistance states.
- Preserve the Quiet Ledger design system, Turkish end-user language, dark/light themes, 44px minimum targets, visible focus, semantic errors, reduced motion, and phone-first layout.
- Add Settings surfaces for legal documents, consent state/withdrawal, account export, and account deletion requests as defined by the approved policy.

**Stop when:** component and browser journeys cover typical, narrow-mobile, keyboard, screen-reader labeling, loading, invalid, expired, revoked, exhausted, replayed, duplicate-email, resend, recovery, withdrawn, and abandoned-onboarding states.

### Milestone 4 — Remove indirect visibility end-to-end

- Remove branch/higher-mentor UI and server paths.
- Replace selectors/loaders/DTOs with direct-only data.
- Reconcile Shared Habit discovery without restoring personal ancestry access.
- Update `PRODUCT.md`, `CONTEXT.md`, `DESIGN.md`, fixtures, and verification docs to describe shipped behavior precisely.

**Stop when:** an indirect mentor cannot discover or infer a descendant's account, Alias, relationship, habits, history, notes, attention, reviews, follow-ups, or aggregates through UI, API, RPC, or direct Data API access.

### Milestone 5 — Full verification and production-ready handoff

- Run focused tests throughout, then `npm.cmd run verify` and `npm.cmd run test:e2e` on the final tree.
- Run the expanded disposable hosted Supabase matrix and advisors against the exact candidate revision.
- Perform one bounded Impeccable browser QA pass at mobile and desktop sizes, fix the batch, and confirm once.
- Conduct an independent code review focused on authorization, consent evidence, token handling, cleanup, logs, and destructive account operations.
- Update the dated verification record with performed evidence and explicit unperformed legal/production checks.

**Stop when:** all automated and manual gates pass on one candidate; no raw secrets or private emails appear in application tables/logs/client payloads; direct-only denial evidence is complete; and remaining real-world steps are limited to approved legal inputs and explicitly authorized production operations.

### Milestone 6 — Production activation, separately authorized

- Obtain final controller/legal approval and fill the real legal documents/version records.
- Confirm processor/transfer, retention, incident, and adult/minor gates.
- Back up and inspect production, reverify user count and migration compatibility, apply only reviewed migrations, configure approved SMTP/Auth URLs/rate limits/CAPTCHA, and run a sanitized production smoke test.
- Create and immediately revoke the one-time bootstrap mechanism after the first authorized account completes onboarding.

**Stop when:** Tarik has explicitly authorized the production operations, the first account completes the approved journey, the bootstrap path is closed, no unexpected user/data exists, and a sanitized operational record documents the result. Do not claim general GDPR compliance; report the concrete controls and approvals actually verified.

## Verification minimums

- Unit/domain: validation, consent versioning, withdrawal state, expiry, revocation, max-use concurrency, idempotency, alias rules, cleanup selection.
- Component: layered legal content, unchecked choices, focus/error behavior, copy privacy, incomplete/recovery states.
- Route/server: unauthenticated, incomplete, complete, withdrawn, disabled, and cross-user authorization.
- Migration contract: grants, RLS, direct predicates, function execution, safe search paths, removed ancestor capabilities.
- Hosted: real Auth email verification, password setup/recovery, SSR session, Data API/RPC allow-and-deny matrix, concurrent claims, replay denial, session revocation, advisors.
- E2E: Access Code signup, Mentorship Invitation signup, returning login, recovery, invite revocation/expiry/exhaustion, consent display/evidence, withdrawal, export/deletion request, and direct-versus-indirect mentor access.
- Manual: Turkish copy, mobile/desktop layout, dark/light themes, assistive labels, keyboard-only flow, email link handoff, privacy notice/terms links, and absence of leaked secrets or emails in URLs/logs/UI.

## Out of scope

- Encouragement Connections or peer discovery
- Higher-mentor visibility, branch aggregates, or senior intervention
- Marketing, behavioral analytics, advertising, or research reuse
- Social login, phone authentication, experimental passkeys, or custom username/password authentication
- Real minors
- A claim that legal documents or software alone guarantee GDPR compliance

## Handoff rule

The next session owns implementation through Milestone 5 unless Tarik narrows the scope. It may make routine engineering decisions autonomously, but must stop for unresolved controller/legal text, Article 9 route, minors, materially different privacy behavior, or production mutation. Preserve unrelated work, use reviewed-file staging rather than `git add .`, and do not create a real account merely to test the flow.
