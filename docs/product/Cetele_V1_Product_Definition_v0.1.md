# Çetele - V1 Product Definition & Development Handoff Brief

**Version:** 0.1  
**Date:** 8 August 2026  
**Scope:** Product behavior and V1 concept only. No technical architecture or implementation decisions.

> **One-sentence product definition:** Çetele is a web-based habit accountability system for mentorship networks: mentors assign simple daily habits, students build visible completion histories, and responsibility itself is tracked up the mentorship tree.

## 1. Product vision and philosophy

Çetele is not primarily a personal productivity app. It is a habit tracking and accountability system built around real mentorship relationships. A user may be a student of one mentor while simultaneously mentoring other students.

### Product principles
- **Consistency over perfection.** V1 habits are intentionally small and daily; doing a very small amount is meaningfully better than doing nothing.
- **Accountability at every level.** Students are accountable for habits; mentors for reviewing and following up; senior mentors for supervising mentors below them.
- **Local responsibility, supervisory visibility.** Direct mentors own day-to-day responsibility. Higher mentors see downward and can intervene when necessary, but should not normally bypass intermediate mentors.
- **Data before gamification.** Completion should feel satisfying, but the historical record is the product's core value.
- **Visual history is the analytics interface.** Contribution-style grids are the canonical habit history.
- **Calm and low-friction.** Student completion and mentor review should be fast and scan-friendly.
- **Personal experience can be configurable; accountability rules stay predictable.**

## 2. Core mentorship model
- Each user has **at most one direct mentor**; the root may have none.
- Each user may have **any number of direct students**.
- There are no permanent Student Account / Mentor Account types.
- A user may be both student and mentor simultaneously.
- Mentors can see all users recursively below them.
- The **direct mentor** is the accountable owner for direct students.
- Higher mentors may intervene when needed, but intervention is exceptional and attributable.
- **Group** = a mentor's direct students.
- **Branch** = everyone recursively below that mentor.

Example: `A -> B -> C/D`. A sees B, C, D. B sees C, D. If C needs attention, B owns the follow-up; A can see whether B handled it and can step in if necessary.

## 3. V1 scope at a glance
- Daily habits only.
- Habits are created/assigned by mentors, not students.
- Binary completion by default; optional quantitative target.
- Students can mark today and yesterday only; older dates lock.
- Every habit has its own contribution-style grid.
- Students may personalize habit icon/color/order.
- Two consecutive missed days trigger Needs Attention on the third day.
- Any mentor with direct students automatically has a Daily Review responsibility.
- Daily Review and Follow-up are distinct.
- Senior mentors can inspect junior mentor review consistency and follow-up.
- Students may see anonymous aggregate group progress, not peer-level individual data.
- Groups/branches derive from the mentorship tree.
- Shared habit templates are available across the same mentorship tree, including peer mentors.
- Invitation-based onboarding.
- Configurable reminders and personal display preferences.
- Exceptional, mentor-controlled excused days.

## 4. Student experience
### Today
- Show all assigned daily habits in a compact list/card collection.
- Binary habits should be completable in one quick interaction.
- Quantitative habits allow an amount to be recorded.
- Optional completion note.
- Yesterday remains editable; older dates are locked.
- Completion should have restrained, satisfying feedback; finishing all habits may produce a small "Today complete" moment.

### Progress
- Each habit has its own independent grid; never merge habits into a single grid.
- At minimum: **Week** and **6 Months** views. Third longer-range view remains open.
- Current streak and best streak are secondary summaries.
- Avoid statistics-heavy dashboards.

### Personalization
- Student can override icon/emoji and accent color for their own view.
- Student can reorder habits.
- Visual changes never alter assignment content or history.

### Group motivation
Students may see anonymous aggregate progress for their direct peer group. Mentors may use the data socially for prizes or motivation outside the app. No built-in reward system is required.

## 5. Mentor experience
The mentor's job is to notice who needs attention and follow up.

### Group overview
- Direct students shown in a scan-friendly overview.
- Needs Attention is prominent.
- Mentor should not need to open every student to know that the group is fine.
- Opening a student shows the student's actual habit histories and individual grids.

### Daily Review
Automatically exists for anyone with direct students; it is not an ordinary assigned habit.
- Mentor scans direct students and explicitly marks **Today reviewed**.
- Review can be marked even if follow-ups are unresolved.
- Review history is tracked using the contribution-grid visual language.
- Higher mentors can inspect review consistency.

### Follow-up
- Separate from Daily Review.
- A Needs Attention item can be marked **Followed up**.
- Optional internal note.
- Unresolved follow-up stays visible independently of Daily Review.

