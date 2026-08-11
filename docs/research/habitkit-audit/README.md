# HabitKit Android audit

Captured on 2026-08-09 from HabitKit 1.15.2 in the Android emulator `Cetele_HabitKit_Audit` at 1080 x 2400 px.

This is a black-box product and interaction audit. It is not a source-code audit and it does not authorize copying HabitKit's name, code, icons, illustrations, or branded visual expression. The purpose is to identify reusable interaction patterns and decide how they should be adapted to Çetele's Turkish, mentorship-oriented product model.

## Safety and test state

- Two clearly named audit habits were created: `Audit Binary` and `Audit Quantitative`.
- The quantitative habit uses Custom Value with a target of 10 per day and was left partially complete at 5/10.
- The binary habit has yesterday completed and today incomplete.
- A temporary habit reminder was created to inspect the editor, then removed.
- Android notification and exact-alarm permissions were granted only long enough to inspect reminders, then revoked.
- Account, billing, subscription management, privacy links, external sharing, archive/delete, import, and export actions were not executed.
- UI hierarchy dumps are stored beside this report when they were useful for interaction and accessibility evidence.

## Screenshot index

| File | State captured |
|---|---|
| [00-home.png](screenshots/00-home.png) | Empty dashboard and primary empty-state action |
| [01-create-habit.png](screenshots/01-create-habit.png) | Basic creation: icon, name, description, color |
| [02-create-advanced.png](screenshots/02-create-advanced.png) | Advanced creation options |
| [03-home-binary.png](screenshots/03-home-binary.png) | First binary habit card |
| [04-detail-overlay.png](screenshots/04-detail-overlay.png) | Habit detail overlay with heatmap, stats, and calendar |
| [05-binary-completed-large-action.png](screenshots/05-binary-completed-large-action.png) | Binary completion through the large today control |
| [05-detail-dismissed.png](screenshots/05-detail-dismissed.png) | Dashboard after dismissing detail |
| [06-card-grid-tap-opens-detail.png](screenshots/06-card-grid-tap-opens-detail.png) | Mini-grid tap opens detail rather than editing directly |
| [07-detail-calendar-cell-unfilled.png](screenshots/07-detail-calendar-cell-unfilled.png) | Today toggled through the detailed calendar cell |
| [08-habit-long-press-menu.png](screenshots/08-habit-long-press-menu.png) | Long-press context menu |
| [09-complete-yesterday-result.png](screenshots/09-complete-yesterday-result.png) | Complete Yesterday result |
| [10-appearance-panel.png](screenshots/10-appearance-panel.png) | Dashboard appearance switches |
| [11-home-two-habits.png](screenshots/11-home-two-habits.png) | Dashboard with two audit habits |
| [12-edit-habit.png](screenshots/12-edit-habit.png) | Intentional full-screen habit editing |
| [13-edit-tracking-options.png](screenshots/13-edit-tracking-options.png) | Step By Step tracking options |
| [14-custom-value-options.png](screenshots/14-custom-value-options.png) | Custom Value tracking options |
| [15-home-custom-value-habit.png](screenshots/15-home-custom-value-habit.png) | Quantitative habit on dashboard |
| [16-custom-value-entry-panel.png](screenshots/16-custom-value-entry-panel.png) | Focused quantitative completion panel |
| [17-custom-value-partial-progress.png](screenshots/17-custom-value-partial-progress.png) | Partial quantitative progress |
| [18-custom-value-filled-day.png](screenshots/18-custom-value-filled-day.png) | Filled quantitative day |
| [19-reorder-habits.png](screenshots/19-reorder-habits.png) | Reorder bottom sheet |
| [20-settings-top.png](screenshots/20-settings-top.png) | Settings information architecture |
| [21-settings-general.png](screenshots/21-settings-general.png) | General and dashboard customization settings |
| [22-daily-checkin-reminders.png](screenshots/22-daily-checkin-reminders.png) | Global daily check-in reminder sheet |
| [23-theme-picker.png](screenshots/23-theme-picker.png) | App and widget theme selection |
| [24-data-import-export.png](screenshots/24-data-import-export.png) | Data import/export surface, not executed |
| [25-analytics-dashboard.png](screenshots/25-analytics-dashboard.png) | Year heatmap, completion rate, monthly chart, streaks |
| [26-dashboard-checklist-mode.png](screenshots/26-dashboard-checklist-mode.png) | Five-day checklist dashboard mode |
| [27-dashboard-list-mode.png](screenshots/27-dashboard-list-mode.png) | Compact tile dashboard mode |
| [28-categories-panel.png](screenshots/28-categories-panel.png) | Multi-select and custom categories |
| [29-habit-reminder-panel.png](screenshots/29-habit-reminder-panel.png) | Per-habit reminder empty state |
| [30-add-habit-reminder.png](screenshots/30-add-habit-reminder.png) | Reminder weekdays, time, and three-reminder limit |
| [31-final-audit-state.png](screenshots/31-final-audit-state.png) | Final safe audit state after reminder cleanup |
| [32-onboarding-feature-overview.png](screenshots/32-onboarding-feature-overview.png) | Settings replay of HabitKit's single-page onboarding overview |
| [33-onboarding-return-to-settings.png](screenshots/33-onboarding-return-to-settings.png) | Continue returns to Settings without starting a setup wizard |

