# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

Delegated baseline: strict TypeScript with React and Next.js App Router; PostgreSQL and Supabase for persistence and authentication where appropriate; Tailwind CSS; Vitest and React Testing Library for fast behavioral tests; Playwright for critical end-to-end flows. Deviate only when discovery identifies a concrete Çetele-specific advantage, and record any materially different infrastructure decision.

## Users

The primary user is a Turkish-speaking person recording mentor-assigned daily habits, usually on a phone and often in a brief daily moment. They need to understand what remains and record honest progress in seconds while feeling that the record belongs to them.

The same account may also mentor any number of direct students. In that role, the user needs to scan the direct group, notice who needs attention, record that review happened, and separately record attributable follow-up. Indirect mentors receive no personal or accountability visibility by virtue of ancestry.

## Product Purpose

Çetele is a daily habit accountability system for spiritual mentorship relationships. It makes personal consistency visible over time through one history grid per habit, while giving a Direct Mentor the minimum visibility needed to notice, review, and follow up responsibly.

Success means a student records daily consistency in seconds and a Direct Mentor understands which Direct Students need attention without opening every profile.

## Positioning

Çetele combines a personal-first daily habit record with accountability inside one Direct Mentor relationship: the student experiences self-accounting while narrowly bounded visibility supports a trusted mentor without spreading personal records through the hierarchy.

## Operating Context

- Daily completion is primarily mobile; historical review and mentorship views must remain first-class on desktop.
- All end-user UI and assistive labels use natural Turkish.
- A user may be a student and mentor at the same time; groups and branches derive from the mentorship tree rather than separate memberships.
- Account creation is invite-only. An admin may distribute a revocable, expiring, limited-use Access Code for independent account creation; a mentor may distribute a revocable, expiring, single-use Mentorship Invitation that establishes one Direct Mentor relationship.
- Çetele does not request legal names. The invitee chooses a non-unique Alias, private verified email, and password; the email remains inside Supabase Auth and mentors or admins never create or share user passwords.
- Account setup separates Terms Acceptance, the Privacy Notice, Core Tracking Consent, and Direct Mentor Visibility Consent. Optional or future processing is never bundled into the core choices.
- Direct mentors review their students daily and follow up outside the application when attention is needed.
- One vetted spiritual quotation may quietly frame the daily view. Content and attribution are supplied and verified separately.

## Capabilities and Constraints

- V1 habits are daily and assigned by mentors; students do not create tracked habits.
- Habits are binary by default and may optionally record a quantitative amount.
- Students may edit today and yesterday only. Older dates are locked.
- The single personal home combines Week and 6 Months history per Habit Assignment; the legacy İlerlemem destination redirects into Today's six-month mode.
- General appearance settings independently control the month labels above and weekday labels beside six-month calendars.
- Each active Habit Assignment owns an independent student reminder toggle and time; the mentor's Daily Review reminder remains separate.
- Two consecutive missed days for the same habit create a student-level Needs Attention item on the third day. A valid retrospective correction may invalidate it; later improvement alone does not.
- Daily Review and Follow-up are distinct mentor responsibilities with separate histories.
- Personal and accountability visibility is direct-only: users see their own records and Direct Mentors see only their Direct Students within the disclosed scope. Indirect mentors and peers receive no access.
- Student Completion Notes are visible only to the student and their Direct Mentor under the disclosed consent scope. Mentor Follow-up notes are visible only to their writer, not the student or an indirect mentor.
- Direct Mentors own accountability. There is no higher-mentor assignment, Follow-up, intervention, branch aggregate, or ancestor visibility.
- Students control personal icon, accent color, and order; mentors control habit meaning, guide, completion definition, target, and assignment.
- Shared habits are attributed, same-tree templates. Adoption creates an independent usable version; later source edits do not silently alter assignments.
- Authorization must be enforced in server and data layers, including database policies where supported, not by hidden UI.
- Conservative V1 policy: ship Week and 6 Months only; do not show peer aggregates; do not support direct-mentor transfer; lock Completion Notes with the day; keep Needs Attention within the user/Direct Mentor relationship; and allow a mistaken assignment to be voided only before any Completion exists and otherwise end it with history preserved.

## Brand Commitments

The product name is Çetele. Its voice is concise, human, calm, mature, reflective, modest, quietly disciplined, culturally Turkish, and openly spiritual without becoming decorative or preachy. The everyday student experience must feel like “my Çetele,” not a report prepared for surveillance.

Avoid nationalist or state imagery, flag-derived decoration, mosque silhouettes, generic religious ornament, enterprise-dashboard language, generic AI SaaS styling, and game-like reward mechanics. HabitKit's visual identity is the direct benchmark for the first daily-view surface: near-black canvas, charcoal habit rows, bright per-habit accents, compact icon/name rows, and dense plain contribution tiles.

The daily view should closely reproduce HabitKit's dashboard composition and visual density rather than merely taking loose inspiration from it. In compact Week mode, each Habit Assignment is one low row containing its icon, truncated name, and seven aligned cells beneath one shared date header; descriptions, streak summaries, information buttons, and a separate Today control are omitted from the row. Today's cell remains the completion surface. Six Months retains the fuller Habit Card, description, information action, Today control, and streak summary. Do not add interior dots to grid cells, oversized circular completion controls, assignment-status copy, legends, daily summaries, or journal-like styling. Çetele retains its own name, original icons and code, mentor-assigned habits, Turkish language, attribution, privacy, accessible names, and non-punitive semantics.

The compact daily mode shows the rolling seven days ending today for every Habit Assignment. It uses a shared date guide and dense fixed-size history cells rather than stretching seven cells across the card. Both dark and light palettes are first-class and preserve the same HabitKit-close hierarchy. V1 uses the restrained Lucide line-icon family for navigation, habit categories, theme controls, and status actions; accessible names carry meaning and icons never replace text where ambiguity would result.

## Evidence on Hand

- Product behavior source: `docs/product/Cetele_V1_Product_Definition_v0.1.md`.
- Visual and UX source: `docs/product/cetele_visual_identity_ux_direction_v1.md`.
- No approved quotation, translation, spiritual citation, logo, testimonial, benchmark, customer claim, or production claim has been supplied. Future work must not fabricate them.

## Product Principles

1. Personal self-accounting stays in the foreground; mentorship remains a quiet, trustworthy safety net.
2. Historical truth matters more than scores, streak pressure, or gamification.
3. Direct responsibility and visibility stay inside the Direct Mentor relationship.
4. Daily completion is fast and calm; deeper history and mentorship detail remain available without crowding it.
5. Turkish language, cultural fit, privacy, accessibility, and emotional safety are product behavior, not cosmetic polish.

## Accessibility & Inclusion

State meaning must never depend on color alone. Completed, missed, excused, retrospective, attention-needed, reviewed, and followed-up states must remain distinguishable at a glance and to assistive technology. Text must remain comfortably readable, mobile targets must be generous, keyboard and focus behavior must be complete, motion must respect reduced-motion preferences, and missed habits must not be presented as visual punishment. No specific WCAG conformance level has yet been mandated.

## Future Direction

A future Encouragement Connection may let two peers deliberately support one another. It will require a new product, privacy, safety, retention, and authorization review; mutual opt-in and separate consent from both people; immediate disconnect/block controls; and no automatic or retroactive sharing of existing history. It is not part of the current account or mentorship implementation.
