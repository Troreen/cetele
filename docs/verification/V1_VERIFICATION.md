# V1 verification gate

## Verified locally

- Strict TypeScript with generated Next route types, ESLint, 79 Vitest component/domain/action/migration-contract tests, and the production Next.js build.
- Nine Chrome end-to-end journeys covering manual secure-link claim → student-chosen credentials → Today, sign-out, completion → reload, independent Daily Review and Follow-up, private Follow-up-note attribution, theme persistence, and 390px overflow protection.
- Regression coverage for hosted mutation failures, assignment-scoped Excused Days, mistaken-assignment correction, hierarchy-helper exposure, explicit table privileges, RLS identity-call wrapping, and required FK/filter indexes.
- Browser inspection at 1440×1000 and 390×844 in dark mode, plus interactive light-mode verification.
- Impeccable design detector against the extended `DESIGN.md` system.

## Local adapter boundary

The local adapter persists deterministic fixtures in browser storage. It proves application behavior and responsive UI, but it does not prove Supabase Auth, Postgres durability, manual invitation claiming, reminder delivery, or RLS.

## Hosted Supabase gate — executable matrix verified

The disposable hosted project completed the sequential migration postchecks, manual secure-link relationship bootstrap, seed setup, and executable matrix at 134/134 on 2026-08-10. The complementary manual browser/database matrix also passed. Never put passwords, publishable/secret key values, access tokens, refresh tokens, disposable email addresses, or actual invitation links in Git, an issue, a terminal transcript, or verification evidence.