## Core observed interaction model

1. The dashboard habit card contains the habit identity, a large today action, and a compact history heatmap.
2. Pressing the card or its compact heatmap opens a detail overlay. The compact heatmap does not directly toggle a day.
3. The detailed calendar exposes individually clickable and long-pressable date cells. Today can be toggled there.
4. A long press on a habit opens Complete Yesterday, Edit, Appearance, Reorder Habits, Share Habit, and Archive.
5. Quantitative completion opens a bottom panel with a progress bar, current/target value, increment size presets, plus/minus, Reset, and Fill Day.
6. Habit editing centralizes icon, name, description, color, streak goal, reminders, categories, tracking mode, and target.
7. Analytics combines a year heatmap, total completions, completion rate, monthly chart, and streak metrics.
8. The dashboard has heatmap-card, recent-days checklist, and compact tile modes.
9. Settings > Show Onboarding opens one scrollable feature-overview page. Continue returns directly to Settings; replaying it does not create a habit, request permissions, or expose a personalized setup sequence.

## Onboarding replay audit

- The page introduces ten promises in one pass: create habits, check off completions, view the tile grid, use streaks, receive notifications, customize the dashboard, edit history, share progress, use home-screen widgets, and keep data on-device.
- The flow is informational rather than task-led: there is no progressive setup, sample habit, goal selection, reminder configuration, dashboard choice, or first-completion exercise.
- A single dominant Continue action dismisses the page and returns to Settings. Existing audit habits and their completion state were preserved.
- UIAutomator exposes the entire outer onboarding surface as one clickable node named `Continue`, while the visible button occupies only the bottom area. The feature headings and descriptions are individually exposed as static accessibility nodes.
- This test covers the replay entry in Settings on an already-subscribed account. A clean-install first launch remains unverified because clearing app data could remove the user's signed-in/subscription state.

## Observed accessibility and Android-fit issues

These findings are limited to screenshots and Android UIAutomator output; performance, internal theming architecture, and source-level accessibility cannot be verified.

- Several primary icon buttons expose no accessible name: dashboard Settings, Analytics, Add, detail Close/Edit/Settings, and some navigation arrows.
- Color swatches and the icon picker expose no names. Their reported 95 px bounds are about 36 dp at the emulator's 420 dpi density, below Android's 48 dp minimum touch target.
- Dashboard heatmap cells expose neither dates nor completion state. Detailed calendar cells are better: they expose full dates and are clickable/long-clickable.
- Switches expose checked state but not their own names; their labels are separate nodes, which may create ambiguous TalkBack output.
- Long press is useful but undiscoverable without a visible secondary-action fallback.
- Several surfaces use custom/iOS-shaped navigation and dialogs rather than a consistently Android-native Material 3 structure.
- Only portrait phone layout was tested. Landscape, tablet, foldable, large text, TalkBack focus order, and reduced motion remain unverified.

## Çetele direction

See [FEATURE_MATRIX.md](FEATURE_MATRIX.md) for the adopt/adapt/defer decisions. The key design difference is intentional: Çetele should let eligible grid cells edit completion directly instead of copying HabitKit's compact-grid-to-detail behavior.
