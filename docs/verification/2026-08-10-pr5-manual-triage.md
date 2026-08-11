# PR #5 manual-testing triage

This is the durable release triage for manual findings reported against PR #5 on 2026-08-10.

## Release boundary

- Tarik approved merging PR #5 on 2026-08-11 after the repaired behavior was made available for manual recheck. That approval closes the manual-recheck gate for MT-001 through MT-015.
- Migration `supabase/migrations/202608100001_pr5_review_hardening.sql` was applied only after that approval. The expanded hosted matrix then passed 156/156 checks.
- Automated checks supplement manual findings; they do not invalidate them. The release boundary was lifted by Tarik's explicit approval, not by automation alone.

## Findings

| ID | Finding | Classification | Reproduction evidence | Status before 2026-08-11 approval |
| --- | --- | --- | --- | --- |
| MT-001 | Quantitative habit amounts can be increased, reduced, or entered as fractional values; amounts must be positive integers. | V1 release blocker | The amount control used `min="0.1"`, `step="0.1"`, and `inputMode="decimal"`. Rendered QA also found a legacy locally saved `9.9` still displayed after new-entry validation was fixed. | Fixed and regression-tested; Tarik recheck pending |
| MT-002 | The top-bar notification button does nothing. | V1 release blocker | The `Bildirimler` button had no click handler, dialog, or destination. | Fixed and regression-tested; Tarik recheck pending |
| MT-003 | The Today home surface lacks selectable Week and 6 Months habit views. | V1 release blocker | `/today` always rendered the compact current-week cards even though Week/6 Months URL state and history rendering already existed elsewhere. | Fixed and regression-tested; Tarik recheck pending |
| MT-004 | Progress cards put Habit History and streaks in a separate text button below each card instead of keeping the indicators on the card. | Polish | `/progress` rendered one detached `Geçmiş ve seriler` link after every Habit Card. | Fixed and regression-tested; Tarik recheck pending |
| MT-005 | Student notifications are managed as one general reminder instead of independently per Habit Assignment. | V1 release blocker | The state and hosted persistence exposed one `studentEnabled`/`studentTime` pair, and every Habit Card reminder action routed to that shared setting. | Fixed and regression-tested; Tarik recheck pending |
| MT-006 | The top-right profile button does nothing. | V1 release blocker | The profile button had no click handler, expanded state, menu, or destination. | Fixed and regression-tested; Tarik recheck pending |
| MT-007 | Weekly Habit Cards stretch seven history cells across the card, making them substantially larger than HabitKit's dense weekly cells. | V1 release blocker | Compact cards inherited `.evidence-strip { grid-auto-columns: minmax(5px, 1fr) }`, producing approximately 43px cells at 390px. The retained HabitKit checklist capture uses compact fixed-size cells. | Fixed and regression-tested; Tarik recheck pending |
| MT-008 | Today has substantial horizontal overflow at a narrow mobile width. | V1 release blocker | Tarik's 321px capture shows the weekly date row and Habit Card content cut off at the right edge. At the reproduced narrow width, the four-column card header collapsed the habit title to about 39px because two utility controls and the Today action could not shrink. | Fixed and regression-tested; Tarik recheck pending |
| MT-009 | İlerlemem still repeats the old weekly view instead of showing HabitKit-style labeled six-month calendars with configurable labels. | V1 release blocker | `/progress` and `/progress/[assignmentId]` both exposed Week/6 Months tabs. Their six-month grids had no month markers or aligned weekday labels, while HabitKit captures `04` and `21` show the labeled calendar and independent month/day label settings. | Fixed and regression-tested; Tarik recheck pending |
| MT-010 | Bugün and İlerlemem duplicate personal habit history; the visible per-card ellipsis and text range tabs do not match the approved HabitKit-close interaction. | V1 release blocker | The app exposed separate Bugün and İlerlemem navigation destinations, a visible More button on every Habit Card, and text tabs above the home cards. Week also omitted the inline current/best streak counters. HabitKit captures `26`, `27`, and `31` place compact icon mode controls in a centered bottom pill. | Fixed and regression-tested; Tarik recheck pending |
| MT-011 | The Junior Mentor responsibility section is visually unstructured and repeats explanatory mentor text beside every student. | Polish | Tarik's narrow screenshot showed unstyled metrics and two cramped student columns where avatar, name, and `Sorumlu mentor: Yunus` ran together. The paragraph above repeated relationship context already established by the section and student detail. | Fixed and regression-tested; Tarik recheck pending |
| MT-012 | A nested student's Back control jumps to Tarik's top-level student list, Junior Mentor students do not use the approved evidence-rich row, and mentor-detail weekly cells are too large. | V1 release blocker | From Yunus, opening Okan rendered `/students/deniz`, but the hard-coded `Öğrencilerim` link targeted `/students` instead of Yunus. Junior Mentor students used a separate name-only presentation, and mentor detail Habit Cards did not opt into the dense 24px weekly-cell layout. | Fixed and regression-tested; Tarik recheck pending |
| MT-013 | Mentor-detail Habit Cards show a redundant large completion control, while the assignment correction/removal action falls back to an unstyled browser button. | Polish | Yunus's read-only Habit Cards rendered a 48px dash/check control even though Tarik cannot complete Yunus's habits. `assignment-correction` had no CSS or shared button class, so it appeared as a detached browser-default control below each card. | Fixed and regression-tested; Tarik recheck pending |
| MT-014 | Today's compact Week mode still looks like stacked full Habit Cards instead of HabitKit's aligned compact list. | V1 release blocker | Tarik's two compact-list references show one shared seven-day header and low rows containing only icon, truncated name, and seven aligned cells. Çetele still rendered descriptions, information and Today controls, and streak summaries inside tall cards. | Fixed and regression-tested; Tarik recheck pending |
| MT-015 | The `Bugün` page heading and explanatory description consume space above an already self-explanatory compact tracker. | Polish | After adopting the HabitKit-style compact list, the home surface still rendered `Bugün` plus `Bugünün kaydı ve altı aylık ilerlemen bir arada.` between the persistent app header and reminder/tracker content. | Fixed and regression-tested; Tarik recheck pending |

