# Use manual secure links for mentorship invitations

Çetele V1 uses mentor-generated, revocable, expiring, single-use invitation links delivered privately outside the application. The invitee chooses their own email and password when claiming the link; Çetele does not email invitations or let mentors/admins create or share student passwords. This removes SMTP as an operational dependency while treating possession of the privately delivered bearer link as the invitation proof. Tokens are high entropy, stored only as hashes, carried in the link fragment so they are not sent in HTTP URLs or referrers, and never logged. Invitation consumption and Direct Mentor creation occur in one database transaction after account creation; a failed database claim triggers Auth-user cleanup, and a rare cleanup failure is surfaced for explicit administrator recovery.

## Considered options

- Hosted email invitations preserve provider-verified email ownership but require custom SMTP and deliverability operations.
- Admin-created accounts avoid SMTP but create password-sharing and recovery risks.

## Consequences

The mentor is responsible for delivering the link through a trusted out-of-band channel. Links must expire, be revocable, resist guessing and replay, and must not activate a second Direct Mentor relationship.
