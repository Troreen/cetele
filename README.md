# Çetele

Çetele is a Turkish, personal-first daily habit record for spiritual mentorship networks. Students see a calm record of their own mentor-assigned habits; mentors receive carefully bounded, upward-only visibility for review and follow-up.

## Current status

The repository is in the bounded foundation/core-tracking tranche. Product and visual source briefs, durable product context, domain language, workflow configuration, and the initial architecture investigation are being established before the first production tracer bullet.

The first tracer bullet will let an invited user set a password, sign in, view one assigned daily habit, toggle today's completion with persisted state, reload, and inspect that habit's Week history.

## Source documents

- [Product definition](docs/product/Cetele_V1_Product_Definition_v0.1.md)
- [Visual identity and UX direction](docs/product/cetele_visual_identity_ux_direction_v1.md)
- [Durable product context](PRODUCT.md)
- [Domain glossary](CONTEXT.md)
- [Agent workflow](AGENTS.md)

## Development

Application commands will be added with the Next.js scaffold. The intended baseline is Node.js 22+, npm, a hosted Supabase project for Auth/Postgres/RLS, Vitest, and Playwright.

No local Supabase stack is currently assumed because the development machine does not have Docker. Never add Supabase secret keys to the repository; use the future `.env.example` as the canonical variable list.

## Product safeguards

- All end-user copy is Turkish.
- Each Habit Assignment owns its own history grid.
- Authorization is enforced in server operations and PostgreSQL RLS, never only in UI.
- Completion notes and mentor follow-up notes have different visibility.
- No quotation or spiritual attribution ships without a supplied, verified source.