## 6. Senior mentor / hierarchy experience
Higher mentors see:
- personal habit performance below them;
- group and branch aggregates;
- junior mentor Daily Review consistency;
- Needs Attention items in lower branches;
- whether the responsible mentor followed up and any internal note.

**Principle:** delegated responsibility with supervisory visibility. Higher mentors can intervene, but the product should make that feel like stepping into another mentor's responsibility, not the default workflow. Intervention remains attributable.

## 7. Habits, Habit Guides, and assignments
### Habit definition
A reusable mentor-authored habit may contain:
- name;
- short description/instruction;
- Habit Guide / information panel;
- why it matters;
- what counts as completion;
- practical guidance/tips;
- optional supporting resources;
- binary vs quantitative mode;
- default quantitative target;
- default icon/color.

### Assignment
- Mentor assigns; students do not create tracked habits in V1.
- Reusable habit may be assigned to multiple direct students.
- Target may be overridden per student.
- Assigning mentor remains attributable.
- Higher mentor may assign lower in the tree only as exceptional intervention.

### Content vs appearance
- **Mentor controls:** meaning, guide, completion definition, target, assignment.
- **Student controls:** personal icon/color/order.

## 8. Completion model and visual history
### Binary
Completed / not completed per calendar day.

### Quantitative
A meaningful non-zero effort may count as a completed day even when the ideal target is not reached. The recorded amount remains visible. The Habit Guide clarifies what meaningful completion means for that habit.

### Date states
- **Completed** - counts positively, can extend streak.
- **Pending today** - not a miss yet.
- **Yesterday editable** - may be filled retrospectively; retrospective entry remains distinguishable.
- **Missed / locked** - older than yesterday, not completed.
- **Excused** - mentor-granted exception; excluded from miss logic and aggregate completion; neither extends nor breaks streak.

### Retroactive completion
Students may mark today and yesterday only. Older days lock.

### Completion notes
Optional short student note, visible to the student and mentors above them.

### Excused days
Exceptional. Mentor only. Can apply to one habit or the whole day, optionally with a note.

### Contribution grids
- Every habit owns its own grid.
- The grid is the canonical long-term record.
- Week and 6 Months views in V1 at minimum.
- Quantitative intensity may communicate amount relative to target while preserving the core completed/missed distinction.

### Streaks
- Current and best streak per habit.
- Any meaningful quantitative completion preserves streak.
- Excused day neither extends nor breaks streak.
- For mentors, review consistency/history is more important than a review streak.

## 9. Needs Attention, follow-up, and mentor review
### Trigger
**Two consecutive missed days trigger Needs Attention on the third day.** Example: Monday + Tuesday incomplete -> warning on Wednesday.

Because Tuesday is still editable on Wednesday, a legitimate retroactive correction may withdraw the warning. Merely completing Wednesday does not clear the past accountability issue.

### Unit of attention
Needs Attention is **student-level**, not one alert per missed habit. The item summarizes the trigger and other relevant recent misses.

### Lifecycle
1. Student misses the same habit on two consecutive days.
2. On day three, direct mentor receives Needs Attention.
3. Mentor may complete Daily Review independently.
4. Mentor follows up outside Çetele and marks Followed up.
5. Optional internal note is recorded.
6. History remains; future issues can surface again.

### Clearing rule
- A genuine retroactive correction may invalidate the warning.
- Later improvement without correcting the past misses does not silently clear it; mentor must explicitly mark Followed up.

## 10. Groups, branches, and aggregate progress
Groups are derived from the mentorship structure, not a second membership system. A mentor may give the direct group a friendly name.

Mentor aggregate data can include:
- group completion;
- branch completion;
- Needs Attention count;
- outstanding follow-up count;
- junior mentor review consistency.

Do not attempt to combine multiple habits into an aggregate contribution grid; use simple percentages, counts, and status.

Students may see anonymous aggregate progress for their own peer group, not individual peer data.

## 11. Shared habit library
- **Private habit:** mentor only.
- **Shared habit:** discoverable by mentors in the same mentorship tree, including peer mentors.
- Shared habit retains original creator attribution.
- Shared habits behave like reusable templates, not live centrally controlled documents.
- Adopting a shared habit creates a usable version for that mentor's own students.
- Later edits to the source do not silently change existing adopted assignments.

Not V1: ratings, marketplace, complex approval, automatic top-down assignment.

