# V1 verification gate

## Verified locally

- Strict TypeScript, ESLint, 28 Vitest component/domain/action/migration-contract tests, and the production Next.js build.
- Nine Chrome end-to-end journeys covering invitation → password → Today, sign-out, completion → reload, independent Daily Review and Follow-up, private Follow-up-note attribution, theme persistence, and 390px overflow protection.
- Regression coverage for hosted mutation failures, assignment-scoped Excused Days, mistaken-assignment correction, hierarchy-helper exposure, explicit table privileges, RLS identity-call wrapping, and required FK/filter indexes.
- Browser inspection at 1440×1000 and 390×844 in dark mode, plus interactive light-mode verification.
- Impeccable design detector against the extended `DESIGN.md` system.

## Local adapter boundary

The local adapter persists deterministic fixtures in browser storage. It proves application behavior and responsive UI, but it does not prove Supabase Auth, Postgres durability, mail delivery, reminder delivery, or RLS.

## Hosted Supabase gate — not yet verified

Hosted execution remains unverified until a disposable project completes both the executable initial matrix and the remaining manual checks below. Never put passwords, publishable/secret key values, access tokens, refresh tokens, or disposable email addresses in Git, an issue, a terminal transcript, or verification evidence.

### 1. Create and configure a disposable project

1. Create a disposable hosted Supabase project. Record its project reference only; the reference is non-secret.
2. Apply `supabase/migrations/202608090001_cetele_v1.sql` once through the SQL editor or another approved database channel. Do not apply it to production.
3. Add `${CETELE_APP_ORIGIN}/auth/confirm` to Authentication → URL Configuration → Redirect URLs.
4. Configure the invite template link as:

   ```text
   {{ .RedirectTo }}&token_hash={{ .TokenHash }}&type=invite
   ```

   The server-generated `RedirectTo` already contains the invitation identifier.
5. Use working email delivery. Supabase's development mail limits may require project SMTP for repeated disposable invitations.
6. Copy `.env.example` to the ignored `.env.local`. Fill the project URL, publishable key, server-only secret key, application origin, and five verification identities there. Leave `NEXT_PUBLIC_CETELE_DATA_ADAPTER=local` while preparing the project.

The harness rejects HTTP project URLs, missing values, duplicate identity emails, and a `sb_secret_…` value placed in the publishable-key variable. It uses only the public project URL, publishable key, and each user's password session. `SUPABASE_SECRET_KEY` is used by the application invitation action, never by the matrix harness.

### 2. Bootstrap the five-identity graph

Use five distinct disposable identities and isolated browser contexts:

```text
Mentor Above
├── Direct Mentor
│   └── subject
└── peer

outsider (no relationship to this tree)
```

1. Create the Mentor Above bootstrap user through the Supabase Dashboard/admin channel with a password. The application intentionally has no public sign-up.
2. Sign in as Mentor Above and invite Direct Mentor and peer through Çetele.
3. Open each real invite email, complete token confirmation and password setup, and accept the relationship.
4. Sign in as Direct Mentor and invite subject. Complete subject's real invite and password flow.
5. Create outsider through the Dashboard/admin channel with no mentorship relationship to the test tree.
6. As Direct Mentor, create at least one `shared` Habit Definition and assign at least one active Habit Assignment to subject. Leave at least one active assignment without a completion on the day the harness will run.
7. Put the five email/password pairs in the corresponding `CETELE_VERIFY_*` variables in `.env.local`. Do not pass them as command-line arguments.

Before running the harness, confirm the app can sign in as each identity. Use separate browser profiles or private contexts so cookies cannot cross identities.

### 3. Run the executable initial matrix

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
- Direct Mentor execution of attention reconciliation.

The successful completion check writes one disposable completion whose note is a random cleanup marker. The harness deliberately does not delete data or users. It prints neither credentials, emails, publishable keys, nor session tokens.

Expected shape (counts may grow as the matrix expands):

```json
{
  "gate": "PASS",
  "project_ref": "example-project-ref",
  "cleanup_marker": "cetele-hosted-verify:example-uuid",
  "passed": 32,
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

### 4. Complete the remaining manual matrix

The executable matrix is an initial, repeatable safety net; it does not by itself complete the V1 hosted gate. Exercise and record allow and deny cases for every table and RPC, especially:

- actual invitation → token confirmation → password → relationship acceptance;
- second-active-mentor and mentorship-cycle rejection;
- Direct Mentor assignment, Mentor Above intervention assignment, correction, and their audit events;
- Direct Mentor-only assignment/day excuses and audit events;
- binary and quantitative completions, persisted reload, today/yesterday edits, and older-date rejection;
- one student-level attention item containing every contributing assignment;
- completion/excuse invalidation and completion removal reopening;
- independent Daily Review and Follow-up actions;
- student denial of attention items and private Follow-up notes;
- writer/upward-only Follow-up, Daily Review, and audit visibility;
- assignment preference, reminder preference, and theme self-write boundaries;
- same-tree Shared Habit adoption and cross-tree denial;
- unauthenticated denial for all protected tables and RPCs.

Use the Supabase database linter after applying the migration. Record warnings separately from correctness failures; do not change migration semantics merely to silence a warning.

### 5. Capture redaction-safe evidence

For a successful run, record only:

- date and tester;
- disposable project reference;
- migration filename and database command/tool used;
- harness commit SHA;
- `gate`, `passed`, and `failed` fields;
- result resource/actor/expectation/status rows;
- the cleanup marker until cleanup is confirmed;
- manual-matrix pass/fail notes with no identity values.

Before committing evidence, search it for `@`, `sb_secret_`, `sb_publishable_`, `eyJ`, `Bearer`, `password`, and the actual disposable identity values. A clean harness result should contain none of them.

### 6. Clean up deliberately

The harness never performs destructive cleanup. In the disposable project:

1. Find the completion by the exact printed `cleanup_marker` in `public.completions.note` and inspect it before deletion.
2. Remove all other data created by the manual matrix using the Supabase Dashboard/SQL editor with explicit IDs or dispose of the entire disposable project.
3. Remove the five disposable Auth users only after database evidence is captured.
4. Delete `.env.local` values or rotate the disposable project keys.
5. Record that cleanup completed, then remove the cleanup marker from durable evidence if it is no longer useful.

Never automate cleanup against a non-disposable project. Never use broad deletes without first resolving and reviewing the exact disposable targets.

### 7. Promote the adapter only after the full gate

Set `NEXT_PUBLIC_CETELE_DATA_ADAPTER=supabase`, restart the application, and repeat the browser V1 journeys only after the executable and manual hosted checks pass. Until then, production persistence and RLS status is **unverified**, not failed.
