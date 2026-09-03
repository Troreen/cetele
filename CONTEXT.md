# Mülahaza

Mülahaza is the domain of personal daily habit records within a hierarchical mentorship network. This glossary fixes the language used in product documents, issues, tests, and code.

## People and mentorship

**User**:
A person with one Mülahaza identity who may simultaneously be mentored and mentor others.
_Avoid_: Account type, student account, mentor account

**Alias**:
A user-chosen, non-unique display identity used inside Mülahaza without asserting or collecting a legal name.
_Avoid_: Legal name, full name, username

**Direct Mentor**:
The single user immediately above another user in the mentorship tree and ordinarily responsible for that user's accountability.
_Avoid_: Owner, supervisor, assigned admin

**Direct Student**:
A user immediately below a mentor in the mentorship tree.
_Avoid_: Report, subordinate, member

**Indirect Mentor**:
Any mentor above a user's Direct Mentor in the mentorship tree. This structural relationship grants no visibility into that user's identity, habits, or accountability records.
_Avoid_: Mentor Above, senior mentor, admin, observer

**Group**:
A mentor's direct students, optionally known by a friendly name.
_Avoid_: Team, cohort, branch

**Branch**:
Every user recursively below a mentor, including that mentor's group and all descendant groups. Membership in a Branch grants no transitive data visibility.
_Avoid_: Group, organization

**Mentorship Invitation**:
A pending offer to establish one Direct Mentor relationship, claimed through a revocable, expiring, single-use link without the mentor pre-identifying the recipient.
_Avoid_: Email invitation, shared password, account provisioning, membership invite, group invite

**Access Code**:
An admin-issued, revocable and expiring credential that permits a limited number of independent accounts to be created without establishing a mentorship relationship.
_Avoid_: Mentorship Invitation, registration password, permanent signup code

**Terms Acceptance**:
A user's acceptance of one identified version of the service contract; it is distinct from consent to process personal data.
_Avoid_: Privacy consent, Consent Grant

**Consent Grant**:
A user's separate, explicit and revocable permission for one specified personal-data purpose and recipient scope.
_Avoid_: Terms Acceptance, blanket consent, Privacy Notice acceptance

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
A student's optional short reflection attached to a Completion and visible only to that student and their Direct Mentor under the disclosed consent scope.
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
An attributable record that a mentor acted on a Needs Attention item outside Mülahaza, with an optional private note.
_Avoid_: Daily Review, completion, resolution

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

## Future relationships

**Encouragement Connection**:
A future, mutual and revocable peer relationship for deliberately scoped encouragement, distinct from mentorship and absent until both users separately opt in.
_Avoid_: Peer mentorship, automatic accountability partner, follower
