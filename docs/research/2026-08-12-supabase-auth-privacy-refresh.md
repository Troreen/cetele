# Supabase Auth refresh for private account onboarding

**Checked:** 2026-08-12
**Scope:** Milestones 0–5 of the private accounts, consent, and invitations plan
**Boundary:** API/security research for synthetic fixtures and a disposable hosted project only; this note does not authorize production signup or make a GDPR-compliance claim.

## Recommendation

Use an application-owned, hashed Access Code / Mentorship Invitation as the first gate, but do **not** expose ordinary `supabase.auth.signUp()` from the browser. After a trusted server transaction reserves a still-valid claim slot, have the server call `supabase.auth.admin.inviteUserByEmail()` with the invitee-supplied email and a short opaque registration nonce in `user_metadata`. Supabase documents that this server-only admin API creates a new unconfirmed Auth user, sends an invitation email, and errors for an already-confirmed email; its secret key bypasses RLS and must never reach the browser. The invitation link confirms the email and can establish the authenticated session used to set a password. [Supabase users and invitations](https://supabase.com/docs/guides/auth/users) [Supabase `inviteUserByEmail`](https://supabase.com/docs/reference/javascript/auth-admin-inviteuserbyemail)

Keep **Confirm Email** enabled. Hosted projects enable it by default, and an unverified email user cannot normally sign in. Do not use `email_confirm: true` in `updateUserById()` for this journey because that would replace proof of mailbox control with an administrator assertion. [Supabase password-based Auth](https://supabase.com/docs/guides/auth/passwords) [Supabase general Auth configuration](https://supabase.com/docs/guides/auth/general-configuration) [Supabase `updateUserById`](https://supabase.com/docs/reference/javascript/auth-admin-updateuserbyid)

The application cannot make the Auth API call and its own Postgres changes one atomic transaction. Model the handoff explicitly:

1. Lock the hashed claim row and create a short-lived reservation with a random registration nonce. A Mentorship Invitation permits one live reservation; an Access Code must count live reservations plus completions against its cap.
2. Call `inviteUserByEmail()` on the server, passing only the opaque nonce as metadata. Do not put the email in the reservation or any application table.
3. Bind the returned Auth UUID to the reservation in a second trusted transaction, then clear the now-inert nonce from Auth user metadata with the server-only admin API.
4. On a failure, retain a recoverable state and use a bounded compensating action; stale unbound reservations and incomplete users belong in the cleanup job.
5. Consume the invitation/code only in the final onboarding RPC that also creates the Alias profile, versioned legal evidence, and (when applicable) Direct Mentor relationship.

This ordering prevents a failed email or password step from consuming the claim. It also makes an Auth success followed by an application failure recoverable instead of pretending the cross-service workflow is atomic.

## Before User Created hook: feasible only as a second gate

Configure a Postgres **Before User Created** hook to reject user creation unless the incoming `user.user_metadata` contains a valid, unexpired registration nonce whose reservation is still eligible. The hook payload contains the proposed Auth UUID, email, `app_metadata`, and user-editable `user_metadata`, and the proposed user is not yet present in Postgres. A successful hook permits creation; an error rejects it. [Supabase Before User Created hook](https://supabase.com/docs/guides/auth/auth-hooks/before-user-created-hook)

The nonce is not authorization merely because it arrived in `user_metadata`: validate its cryptographic hash against trusted private state, bind the proposed `user.id`, and never consult the metadata again for onboarding, consent, administrator authority, or RLS. Supabase explicitly says `user_metadata` is user-editable and unsuitable for security-sensitive authorization. [Supabase users](https://supabase.com/docs/guides/auth/users)

Prefer an invoker hook with narrowly granted table access to `supabase_auth_admin`; Supabase recommends explicit grants and warns against casually using the dashboard's `security definer` tag. Revoke execution from `anon`, `authenticated`, and `PUBLIC`. Hooks have a two-second Postgres timeout, so nonce lookup must be indexed and bounded. [Supabase Auth hooks security model](https://supabase.com/docs/guides/auth/auth-hooks)

Do not rely on the hook as the only gate until the disposable hosted matrix proves that it runs for `inviteUserByEmail()` and receives its `data` as expected. The current docs demonstrate the hook for user creation and document invite metadata separately, but do not explicitly promise this combined behavior. Also prove whether disabling **Allow new users to sign up** still permits admin invitations. If both checks pass, disable public signup and retain the hook as defense in depth; otherwise keep public signup unreachable in the application and make the hook the enforced bypass defense. [Supabase general Auth configuration](https://supabase.com/docs/guides/auth/general-configuration)

## Email verification and secure link handling

Use the Invite User email template with a server-side verification endpoint that receives `token_hash` and `type=invite`, calls `verifyOtp({ token_hash, type: 'invite' })`, stores the returned session in the normal SSR cookies, and redirects immediately to a clean `/hesap-kurulumu` URL. Supabase documents this TokenHash pattern specifically for server-side invitation verification; it avoids putting an access/refresh-token session in a URL fragment. [Supabase email templates](https://supabase.com/docs/guides/auth/auth-email-templates) [Supabase `verifyOtp`](https://supabase.com/docs/reference/javascript/auth-verifyotp)

The `token_hash` is still a single-use bearer secret in a query string. Give the confirmation endpoint and its intermediate page `Referrer-Policy: no-referrer`, do not load third-party scripts/images there, exchange the token immediately with a POST to Supabase, and redirect to a URL with no secret. OWASP warns that URL tokens need HTTPS, rate limiting, short expiry, single use, trusted hosts, and a no-referrer reset page. [OWASP Forgot Password Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Forgot_Password_Cheat_Sheet.html)

Email scanners can consume a single-use confirmation link before the person clicks it. Supabase recommends either an OTP-entry flow or an intermediate page with an explicit confirmation button, and recommends disabling email-provider link tracking. Use the explicit-button/OTP pattern in the hosted proof rather than assuming a direct GET link survives real mail infrastructure. [Supabase email-template limitations](https://supabase.com/docs/guides/auth/auth-email-templates) [Supabase production checklist](https://supabase.com/docs/guides/deployment/going-into-prod)

For the **application claim URL** (the Access Code or Mentorship Invitation, not Supabase's email verification token), put the raw claim secret after `#` and serve only a non-sensitive shell at the path. A URI fragment is not sent in the HTTP request and cannot appear in the `Referer` header; client code should read it once, remove it with `history.replaceState`, and POST it in the request body. This reduces server/proxy/referrer logging, but it does not protect against browser history, extensions, XSS, screenshots, or a copied URL, so the secret still needs high entropy, hashing at rest, expiry, revocation, replay protection, and rate limiting. [MDN URI fragments](https://developer.mozilla.org/en-US/docs/Web/URI/Reference/Fragment) [MDN `Referer`](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Referer) [OWASP Forgot Password Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Forgot_Password_Cheat_Sheet.html)

## Incomplete Auth user gate

Email verification creates a real authenticated Supabase session before Çetele onboarding is complete. Treat authentication and application admission as separate facts:

- `auth.uid()` proves only which Auth user made the request.
- A trusted `pending_registrations` row determines whether that user may access setup/recovery operations.
- A completed Alias profile plus current required consent/terms state determines whether ordinary application access is allowed.
- Every application table/RPC/RLS policy must include the appropriate completed-account predicate; `TO authenticated` alone would admit incomplete users.
- Middleware/layout routing should send incomplete users to setup, but it is only UX. Database and server-action checks remain authoritative.
- `app_metadata` may mirror onboarding state as a routing hint only. JWT claims can be stale, so the database state remains the authority for sensitive access.

Do not insert a profile in an Auth trigger. The final trusted onboarding RPC must create the profile, consent evidence, relationship, and claim consumption together, after checking `auth.uid()`, the pending registration, current legal-document versions, and affirmative inputs.

## Password setup and recovery

After the invite token establishes a session, set the first password with authenticated `supabase.auth.updateUser({ password })`; Supabase documents this API for a logged-in user. Make the password update occur before the final onboarding RPC. If it fails, nothing is consumed; if it succeeds but the RPC fails, the user remains incomplete and can safely retry setup. [Supabase `updateUser`](https://supabase.com/docs/reference/javascript/auth-updateuser) [Supabase password security](https://supabase.com/docs/guides/auth/password-security)

Use `resetPasswordForEmail(email, { redirectTo })` for returning-user recovery, then `updateUser({ password })` on an authenticated recovery page. Supabase currently returns success even when the email has no account, so the public response can remain generic. The recovery page itself must be authenticated. [Supabase password recovery](https://supabase.com/docs/guides/auth/passwords)

Wrap signup/invite, resend, sign-in, and recovery outcomes in Çetele-owned generic Turkish copy and avoid branching response timing where practical. Supabase warns that signup may return an error designed to obscure account existence, but that is not a stable product contract; admin invitation explicitly errors for an already-confirmed user. Do not forward raw provider errors to the browser. [Supabase `signUp`](https://supabase.com/docs/reference/javascript/auth-signup) [OWASP Authentication Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html)

`resend()` documents signup confirmations, not admin invitations. A resend/recovery implementation therefore needs disposable-project evidence for unconfirmed invited users and a server-only reconciliation path; do not invent an email lookup by scanning `listUsers()` on every request. `listUsers()` is server-only and paginated, and there is no documented `getUserByEmail` JavaScript admin API. [Supabase `resend`](https://supabase.com/docs/reference/javascript/auth-resend) [Supabase `listUsers`](https://supabase.com/docs/reference/javascript/auth-admin-listusers)

## Session revocation, disablement, and deletion

Supabase `signOut()` defaults to global scope and revokes affected refresh-token sessions, but an already-issued access JWT remains usable until it expires. Supabase recommends short access-token expiry for this reason; for a strict check on sensitive operations, verify that the JWT's `session_id` still exists in `auth.sessions`. [Supabase `signOut`](https://supabase.com/docs/reference/javascript/auth-signout) [Supabase sessions](https://supabase.com/docs/guides/auth/sessions)

Therefore withdrawal, disablement, deletion-request, and cleanup flows must first write an application-owned blocking state that every protected RLS policy/RPC/server action checks. This gives immediate application denial even while a cryptographically valid JWT remains. Then revoke whatever sessions the flow can revoke and perform deletion only after the approved grace/retention process. Audit the migration for any policy that uses only `auth.uid()` ownership, because an orphaned JWT must not be able to create new rows after disablement.

`auth.admin.deleteUser(id)` is server-only. Hard delete is the default; Supabase's soft delete is non-reversible and retains a hashed user identifier, so whether it satisfies the approved erasure policy is a legal/product decision, not an engineering assumption. Deleting an Auth user does not itself sign the user out, and deletion fails while the user owns Storage objects. Application foreign keys should use deliberate cascades or an explicit deletion graph, and Storage ownership must be resolved before the Auth delete. [Supabase `deleteUser`](https://supabase.com/docs/reference/javascript/auth-admin-deleteuser) [Supabase user management](https://supabase.com/docs/guides/auth/managing-user-data)

`updateUserById({ ban_duration })` exists, but the reference does not define enough refresh-token/access-token semantics to use it as the sole revocation control. Prove ban, global sign-out, password change, hard delete, and stale-JWT behavior in the hosted matrix. [Supabase `updateUserById`](https://supabase.com/docs/reference/javascript/auth-admin-updateuserbyid)

## Abuse controls and current platform constraints

Apply separate application rate limits to claim preview/redemption and reservation creation, in addition to Supabase Auth limits. Supabase currently rate-limits email sends, signup confirmation, password recovery, verification, and token refresh; it also supports hCaptcha and Cloudflare Turnstile on signup, sign-in, and password reset. If the trusted server proxies Auth calls, review Supabase's explicit forwarded-IP configuration rather than accidentally rate-limiting every invitee as one server. [Supabase Auth rate limits](https://supabase.com/docs/guides/auth/rate-limits) [Supabase CAPTCHA](https://supabase.com/docs/guides/auth/auth-captcha)

Production-capable email requires approved custom SMTP or a Send Email hook. Supabase's built-in provider is best-effort and restricted, and the Auth changelog records two relevant changes: default-provider delivery was restricted to organization members in September 2024, and new Free projects using default SMTP lost email-template customization on 3 June 2026. The latter makes a fresh disposable Free project unable to use the required custom Invite User TokenHash template unless custom SMTP is configured. [Supabase default-email-provider change](https://supabase.com/changelog/29370-supabase-auth-changes-to-default-email-provider) [Supabase Free-tier email-template change](https://supabase.com/changelog/46599-changes-to-email-template-customisation-on-free-tier)

The repository currently pins `@supabase/supabase-js` 2.112.2 and `@supabase/ssr` 0.12.4 through its lockfile. Keep using the installed signatures while implementing, and recheck the Auth changelog plus installed type definitions before any later upgrade.

## Disposable hosted checks that remain mandatory

The following are unresolved documentation constraints, not implementation facts:

1. Prove that Before User Created runs for `inviteUserByEmail()`, receives the passed registration nonce, can bind the proposed Auth UUID, and cleanly rejects a missing/replayed/expired reservation.
2. Prove whether admin invitation continues to work with public signup disabled.
3. Characterize `inviteUserByEmail()` for an existing unconfirmed invite, an existing confirmed account, a deleted account, and concurrent calls; verify identical public copy and no claim over-consumption.
4. Prove the chosen resend path for an unconfirmed invited user without storing email in application tables.
5. Prove Invite User `TokenHash` + `type=invite` verification with the repository's cookie-backed SSR client, including expired, replayed, prefetched, wrong-browser, and malformed links.
6. Prove first-password `updateUser`, recovery, password-change session behavior, global sign-out, ban, hard deletion, and stale access-JWT denial.
7. Prove cleanup compensation for every boundary: reservation without Auth user, Auth user without bound pending registration, verified user without password, password-set incomplete user, and final-RPC retry.
8. Confirm Auth/application tables and logs contain no raw claim secret, full invitation URL, private email copy, password, recovery token, access token, or refresh token.

These checks should use only synthetic identities and a disposable hosted project. They do not relax the plan's production-activation block or replace the required human/legal decisions.
