# Use Next.js with hosted Supabase for the V1 foundation

Çetele will use strict TypeScript with Next.js App Router and Supabase Auth/Postgres/RLS. This follows the requested boring web baseline, avoids building sensitive authentication and authorization infrastructure from scratch, and keeps hierarchical access enforceable in PostgreSQL; hosted Supabase is the first integration target because the development machine has no Docker or local PostgreSQL runtime, while local behavioral tests remain explicit about not proving hosted RLS.