## Local demo identity tree

The local adapter uses Tarik as the signed-in identity. Tarik is both a student under an example `Üst Mentor` and Mentor Above for the requested test branch:

- Tarik → Yunus → Ilyas, Okan, Akif, Mustafa, Eyup, Aslan
- Tarik → Yusuf → Yusuf Ahmet, Yusuf Ismail, Selim, Berat
- Tarik → Bera → Emin, Murat, Batuhan

This is local fixture data for manual role testing only. It is not hosted identity, authentication, or RLS evidence.

## Accepted behavior

- Quantitative amounts are positive integers throughout the completion flow.
- The notification affordance opens a useful in-app notification/reminder surface rather than acting as a dead control.
- Week mode shows the rolling seven days ending today per habit, and today is directly editable from its cell.
- 6 Months mode shows each habit's longer history grid and retains the large Today completion action at the top of the card.
- The selected home mode is URL-backed and preserved together with the selected theme.
- Full six-month cards show current and best streak indicators inside the card; the combined indicator remains the route into that Habit Assignment's detailed history. Compact Week rows omit the summary to preserve the approved density.
- Every active Habit Assignment has its own reminder toggle and time, available from its card and Settings; the bell summarizes enabled habit reminders.
- The profile control opens account details, Settings, and sign-out actions.
- Week mode uses one `Son 7 gün` date guide and low habit rows containing only icon, truncated name, and seven cells aligned beneath it. Cells are 24px at 390px and reduce to 19px at 320px instead of stretching.
- At narrow phone widths, compact Week rows, the shared date guide, and the mentor responsibility card remain inside the viewport; long names truncate intentionally without displacing the tracker.
- Bugün is the single personal habit destination. A centered bottom pill switches between Week and a Monday-aligned six-month calendar using two icon-only controls; the legacy `/progress` route redirects to six-month Bugün.
- Habit Cards have no visible ellipsis. Long press opens their settings panel on touch, while Shift+F10 provides the keyboard equivalent.
- In six-month mode, month markers sit above the matching week columns, `Sal`/`Per`/`Cmt` align with the matching rows, and General Settings can hide month and day labels independently.
- Junior Mentor responsibility shows only its heading, three aligned facts, and the same evidence-rich student rows used by the top-level student list. Each row shows avatar, name, habit count, compact recent-habit evidence, today's ratio, status, and a detail chevron without repeating mentor explanations.
- A nested student's Back control returns exactly one hierarchy level to the responsible Junior Mentor and names that destination, while a direct student's Back control still returns to `Öğrencilerim`.
- Weekly Habit Cards on mentor/student detail use the same dense 24px cells as the approved weekly home view.
- Mentor/student detail Habit Cards are tracker-only: they omit the large completion control while retaining the history grid and information action. Assignment correction/removal uses the app's compact secondary-action styling beneath the related card.
- Today omits a separate page title and explanatory description; the persistent app header, reminder status, shared date guide, and selected tracker mode provide the necessary context.

## Manual recheck

Tarik approved merging PR #5 on 2026-08-11, superseding the pending statuses in the historical table above. The following remains the durable checklist behind that approval:

