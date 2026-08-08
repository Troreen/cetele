# Foundation auth and persistence research

## Question

Can the approved invitation → set password → email/password sign-in flow be implemented cleanly with Next.js App Router and Supabase while preserving server- and database-enforced authorization?

## Findings

- Supabase's Admin Auth API can invite a user by email from a trusted server environment. The invitation confirms the email and can redirect to an account-setup page where the user sets a password.
- Invitation administration requires the server-only Supabase secret key, which bypasses RLS and must never reach browser code.
- Supabase recommends `@supabase/ssr` for cookie-backed Next.js sessions, while noting that the package remains beta and may have breaking changes.
- Next.js treats Server Actions as public endpoints. Each mutation must authenticate and authorize inside the action; a protected layout or hidden button is insufficient.
- Next.js recommends a centralized data-access layer and narrow transfer objects for secure checks and minimal disclosure.
- Supabase RLS remains the database-level backstop. Policy columns and every foreign-key traversal used by policies need indexes; stable auth functions should be wrapped in `select`, and complex hierarchy checks should use carefully scoped `security definer` functions with an empty search path.

## Decision impact

The first production slice will use a server-only invitation/admin client, cookie-backed user clients, authenticated Server Actions, a narrow daily-tracking module interface, and RLS on user-owned tables. Local tests can prove domain behavior and server authorization contracts; real RLS and persisted end-to-end verification require a connected hosted Supabase project because this machine has no Docker, PostgreSQL, or Supabase CLI.

## Primary sources

- [Supabase users and invitations](https://supabase.com/docs/guides/auth/users)
- [Supabase password-based authentication](https://supabase.com/docs/guides/auth/passwords)
- [Supabase server-side authentication](https://supabase.com/docs/guides/auth/server-side)
- [Supabase Row Level Security](https://supabase.com/docs/guides/database/postgres/row-level-security)
- [Next.js authentication and authorization](https://nextjs.org/docs/app/guides/authentication)
- [Next.js `use server` security](https://nextjs.org/docs/app/api-reference/directives/use-server)
