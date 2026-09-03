# Mülahaza

Mülahaza is a Turkish, personal-first daily habit record for spiritual mentorship networks. Students see a calm record of their own mentor-assigned habits; mentors receive carefully bounded, upward-only visibility for review and follow-up.

## Current status

The complete V1 application surface and domain foundation are implemented. The Next.js application includes manual secure invitation links, student-chosen credentials and sign-in, personal daily tracking, binary and quantitative habits, yesterday correction, per-assignment Week/6 Months history, guides, student personalization roles, mentor group review, Needs Attention, Follow-up with private notes, excuses, branch supervision, private/shared habit definitions, adoption, assignment, reminders, and light/dark themes.

The default `local` data adapter is a deterministic, browser-persisted verification environment. It supports the complete browser journey without claiming production authentication or database enforcement. The production Supabase interface, authenticated Server Actions, schema, indexes, RPCs, and RLS policies live in the application and `supabase/migrations/`. On 2026-08-10, the executable hosted matrix passed 134/134 against a disposable project and the complementary manual browser/database matrix passed; see [V1 verification](docs/verification/V1_VERIFICATION.md).

## Source documents

- [Product definition](docs/product/Cetele_V1_Product_Definition_v0.1.md)
- [Visual identity and UX direction](docs/product/cetele_visual_identity_ux_direction_v1.md)
- [Durable product context](PRODUCT.md)
- [Domain glossary](CONTEXT.md)
- [Agent workflow](AGENTS.md)

## Development

Requirements: Node.js 22+ and npm.

```powershell
npm.cmd install
npm.cmd run dev
npm.cmd run verify
npm.cmd run test:e2e
```

Copy `.env.example` to `.env.local` only when connecting a hosted Supabase project. Keep `NEXT_PUBLIC_CETELE_DATA_ADAPTER=local` until hosted verification passes.

No local Supabase stack is assumed because the development machine does not have Docker. Never add Supabase secret keys to the repository; `.env.example` is the canonical variable list.

## Product safeguards

- All end-user copy is Turkish.
- Each Habit Assignment owns its own history grid.
- Authorization is enforced in server operations and PostgreSQL RLS, never only in UI.
- Completion notes and mentor follow-up notes have different visibility.
- No quotation or spiritual attribution ships without a supplied, verified source.
