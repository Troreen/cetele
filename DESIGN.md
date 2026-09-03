---
name: "Mülahaza"
description: "A calm, grid-first habit record with equally intentional dark and light themes."
colors:
  canvas-dark: "#050505"
  surface-dark: "#1b1b1d"
  surface-raised-dark: "#242426"
  tile-empty-dark: "#302f32"
  text-dark: "#f7f7f7"
  text-muted-dark: "#a6a6aa"
  border-dark: "#2d2d30"
  focus-dark: "#ffffff"
  canvas-light: "#f6f5f7"
  surface-light: "#ffffff"
  surface-raised-light: "#f0eef2"
  tile-empty-light: "#e5e2e7"
  text-light: "#1c1b1e"
  text-muted-light: "#6f6b73"
  border-light: "#d8d4da"
  focus-light: "#171619"
  habit-pink: "#f164ef"
  habit-blue: "#55a7ff"
  habit-green: "#3ed68b"
  habit-orange: "#ff913f"
  attention: "#f2a65a"
  calm: "#79cf8c"
  avatar-blue: "#265cac"
  avatar-plum: "#704175"
typography:
  title:
    fontFamily: "ui-sans-serif, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif"
    fontSize: "1.2rem"
    fontWeight: 780
    lineHeight: 1
    letterSpacing: "-0.02em"
  habit-name:
    fontFamily: "ui-sans-serif, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif"
    fontSize: "0.94rem"
    fontWeight: 650
    lineHeight: 1.25
  body:
    fontFamily: "ui-sans-serif, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif"
    fontSize: "0.72rem"
    fontWeight: 400
    lineHeight: 1.25
  label:
    fontFamily: "ui-sans-serif, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif"
    fontSize: "0.6rem"
    fontWeight: 650
    lineHeight: 1.2
  ui-xs:
    fontFamily: "ui-sans-serif, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif"
    fontSize: "11px"
    fontWeight: 400
    lineHeight: 1.35
  ui-compact:
    fontFamily: "ui-sans-serif, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif"
    fontSize: "13px"
    fontWeight: 600
    lineHeight: 1.3
  ui-body:
    fontFamily: "ui-sans-serif, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: 1.4
  ui-subheading:
    fontFamily: "ui-sans-serif, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif"
    fontSize: "16px"
    fontWeight: 650
    lineHeight: 1.25
  ui-dialog:
    fontFamily: "ui-sans-serif, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif"
    fontSize: "18px"
    fontWeight: 700
    lineHeight: 1.2
  ui-strong:
    fontFamily: "ui-sans-serif, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif"
    fontSize: "17px"
    fontWeight: 700
    lineHeight: 1.2
  ui-mobile-brand:
    fontFamily: "ui-sans-serif, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif"
    fontSize: "20px"
    fontWeight: 780
    lineHeight: 1
  ui-brand:
    fontFamily: "ui-sans-serif, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif"
    fontSize: "24px"
    fontWeight: 780
    lineHeight: 1
  ui-page-title:
    fontFamily: "ui-sans-serif, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif"
    fontSize: "27px"
    fontWeight: 750
    lineHeight: 1.1
  ui-auth-title:
    fontFamily: "ui-sans-serif, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif"
    fontSize: "28px"
    fontWeight: 750
    lineHeight: 1.1
rounded:
  tile: "2px"
  week-state: "4px"
  control: "9px"
  card: "12px"
  pill: "999px"
  micro: "3px"
  segmented: "6px"
  nav: "7px"
  field: "8px"
  panel: "10px"
  auth: "14px"
spacing:
  tile-gap: "3px"
  compact-gap: "5px"
  control-gap: "9px"
  card-inset: "9px"
  card-gap: "12px"
  shell-inline: "12px"
  shell-top: "14px"
components:
  completion-action:
    backgroundColor: "{colors.surface-raised-dark}"
    textColor: "{colors.text-dark}"
    rounded: "{rounded.control}"
    size: "48px"
  completion-action-complete:
    backgroundColor: "{colors.habit-pink}"
    textColor: "{colors.canvas-dark}"
    rounded: "{rounded.control}"
    size: "48px"
  habit-card:
    backgroundColor: "{colors.surface-dark}"
    textColor: "{colors.text-dark}"
    rounded: "{rounded.card}"
    padding: "9px 9px 10px"
  compact-week-state:
    backgroundColor: "{colors.tile-empty-dark}"
    rounded: "{rounded.week-state}"
    width: "24px"