## 12. Visibility, privacy, and notes
- Individual habit data is visible to the subject and mentors above them.
- Peers do not see individual habit records.
- Student completion notes: student + mentors above.
- Mentor follow-up notes: writer + mentors above; **not the student**.
- Daily Review history is visible upward for junior mentors.
- Anonymous group aggregates may be visible to the peer group.

## 13. Onboarding and invitations
1. Mentor invites a direct student.
2. Invitee appears Pending until accepted.
3. Relationship activates on acceptance.
4. Mentor can assign habits.
5. If the student later mentors others, the same account gains mentor responsibilities naturally.

A user cannot have a second direct mentor simultaneously. Transfer behavior remains to be defined, but history must be preserved.

## 14. Notifications and configurability
### Notifications
- Student reminder for incomplete daily habits, configurable.
- Mentor reminder for Daily Review, configurable.
- Needs Attention is prominent for direct mentor.
- Senior mentors are not spammed for every descendant miss.
- No motivational notification spam or streak-loss pressure in V1.

### User-configurable
- Reminder timing/enabling.
- Habit icon/color/order.
- General appearance preferences.

### System-consistent in V1
- Needs Attention rule.
- One-direct-mentor rule.
- Daily Review responsibility.
- Visibility direction through the tree.

## 15. Conceptual information architecture
This is not a final UI/navigation spec.
- **Today** - own habits and quick completion; mentor review responsibility should also be visible.
- **My Progress** - per-habit grids, streaks, guides, quantities, notes.
- **My Students** - direct students, current status, Needs Attention.
- **Needs Attention** - unresolved accountability items and follow-up.
- **Groups / Network** - group/branch aggregates and junior mentor review consistency.
- **Habit Library** - private and shared habit templates.
- **Settings** - reminders and personal customization.

Today remains the personal anchor even for mentors.

## 16. Core V1 user journeys
### A. Student joins and receives habits
Invite -> accept -> mentor assigns -> student sees Today -> student personalizes appearance.

### B. Student completes daily habits
Open Today -> mark/record -> optional note -> grid updates -> inspect week/six-month history.

### C. Mentor reviews group
Open overview -> scan direct students -> inspect exceptions -> mark Today reviewed -> review history updates.

### D. Needs Attention
Two consecutive misses -> warning on third day -> retroactive correction may invalidate -> otherwise mentor follows up -> marks Followed up -> optional internal note.

### E. Senior mentor supervises
See junior mentor's personal habits + group status + Daily Review consistency + outstanding follow-ups -> hold junior mentor accountable -> intervene only when necessary.

### F. Shared habit reuse
Discover shared template -> adopt -> assign to direct students -> customize targets -> source edits do not silently change adopted assignments.

## 17. V1 non-goals and future backlog
### Not V1
- selected weekday schedules;
- X times/week schedules;
- monthly/custom schedules;
- pause periods and advanced lifecycle controls;
- rich archive/end-assignment workflows;
- built-in group goals/prizes/reward mechanics;
- points/XP/coins/leaderboards;
- peer-level individual visibility;
- in-app chat;
- complex analytics/custom reports/predictive scores;
- separate mentor/student account types;
- complex shared-library approvals/ratings/marketplace;
- automatic forced top-down assignment.

### Possible future features
- selected weekday/flexible frequency scheduling;
- monthly/custom scheduling;
- pause/archive/end controls;
- explicit shared-habit version updates;
- richer group challenge features if usage proves a need;
- longer/custom date reporting;
- organization-level policy configuration if different trees eventually need different rules.

## 18. Product invariants and open questions
### Invariants
- At most one direct mentor per user.
- Any number of direct students.
- Direct mentor owns accountability.
- Visibility flows upward, not sideways.
- Intervention from above is exceptional and attributable.
- Students do not create tracked habits in V1.
- V1 habits are daily.
- One grid per habit; never merge habits into one grid.
- Student can edit today and yesterday only.
- Two consecutive misses -> Needs Attention on day three.
- Daily Review and Follow-up are separate.
- Mentor controls meaning; student controls presentation.
- The record matters more than gamification.

### Open product questions
1. Third grid range: 1 Year, All Time, or another range?
2. Which group aggregate metrics should students see?
3. What minimum group size protects anonymity for aggregate progress?
4. How should direct-mentor transfer work while preserving history?
5. Can completion notes be edited after the day locks?
6. How much of Needs Attention should the student themselves see?
7. What is the simplest V1 correction flow for a mistakenly assigned habit if full lifecycle controls are deferred?

> **V1 quality bar:** A student can record daily consistency in seconds. A mentor can understand who needs attention without opening every profile. A senior mentor can tell whether junior mentors are actually reviewing and following up.