See [the redaction-safe hosted run record](2026-08-09-hosted-v1.md) for the original V1 evidence boundary and [the PR #5 hosted recheck](2026-08-11-pr5-hosted-recheck.md) for migration `004` and the expanded 156/156 matrix.

### 1. Create and configure a disposable project

1. Create a disposable hosted Supabase project. Record its project reference only; the reference is non-secret.
2. Apply `supabase/migrations/202608090001_cetele_v1.sql`, `supabase/migrations/202608090002_manual_secure_invitations.sql`, and `supabase/migrations/202608090003_post_v1_upgrade_fixes.sql`, in that order, through the SQL editor or another approved database channel. If an earlier `001` or `001` plus `002` was already applied, apply every later migration in filename order; `003` deliberately re-applies post-`001` function and privilege fixes for upgrade safety. Do not apply these migrations to production before the disposable gate passes.
3. Copy `.env.example` to the ignored `.env.local`. Fill the project URL, publishable key, server-only secret key, and application origin. Leave `NEXT_PUBLIC_CETELE_DATA_ADAPTER=local` as the default while preparing the project. The preparation helper below generates any fully missing disposable identity pairs.
4. Do not configure SMTP or email templates. Çetele V1 uses Manual Secure Invitations delivered privately outside the application.

The harness rejects HTTP project URLs, missing values, duplicate identity emails, and a `sb_secret_…` value placed in the publishable-key variable. It uses only the public project URL, publishable key, and each user's password session. `SUPABASE_SECRET_KEY` is used only by the server-side manual claim action after a valid one-time token is presented, never by the matrix harness.

### 2. Bootstrap the five-identity graph

Use five distinct disposable identities and isolated browser contexts:

```text
Mentor Above
├── Direct Mentor
│   └── subject
└── peer

outsider (no relationship to this tree)
```

1. Run `npm.cmd run prepare:hosted`. It generates cryptographically random values only for fully missing identity pairs, writes them only to the ignored `.env.local`, keeps the adapter `local`, and creates only the Mentor Above and outsider Auth users with confirmed email status. It never prints credentials, emails, user IDs, keys, or tokens. A rerun reuses users whose exact configured emails already exist. A half-present pair, unsafe URL/key, non-local adapter, or provider error fails closed with redacted output.
2. Stop every running Next.js process. Change the ignored `.env.local` to `NEXT_PUBLIC_CETELE_DATA_ADAPTER=supabase`, remove the candidate's `.next` directory, and run `npm.cmd run build` before `npm.cmd run dev`. A shell-only override is not sufficient for this public variable: Next.js can otherwise serve server output using `supabase` while the browser bundle still contains the `local` value from `.env.local` or a previous build.
3. Sign in as Mentor Above using the generated pair, create Manual Secure Invitations for Direct Mentor and peer, and copy each link once. Deliver/open each link only in its intended isolated browser context, use each identity's generated email and password, and confirm the relationship activates.
4. Sign in as Direct Mentor, create a Manual Secure Invitation for subject, and claim it in another isolated browser context with the subject's generated email and password.
5. Confirm outsider can sign in but has no mentorship relationship to the test tree.
6. As Direct Mentor, create at least one `shared` Habit Definition and assign at least one active Habit Assignment to subject. For deterministic attention verification, at least one active assignment must have been created on or before the first of the previous two subject-local dates, with no Completion or Excused Day on either date. Do not leave an existing open or followed-up Needs Attention item for the second missed date.
7. Stop the temporary verification process when bootstrapping is complete. Do not pass any identity value as a command-line argument or copy it into verification evidence. After all hosted checks finish, restore `NEXT_PUBLIC_CETELE_DATA_ADAPTER=local` in the ignored `.env.local`, remove `.next` again, and rebuild before resuming local-adapter development.

Before running the harness, confirm the app can sign in as each identity. Use separate browser profiles or private contexts so cookies cannot cross identities.

### 3. Run the executable hosted matrix

From the repository root:

```powershell
npm.cmd run verify:hosted
```

The harness signs in all five identities with independent public Supabase clients and checks:

- self, direct-mentor, and Mentor Above profile visibility;
- peer and outsider denial for the subject's profile and direct relationship;
- same-tree Shared Habit discovery for subject and peer, with outsider denial;
- subject, Direct Mentor, and Mentor Above reads of the subject assignment and completion, with peer/outsider denial;
- subject-only completion RPC authorization, mentor/peer/outsider denial, and rejection of dates older than yesterday;
- peer/outsider denial when assigning into the subject branch;
- a Direct Mentor assignment returning a canonical database UUID, successful removal and restoration while active, preservation as an ended assignment after a Completion, and denial when the subject tries to remove that ended history;
- Direct Mentor attention reconciliation producing the exact deterministic contributor set, followed by subject/peer/outsider denial and Direct Mentor/Mentor Above visibility, completion-driven invalidation, and removal-driven reopening with the exact restored contributors;
- subject-owned assignment preferences, reminder preferences, and theme mutation boundaries, including denied cross-user writes;
- Direct Mentor and Mentor Above Daily Review authorization plus writer/upward-only visibility;
- Direct Mentor-only assignment-specific and whole-day excuses, with upward-only excuse/audit visibility;
- quantitative completions for today and yesterday, including persisted amount/retrospective semantics and missing-amount rejection;
- Mentor Above intervention assignment attribution, correction behavior, and writer/upward-only assignment, intervention, excuse, and correction audit visibility;
- unauthenticated denial across every protected table and the complete public V1 RPC/internal-function surface.

The successful mutation checks create disposable binary, quantitative, and intervention Habit Definitions and their related assignment, completion, preference, excuse, review, and audit artifacts. Marker-bearing text uses the same random cleanup marker. The harness deliberately does not delete data or users. It prints neither credentials, emails, publishable keys, nor session tokens.

Expected shape (counts may grow as the matrix expands):

```json
{
  "gate": "PASS",
  "project_ref": "example-project-ref",
  "cleanup_marker": "cetele-hosted-verify:example-uuid",
  "passed": 134,
  "failed": 0,
  "results": [
    {
      "resource": "profile.self",
      "actor": "subject",
      "expectation": "allow",
      "status": "PASS",
      "detail": ""
    }
  ]
}
```

Any missing seed row, authentication failure, unexpected allow, or unexpected denial exits non-zero. Error output is passed through the same redactor. Treat a harness failure as evidence to investigate, not as permission to weaken RLS.

### 4. Manual matrix result

The executable matrix is a repeatable safety net; it does not by itself prove browser delivery, invitation-claim exceptional states, or every temporal transition. On 2026-08-09 through 2026-08-10, the disposable hosted project passed the following complementary checks:

- manual link generation → claim with student-chosen credentials → relationship acceptance;
- expired, revoked, malformed, and replayed link denial without revealing whether a token exists;
- second-active-mentor and mentorship-cycle rejection;
- browser reload of binary and quantitative completions and today/yesterday edits;
- completion- and excuse-driven attention invalidation, exact contributor restoration, and reopening;
- independent browser Daily Review and successful Direct Mentor/Mentor Above Follow-up actions;
- student denial of attention items and private Follow-up notes;
- writer/upward-only Follow-up visibility;
- same-tree Shared Habit adoption and cross-tree denial;
- browser confirmation that preferences and theme persist after reload.

Use the Supabase database linter after applying the migration. Record warnings separately from correctness failures; do not change migration semantics merely to silence a warning.

### 5. Capture redaction-safe evidence

For a successful run, record only:

- date and tester;
- disposable project reference;
- migration filename and database command/tool used;
- harness commit SHA;
- `gate`, `passed`, and `failed` fields;
- aggregate `gate`, `passed`, and `failed` fields; the complete row contract is the committed `plannedMatrix()` definition plus its parity test, while the harness emits every row during execution;
- the cleanup marker until cleanup is confirmed;
- manual-matrix pass/fail notes with no identity values.

Before committing evidence, search it for `@`, `sb_secret_`, `sb_publishable_`, `eyJ`, `Bearer`, `password`, and the actual disposable identity values. A clean harness result should contain none of them.

### 6. Clean up deliberately

The harness never performs destructive cleanup. In the disposable project:

1. Find the verification artifacts by the exact printed `cleanup_marker` in `public.habit_definitions.name`, `public.completions.note`, and `public.habit_assignments.correction_reason`; inspect their exact related IDs and audit rows before deletion.
2. Remove the verified artifact graph and all other data created by the manual matrix using the Supabase Dashboard/SQL editor with explicit IDs, or dispose of the entire disposable project.
3. Remove the five disposable Auth users only after database evidence is captured.
4. Delete `.env.local` values or rotate the disposable project keys.
5. Record that cleanup completed, then remove the cleanup marker from durable evidence if it is no longer useful.

Never automate cleanup against a non-disposable project. Never use broad deletes without first resolving and reviewing the exact disposable targets.

### 7. Promote the adapter only after the full gate

Set `NEXT_PUBLIC_CETELE_DATA_ADAPTER=supabase` in the deployment environment only for a hosted build. Build a fresh deployment artifact after changing this public variable; do not reuse a `.next` directory built for the local adapter. The 134/134 executable matrix and complementary manual matrix prove their listed Auth, RPC, persistence, browser, and RLS checks against the disposable hosted project.