---

# Design System: Mülahaza

## Overview

**Creative North Star: "The Quiet Ledger"**

Mülahaza is a compact personal record whose visual rhythm comes from evidence, not decoration. Its HabitKit-close identity uses a nearly black or softly cool-white canvas, stacked tonal cards, bright per-habit color, restrained system typography, and dense square history marks. The surface should feel immediate on a phone: open, scan, record, leave.

Dark and light themes are equal expressions of one system. Both preserve the same hierarchy, density, geometry, and semantic roles; only the tonal values change. Habit colors remain the strongest signal in either theme, while empty states remain calm and missed states never become punitive.

**Key Characteristics:**

- Centered, phone-first app shell with a maximum width of 520px.
- Dense grid cards with one bright accent assigned to each Habit Assignment.
- Square completion actions and plain square history states, never circles or interior dots.
- A compact daily mode that exposes the seven consecutive days ending today for every Habit Assignment.
- Quiet tonal depth, visible keyboard focus, and motion that disappears under reduced-motion preferences.
- A restrained Lucide line-icon family, selected for V1 and always backed by accessible names or adjacent text.

## Colors

The palette uses close neutral layers for structure and reserves saturated color for habit identity and completed states.

### Primary

- **Near-Black Canvas:** The dark-theme page ground. It lets charcoal cards and habit colors carry the hierarchy.
- **Cool Porcelain Canvas:** The light-theme page ground. It keeps white cards legible without becoming clinical.

### Secondary

- **Habit Pink, Blue, Green, and Orange:** Bright assignment accents used for completed cells, completed actions, and tightly bounded habit identity. Additional habit colors must retain comparable luminance and clarity in both themes.

### Neutral

- **Charcoal / White Surface:** The card layer in dark and light themes respectively.
- **Graphite / Soft Lilac-Gray Tile:** The uncompleted history state. It is visible but deliberately quieter than completion.
- **High-Contrast Ink:** Primary text and focus treatment; use the theme-appropriate role token rather than a hard-coded foreground.
- **Muted Ink:** Descriptions and weekday labels; maintain readable contrast without competing with habit names.
- **Quiet Border:** Separators and structural outlines only when tonal layering is insufficient.
- **Avatar Blue / Plum:** A deliberately dark, theme-stable identity gradient that keeps white initials readable in both palettes.

**The Semantic Theme Rule.** Components consume `canvas`, `surface`, `surface-raised`, `tile-empty`, `ink`, `muted`, `border`, and `focus` roles. Dark and light values are paired implementations of those roles, never independent component palettes.

**The Accent Means Habit Rule.** Bright color identifies a Habit Assignment and its completed states. Do not spend habit colors on general navigation or decorative emphasis.

## Typography

**Display Font:** System UI sans-serif stack

**Body Font:** System UI sans-serif stack

**Character:** Compact, familiar, and highly legible. Weight and spacing create hierarchy without introducing a separate display personality or ornamental voice.

### Hierarchy

- **App Title:** Dense and assured, used once in the app bar.
- **Habit Name:** Compact semibold text, kept to one line with graceful truncation.
- **Body / Description:** Quiet supporting text, kept to one useful line in dense card contexts.
- **Weekday Label:** Small semibold text that anchors the seven-state strip without becoming a second headline.

**The One-Line Scan Rule.** Habit names and short descriptions preserve the vertical rhythm by truncating rather than wrapping inside dense daily cards.

## Layout

The primary frame is a centered app shell capped at 520px. It uses 12px horizontal insets, 14px top spacing, and enough bottom clearance for persistent controls when a surface requires them. Habit cards stack with a 12px gap; compact cards tighten that rhythm to 8px.

