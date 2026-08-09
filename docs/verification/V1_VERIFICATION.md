# V1 verification gate

## Verified locally

- Strict TypeScript, ESLint, 18 Vitest component/domain/action tests, and the production Next.js build.
- Nine Chrome end-to-end journeys covering invitation → password → Today, sign-out, completion → reload, independent Daily Review and Follow-up, private Follow-up-note attribution, theme persistence, and 390px overflow protection.
- Regression coverage for assignment-scoped Excused Days and voiding mistaken assignments without Completion history while preserving ended-assignment history.
- Browser inspection at 1440×1000 and 390×844 in dark mode, plus interactive light-mode verification.
- Impeccable design detector against the extended `DESIGN.md` system.

## Local adapter boundary

The local adapter persists deterministic fixtures in browser storage. It proves application behavior and responsive UI, but it does not prove Supabase Auth, Postgres durability, mail delivery, reminder delivery, or RLS.

## Hosted Supabase gate — not yet verified

Before changing `NEXT_PUBLIC_CETELE_DATA_ADAPTER` to `supabase`:

1. Apply `supabase/migrations/202608090001_cetele_v1.sql` to a disposable hosted project.
2. Add `${CETELE_APP_ORIGIN}/auth/confirm` to Supabase Auth's redirect allow list. For an SSR token-hash invite template, point the link to `{{ .RedirectTo }}&token_hash={{ .TokenHash }}&type=invite`; the server-generated redirect already includes the invitation identifier.
3. Create disposable identities for subject, Direct Mentor, Mentor Above, peer, and outsider.
4. Exercise every table and RPC with allow and deny cases as each identity, including direct and senior-intervention assignment/exception audit events.
5. Verify invitation → password setup with an actual email, persisted completion reload, yesterday lock, second-mentor rejection, one student-level attention item with all contributing assignments, attention invalidation/reopening, and private Follow-up-note denial for the student.
6. Verify Shared Habit discovery within one tree and denial outside that tree.
7. Remove disposable data and record the hosted project reference and command output here without secrets.

Until that gate passes, production persistence and RLS status is **unverified**, not failed.
