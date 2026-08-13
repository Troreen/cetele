# Private accounts, consent, and invitations — 2026-08-12

## Candidate outcome

Milestones 0–5 are implemented on the reviewed working tree. The candidate uses non-unique Alias identities, keeps recovery email in Supabase Auth, supports limited-use Access Codes and single-use Mentorship Invitations, records versioned Terms/notice/consent evidence, and limits personal accountability visibility to the exact Direct Mentor named by consent.

No production migration, real account, real-user signup, legal approval, or production adapter activation was performed. Fixture legal text is explicitly non-production.

## Automated evidence

- `npm.cmd run verify`: passed ESLint, generated-route TypeScript, 118/118 Vitest tests, and the Next.js 16.3.0 production build.
- `npm.cmd run test:e2e`: passed 15/15 Playwright journeys. The suite covers desktop plus bounded 320px/390px mobile layouts, dark/light appearance, onboarding choices, fragment scrubbing, privacy settings, direct-student selection, and nested-student route denial.
- The first full E2E attempt exposed a hydration/persistence readiness race in the test helper. A focused journey passed, the helper was changed to await storage readiness, and the complete 15/15 suite then passed.
- `git diff --check`: passed; only expected Windows line-ending notices were emitted.

## Disposable hosted evidence

Disposable project: `doyzpafuqqoydnkxmbxg`. Only synthetic fixtures were used. Migrations `202608120001` through `202608120005` were applied there; the production project was inspected read-only and not mutated.

`npm.cmd run verify:hosted` passed 48/48. It proves direct-only allows/denials; private Follow-up; exact-recipient consent; purpose-wide withdrawal; incomplete-account denial; recovery-only closure visibility; stale-JWT data denial; Access Code expiry/revocation/exhaustion/reservation; invitation replay denial; and refresh-token failure after server-side session revocation.

Both cleanup processors passed in dry-run mode with explicit unequal project refs and found zero eligible records. No deletion was executed.

The bounded Auth Invite User probe used a reserved synthetic `example.com` address. Supabase rejected it as `email_address_invalid` before creating an Auth user. Hosted email delivery, template rendering, and the complete invite/password journey therefore remain unverified; no real address was substituted.

## Advisors and independent review

Security and performance advisors were rerun after the final migrations. Service-only tables intentionally report RLS-with-no-policy information. Reviewed application RPCs report authenticated `SECURITY DEFINER` warnings; each retains an empty search path and explicit identity/account/consent checks. Performance findings are unused-index information on the small disposable fixture. Leaked-password protection is disabled and remains a production activation blocker. [Supabase advisor remediation](https://supabase.com/docs/guides/database/database-linter)

An independent security-focused review drove fixes for indirect Shared Habit identity exposure, deletion recovery, confirmation login-CSRF, token query scrubbing, inactive privileged callers, exact-recipient consent, production gates, deletion-safe legal evidence, stale-session mutations, session revocation, and abandoned-invite recovery. It made no GDPR-compliance claim.

## Explicitly unperformed / blocked

- No Milestone 6 production mutation or real account.
- No approved controller details, Article 6/9 determination, Terms, Privacy Notice, Turkish legal wording, or minors/DPIA decision.
- No approved SMTP, production Auth URLs/templates, CAPTCHA, rate-limit tuning, leaked-password protection, or real mailbox test.
- No claim of general GDPR compliance.

Production remains blocked by both the application project-ref guard and database `deployment_controls`. Activation requires Tarik's explicit authorization and qualified human/legal approval.