Habit headers use a three-column structure: a 42px icon reservation, flexible copy, and a 48px completion target. On narrow screens up to 430px, app-bar actions may reduce to 44px while habit completion remains 48px. Interactive targets are therefore never smaller than 44px.

The full history grid uses seven rows with dates flowing by column and plain square cells separated by 3px. The compact daily mode shows exactly seven 24px square states per Habit Assignment, ordered chronologically and ending today, right-aligned under one shared weekday/date guide with a 5px gap. The cells never stretch to fill the card. Today's state receives an inset outline; a completed state receives the habit color. The two indicators can coexist.

Theme and view choices are state, not separate pages. Switching either must preserve the other in the URL so refresh, history navigation, and shared prototype links remain deterministic. The durable rule is state preservation; the prototype's specific switcher composition is not canonical.

## Elevation & Depth

The system is flat by default. Depth comes from tonal separation between canvas, card, raised control, and empty tile. Shadows are reserved for genuinely floating controls and should be broad, dark, and quiet rather than glossy.

**The Tonal-First Rule.** Use adjacent surface tones before adding borders or shadows. A card at rest should not look lifted off the page.

## Shapes

Cards use gently rounded 12px corners. Habit identity and completion controls are compact rounded squares at 9px, while history tiles stay visibly squarer at 2–4px. This contrast makes actions tactile without softening the data grid into bubbles.

**The Square Evidence Rule.** Completion history is always represented by plain square states. Never place circles, dots, checkmarks, labels, or other marks inside grid cells.

**The Target Rule.** Functional controls are 48px by default and may reduce only to 44px in constrained navigation layouts. Visual artwork inside the target may be smaller, but the hit area must not be.

## Components

### Mentor workspace extension

Mentor surfaces widen “The Quiet Ledger” around people and responsibility without creating a separate admin identity. Desktop workspaces may expand to 1180px with a 224px navigation rail; mobile removes the rail and uses four primary bottom destinations. The universal anchor remains **Bugün**.

- **People ledger:** Dense 64–76px rows lead with the person, then recent per-assignment evidence, today’s ratio, and one explicit status. A combined habit grid is never used.
- **Responsibility rail:** Daily Review history, open Follow-up, and invitation counts use neutral square evidence, labels, and timestamps. They do not spend habit colors.
- **Attention role:** Muted ochre communicates unresolved responsibility only when paired with an icon and text. It is not a punitive failure color.
- **Calm role:** Restrained green reinforces reviewed, followed-up, or no-current-issue labels. Text continues to carry the meaning.
- **Private notes:** Follow-up notes use an inset neutral surface and privacy icon. They remain visually distinct from student Completion Notes.
- **Operational geometry:** Dense navigation may use 7px, fields and segmented controls 8px, and mentor panels 10px. Habit cards retain their canonical 12px radius and evidence cells remain 2–4px.
- **Operational type:** Mentor rows and controls add 11px, 13px, 14px, 16px, and 18px UI steps; 24–28px is reserved for the brand and page/auth titles. The daily habit typography remains unchanged.

**The Relationship-First Rule.** Mentor overviews organize around people and responsible Direct Mentors, not KPI cards or chart walls.

**The Direct Boundary Rule.** Mentor surfaces contain only Direct Students. They never list, summarize, link to, or offer actions for a Direct Student's own mentees. A guessed nested-student URL uses the same calm not-found treatment as an unknown record.

### Private account and consent surfaces

- **Claim cards:** Access Codes and Mentorship Invitations use the existing focused auth card. Bearer claims stay in URL fragments, are removed immediately after submission, and never appear in query strings or reusable UI history.
- **Account setup:** Alias, password, Terms Acceptance, Core Tracking Consent, and—only for a mentored account—Direct Mentor Visibility Consent are separate sections. Every checkbox starts unchecked and the completion action remains disabled until the required choices are affirmative.
- **Legal state:** Until approved controller details and Turkish legal wording are supplied, every legal page and setup layer carries an unmistakable `NON-PRODUCTION FIXTURE` warning. Fixture copy must never be visually mistaken for approved terms.
- **Rights and withdrawal:** Settings groups legal documents, export, consent withdrawal, and deletion paths in one quiet section. Destructive choices require explicit confirmation; Direct Mentor withdrawal explains that mentor access stops immediately.
- **Responsive floor:** Account and legal cards remain single-column and keyboard complete at 320px. Error summaries receive focus; password visibility controls have accessible names; content never relies on color alone.

