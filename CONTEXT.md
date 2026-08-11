# Çetele

Çetele is the domain of personal daily habit records within a hierarchical mentorship network. This glossary fixes the language used in product documents, issues, tests, and code.

## People and mentorship

**User**:
A person with one Çetele identity who may simultaneously be mentored and mentor others.
_Avoid_: Account type, student account, mentor account

**Direct Mentor**:
The single user immediately above another user in the mentorship tree and ordinarily responsible for that user's accountability.
_Avoid_: Owner, supervisor, assigned admin

**Direct Student**:
A user immediately below a mentor in the mentorship tree.
_Avoid_: Report, subordinate, member

**Mentor Above**:
Any direct or indirect mentor above a user in the mentorship tree.
_Avoid_: Admin, observer

**Group**:
A mentor's direct students, optionally known by a friendly name.
_Avoid_: Team, cohort, branch

**Branch**:
Every user recursively below a mentor, including that mentor's group and all descendant groups.
_Avoid_: Group, organization

**Mentorship Invitation**:
A pending offer from a mentor to establish a direct-mentor relationship, represented by a revocable single-use link that the mentor delivers privately to the intended student.
_Avoid_: Email invitation, shared password, account provisioning, membership invite, group invite

## Habits and records

**Habit Definition**:
Reusable mentor-authored meaning for a daily practice, including what it is and what counts as completion.
_Avoid_: Task, goal, challenge

**Habit Guide**:
Supporting explanation attached to a Habit Definition, including purpose, completion guidance, practical tips, and optional resources.
_Avoid_: Description, lesson, article

**Habit Assignment**:
The attributable placement of a Habit Definition into a student's personal record, including any student-specific target.
_Avoid_: Habit, command, enrollment

**Completion**:
A student's recorded meaningful effort for one Habit Assignment on one calendar day.
_Avoid_: Check-in, submission, report

**Retrospective Completion**:
A Completion recorded for yesterday rather than on its calendar day.
_Avoid_: Backfill, late submission

**Completion Note**:
An optional short reflection attached by a student to a Completion and visible to that student and Mentors Above.
_Avoid_: Report, mentor note, follow-up note

**Excused Day**:
A mentor-granted exception for one Habit Assignment or all of a student's assignments on a calendar day; it is excluded from misses and aggregate completion and neither extends nor breaks a streak.
_Avoid_: Pause, completion, skipped day

**Habit History**:
The per-assignment calendar record of completed, pending, retrospective, missed, and excused days.
_Avoid_: Contribution graph, combined grid, score

## Accountability

**Needs Attention**:
A student-level accountability item created on the third day after the same Habit Assignment was missed on two consecutive days.
_Avoid_: Alert per habit, failure, strike

**Daily Review**:
A mentor's explicit record that they scanned their direct students for the day; it is a responsibility created by having direct students, not a Habit Assignment.
_Avoid_: Review habit, Follow-up, approval

**Follow-up**:
An attributable record that a mentor acted on a Needs Attention item outside Çetele, with an optional private note.
_Avoid_: Daily Review, completion, resolution

**Intervention**:
An exceptional, attributable action by a Mentor Above inside another Direct Mentor's ordinary responsibility.
_Avoid_: Delegation, routine assignment

## Sharing

**Private Habit**:
A Habit Definition discoverable only by its author.
_Avoid_: Personal habit, student-created habit

**Shared Habit**:
A Habit Definition discoverable by mentors in the same mentorship tree and reusable as an attributed template.
_Avoid_: Global habit, live shared document, forced assignment

**Adoption**:
Creation of an independent Habit Definition from a Shared Habit for use with the adopting mentor's own students.
_Avoid_: Subscription, synchronization, assignment
