# HabitKit to Çetele feature matrix

This matrix is a proposal for product review, not implementation approval. Each material feature should still be confirmed before it is built.

| HabitKit pattern | Evidence | Çetele decision | Adaptation for Çetele |
|---|---|---|---|
| Large today completion control | `05`, `16`, compact-list references supplied 2026-08-11 | Adapt now | Keep the dominant Today action in the full six-month card. Omit it from compact Week rows, where today's cell toggles binary habits or opens the Turkish quantitative sheet. |
| Compact history grid on each habit | `03`, `31` | Adopt now | Preserve one grid per Habit Assignment, matching the V1 domain model. |
| Card/grid opens detail | `04`, `06` | Do not copy | Eligible today/yesterday cells should toggle or open value entry directly. Older/future cells remain inert. Habit information moves behind a small `i` control. |
| Detailed calendar cell editing | `07` | Adapt now | Apply Çetele's today/yesterday edit boundary and show clear locked states without a separate “previous day locked” button/message. |
| Quantitative bottom panel | `16`-`18` | Adopt now | Use a focused Turkish sheet with numeric keyboard/input, current value, target, Save/Reset, and optional quick amounts. Avoid requiring preset selection plus a second tap. |
| Long-press habit menu | `08` | Adopt now | Include Dünü tamamla, Düzenle, Görünüm/Renk, Hatırlatıcı, Kategoriler (yakında), and Alışkanlıkları sırala. Do not show a redundant three-dot control; long press and Shift+F10 provide touch and keyboard access. |
| Complete Yesterday shortcut | `08`, `09` | Adopt now | Keep because yesterday is an allowed Çetele mutation. Quantitative habits open yesterday's numeric sheet. |
| Intentional edit screen | `12`-`14` | Adopt now | Remove always-visible edit fields. Editing starts only from the context menu or explicit edit action. |
| Appearance customization | `10`, `21` | Adapt now | Habit color belongs in edit. General Settings independently controls month and weekday labels on Today's labeled six-month calendar. |
| Reorder habits | `19` | Adopt now | Long-press drag in a dedicated sheet, with Move up/down accessible actions and persistent order. |
| Per-habit reminders | `29`, `30` | Adopt now | The user approved independent reminder management per Habit Assignment. V1 stores one enabled/time pair per assignment; browser notification delivery remains a separate hosted/manual verification boundary. |
| Global daily check-in reminder | `22` | Do not adopt for students | Student reminders are assignment-specific. The mentor's Daily Review reminder remains a separate responsibility reminder. |
| Categories | `28` | Future feature | Preserve the menu entry as “yakında” only if it does not look actionable. Later support multi-select and custom categories. |
| Streak goals | `02`, `25` | Defer | Çetele's V1 attention model is miss-based and mentor-aware. Avoid introducing competing motivation logic without a product decision. |
| Analytics dashboard | `25` | Adapt later | Reuse completion rate, period summaries, and readable trend views; prioritize Daily Review and Needs Attention over decorative analytics. |
| Three dashboard modes | `26`, `27`, `31` | Adapt now | Ship the approved Week and 6 Months modes on one personal home. Switch them with two icon-only controls in a centered bottom pill; omit HabitKit's third scattered-grid mode. |
| Theme picker | `23` | Adapt later | Support system/light/dark eventually; do not copy the visual expression or make widget theming a V1 dependency. |
| Import/export | `24` | Defer | Hosted Çetele data and mentorship relationships require a product/security design before portable export/import. |
| Share habit | `08` | Omit for now | Not part of the V1 accountability contract and may expose private habit data. |
| Archive habit | `08` | Adapt later | Prefer an explicit deactivate/archive state with mentor-assignment implications defined first. |
| HabitKit Wrapped/year review | `25` | Omit for now | Not relevant to the current V1 goal; revisit only after a year of meaningful user data. |
| Single-page feature onboarding | `32`, `33` | Do not copy directly | Use a short Turkish, task-led activation flow for Çetele: explain the grid boundary, complete one assigned habit, and clarify mentor visibility. Avoid presenting ten product claims before the first meaningful action. |

## Recommended first implementation slice

1. Make eligible assignment grid cells the direct completion surface.
2. In compact Week rows, route today's cell to binary completion or the Turkish quantitative sheet; keep the large Today action only in the full card mode.
3. Replace directly exposed habit details with an `i` button and details sheet.
4. Replace directly exposed editing with a long-press/More menu and dedicated edit screen.
5. Add Complete Yesterday and accessible reorder actions.
6. Verify binary and quantitative flows with keyboard, touch, mobile viewport, and screen-reader names before moving to reminders or categories.

## Non-negotiable Çetele distinctions

- Turkish end-user UI.
- One history grid per Habit Assignment.
- Student edits are limited to today and yesterday.
- Two consecutive misses produce Needs Attention on day three.
- Visibility flows upward only.
- Daily Review and Follow-up remain separate mentor workflows.
- HabitKit is a reference for interaction patterns, not a product identity or source of proprietary assets.