### Habit Grid Card

- **Shape:** A 12px tonal card with a compact header and the history grid immediately below it.
- **Header:** A reserved icon area, one-line habit name, one-line useful description, and adjacent 48px completion action.
- **History:** Plain square empty and completed states. No legends, assignment-status copy, daily summaries, or journal framing inside the card.
- **Home history:** `Bugün` owns a compact rolling-week list and a labeled six-month Habit Card mode. Two icon-only controls sit in a centered bottom pill, following the retained HabitKit dashboard composition without copying its third mode.
- **Progress insights:** Current and best streak values sit inside the full six-month Habit Card as one quiet, accessible route to its detailed Habit History. The compact Week row omits them to preserve the approved list density. Do not add a detached history button below the card.
- **Accent:** One habit color governs the assignment's identity and completed states.

### Completion Action

- **Shape:** A 48px rounded square with a 9px radius.
- **Incomplete:** Uses the assignment's subdued theme-aware tint.
- **Complete:** Fills with the assignment's bright habit color and exposes pressed state programmatically.
- **Interaction:** A restrained scale response may run for 160ms with a smooth ease. Focus uses a 3px high-contrast outline with 3px offset. Reduced-motion mode removes the transition.

### History Grid

- **Structure:** Seven Monday-first weekday rows, calendar-week columns, dense gaps, and square cells. In the six-month home mode, month labels align above their first visible week and `Sal`, `Per`, and `Cmt` align with rows two, four, and six as in the retained HabitKit detail reference.
- **Empty:** Uses the theme's `tile-empty` role.
- **Complete:** Uses the Habit Assignment's accent.
- **Today:** Uses an inset high-contrast outline without replacing the completion fill.
- **Accessibility:** The visual grid has an accessible summary and each date/state remains available to assistive technology.
- **Preferences:** General Settings exposes independent `Ay etiketleri` and `Gün etiketleri` switches. Both default on and hide only their corresponding labels, never the history itself.

### Compact Weekly Row

- **Purpose:** The daily view's compact form makes every habit and the rolling seven-day record scannable as one aligned list.
- **Structure:** One shared `Son 7 gün` weekday/date header sits above low rows. Each row contains a 44px icon, one truncated habit name, and seven fixed daily columns ordered oldest to newest and ending today. It omits the description, information action, large Today control, and streak summary.
- **Interaction:** Today and yesterday retain direct grid editing. Long press and Shift+F10 retain the deliberate settings path without adding a visible ellipsis.
- **States:** Empty uses `tile-empty`; complete uses the habit accent; today adds an inset outline. Each state remains square.

### Icon Action Frame

- **Status:** The 44px or 48px target, focus behavior, spacing, and restrained Lucide line treatment are canonical for V1.
- **Artwork boundary:** Use familiar literal symbols, a consistent stroke weight, and accessible names. Icons support labels and state; they do not become decorative identity artwork.

## Do's and Don'ts

### Do:

- **Do** keep dark and light themes structurally identical and map components through semantic role tokens.
- **Do** show the rolling seven days ending today as seven square states for every Habit Assignment in compact daily mode.
- **Do** allow today's outline and the completed fill to appear together.
- **Do** preserve both theme and view state in the URL when either changes.
- **Do** maintain 48px completion targets, 44px minimum navigation targets, visible focus, and reduced-motion behavior.
- **Do** keep the selected Lucide symbols restrained, literal, and paired with accessible names or adjacent labels.

### Don't:

- **Don't** use circles, interior dots, checkmarks, labels, or decorative marks inside history cells.
- **Don't** add assignment-status copy, legends, summaries, or journal styling to the dense daily cards.
- **Don't** treat bright habit colors as general-purpose UI accents.
- **Don't** document sample habit names, sample completion data, or the prototype's switcher details as durable product patterns.
- **Don't** mix filled, ornamental, or unrelated icon families into the V1 line-icon system.