1. Open the quantitative amount sheet. Confirm Arrow Up/Down changes by whole numbers, fractional input cannot be saved, and an older fractional local value is normalized to a positive integer after reload.
2. Open `Bildirimler` from the top bar on phone and desktop widths. Confirm the sheet reports the configured reminders and `Bildirim ayarlarını aç` reaches Settings.
3. On Today, confirm Week shows the last seven days ending today and today's cell edits completion. Switch to 6 Months and confirm both 182-day grids render while each card retains its large Today action.
4. In six-month mode, confirm each full card contains the current-streak and best-streak icons and values, the detached `Geçmiş ve seriler` button is gone, and tapping the inline summary opens that habit's detailed history. Confirm compact Week rows intentionally omit the streak summary.
5. Open two different Habit Card menus and set different reminder times. Confirm each card retains only its own setting, Settings lists them separately, and the bell summarizes both by habit name.
6. Open the top-right profile control on phone and desktop widths. Confirm account details, Settings, and sign-out are reachable.
7. On Today Week mode at phone width, confirm the seven weekday/date labels align with dense square cells, today's cell remains directly editable, and the cells do not stretch across the card.
8. At approximately 320px wide on Today Week mode, confirm there is no horizontal scrolling or right-edge clipping, each row keeps a usable intentionally truncated name, and all seven cells remain reachable.
9. Open Today's six-month mode and one habit detail. Confirm the grid has aligned month markers above and weekday markers on the left, then turn `Ay etiketleri` and `Gün etiketleri` off separately in Settings and confirm only the corresponding labels disappear.
10. Confirm İlerlemem is absent from desktop and mobile navigation, the two home modes use icon-only controls in a centered bottom pill, no Habit Card shows an ellipsis, and long press plus Shift+F10 still open the habit settings panel.
11. Open Yunus from Öğrencilerim on desktop and phone widths. Confirm Mentor sorumluluğu contains no explanatory paragraph and all six students use the approved compact row with avatar, name, habit count, two recent grids, today's ratio, status, and chevron.
12. From Yunus, open Okan and confirm the Back control says `Yunus grubuna dön` and returns to Yunus rather than Tarik's top-level student list. Confirm Yunus's own Back control still says `Öğrencilerim`, and his weekly Habit Cards use small dense cells.
13. On Yunus's detail, confirm each Habit Card shows only its information affordance and weekly tracker—no large dash/check completion control—and that `Atamayı düzelt / sonlandır` looks like a compact secondary app action rather than a browser-default button.
14. On Today Week mode, confirm one shared `Son 7 gün` header aligns above two 62px habit rows. Each row should contain only icon, truncated name, and seven aligned cells—no description, information button, large completion control, or streak strip. Confirm today's binary cell toggles directly and today's quantitative cell opens the amount sheet.
15. Confirm Today opens directly into reminder/tracker content without a separate `Bugün` heading or explanatory paragraph, while the shared seven-day header remains visible and aligned.

## Automated and rendered evidence

- Final release verification passed ESLint, generated-route TypeScript, 113/113 Vitest tests, and the production build. The combined wrapper reached the build after all earlier gates passed but hit its command timeout; `npm.cmd run build` was then rerun alone and passed.
- The complete Playwright suite passed 13/13 Chrome journeys against the running local server, including the combined MT-001/002/003 regression, the 320px MT-008 containment regression, the MT-009 labeled-calendar/settings regression, and the MT-012 nested-hierarchy/dense-row regression.
- MT-004 focused component regression: passed 3/3 assertions for card-contained history links and streak values.
- MT-005/006/007 regression: per-assignment reminder UI/persistence, profile controls, and the 24px weekly-cell browser assertion all passed.
- Rendered QA: passed at 320×733, 390×844, and 1280px with no horizontal overflow, no framework overlay, and no application console errors or warnings. At 320px, compact Week names intentionally truncated inside usable slots, the home-mode pill remained centered 12px above mobile navigation, and all primary surfaces stayed inside the viewport. At 390px, Week used the shared header and low tracker rows; six-month mode retained full cards, streak insights, and Monday-aligned calendar columns with month and weekday labels. Shift+F10 opened the card panel with no visible ellipsis. At 1280px, the mode pill was centered within the main content region and İlerlemem was absent from navigation.
- Local demo hierarchy QA: Tarik rendered as `Öğrenci · Mentor`; Students showed exactly Yunus, Yusuf, and Bera as direct students; Yunus detail showed all six requested students; Network summarized 16 descendants and 3 Junior Mentors with 6/4/3-student branches. Desktop and 390×844 mobile checks had no horizontal overflow or console warnings/errors.
- MT-011/012 rendered QA: at 390×844 and 1280px the three facts stayed aligned and all six students rendered with the shared evidence-rich row; 12 compact evidence strips were present. Okan's Back link was `Yunus grubuna dön`, returned to `/students/ayse`, and Yunus retained `Öğrencilerim`. Weekly mentor-detail cells measured 24px, with no horizontal overflow in either viewport.
- MT-013 rendered QA: at 390×844 and 1280px Yunus's two Habit Cards had zero completion controls, retained both dense trackers, and used two styled secondary assignment actions. Neither viewport produced horizontal overflow, and the Impeccable layout detector reported no violations.
- MT-014 rendered QA: at 390×844 Today rendered two 62px compact rows with 24px cells; at 320×733 the same rows used 19px cells and intentional name truncation. Both sizes showed one seven-cell header, zero descriptions and large completion controls, direct binary/quantitative cell flows passed, neither size overflowed, and the Impeccable layout detector reported no violations.
- MT-015 rendered QA: at 390×844 the Today heading and description were absent, the first compact row moved upward, all seven date labels and both habit rows remained visible, and horizontal overflow stayed at zero.
- `supabase/migrations/202608100001_pr5_review_hardening.sql` was applied to disposable hosted project `doyzpafuqqoydnkxmbxg` after manual approval. The final expanded matrix passed 156/156; see [`2026-08-11-pr5-hosted-recheck.md`](2026-08-11-pr5-hosted-recheck.md).
