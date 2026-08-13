import { createHash, randomBytes } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

const ROLES = ["SUBJECT", "DIRECT", "SENIOR", "PEER", "OUTSIDER"];
export const REQUIRED_ENV_NAMES = ["NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "SUPABASE_SECRET_KEY", ...ROLES.flatMap((role) => [`CETELE_VERIFY_${role}_EMAIL`, `CETELE_VERIFY_${role}_PASSWORD`])];

export function loadVerificationConfig(env) {
  const missing = REQUIRED_ENV_NAMES.filter((name) => !env[name]);
  if (missing.length) throw new Error(`Missing hosted verification variables: ${missing.join(", ")}`);
  if (/secret/i.test(env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY)) throw new Error("Publishable key must not contain a secret key");
  const emails = ROLES.map((role) => env[`CETELE_VERIFY_${role}_EMAIL`].trim().toLowerCase());
  if (new Set(emails).size !== emails.length) throw new Error("Hosted identities require a distinct email for every role");
  return {
    url: env.NEXT_PUBLIC_SUPABASE_URL,
    key: env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    secret: env.SUPABASE_SECRET_KEY,
    credentials: Object.fromEntries(ROLES.map((role, index) => [role.toLowerCase(), { email: emails[index], password: env[`CETELE_VERIFY_${role}_PASSWORD`] }])) ,
  };
}

export function errorSummary(error) {
  if (!error) return "none";
  return JSON.stringify({ code: error.code, message: error.message, details: error.details, hint: error.hint });
}

export function redact(value, secrets = []) {
  let output = String(value);
  for (const secret of secrets) if (secret) output = output.replaceAll(secret, "[REDACTED]");
  output = output
    .replace(/[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}/g, "[REDACTED_EMAIL]")
    .replace(/Bearer\s+\S+/gi, "Bearer [REDACTED]")
    .replace(/sb_(?:secret|publishable)_\S+/gi, "sb_[REDACTED]")
    .replace(/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g, "[REDACTED_JWT]");
  return output;
}

const resources = ["profile.subject", "relationship.subject", "assignment.subject", "completion.subject", "attention.subject"];
const actors = ["subject", "direct", "senior", "peer", "outsider", "anonymous"];
export function plannedMatrix() {
  const rows = [];
  for (const resource of resources) for (const actor of actors) {
    rows.push({ resource, actor, expectation: actor === "subject" || actor === "direct" ? "allow" : "deny" });
  }
  rows.push(
    { resource: "followup.direct-private", actor: "direct", expectation: "allow" },
    { resource: "followup.direct-private", actor: "subject", expectation: "deny" },
    { resource: "followup.direct-private", actor: "senior", expectation: "deny" },
    { resource: "profile.subject-after-withdrawal", actor: "direct", expectation: "deny" },
    { resource: "profile.subject-after-withdrawal", actor: "senior", expectation: "deny" },
    { resource: "profile.subject-wrong-consent-recipient", actor: "direct", expectation: "deny" },
    { resource: "profile.incomplete-self", actor: "outsider", expectation: "deny" },
    { resource: "rpc.incomplete-reconcile", actor: "outsider", expectation: "deny" },
    { resource: "profile.subject-closure-recovery", actor: "subject", expectation: "allow" },
    { resource: "completion.subject-stale-jwt-closure", actor: "subject", expectation: "deny" },
    { resource: "claim.access-expired", actor: "service-boundary", expectation: "deny" },
    { resource: "claim.access-revoked", actor: "service-boundary", expectation: "deny" },
    { resource: "claim.access-exhausted", actor: "service-boundary", expectation: "deny" },
    { resource: "claim.access-reservation", actor: "service-boundary", expectation: "allow" },
    { resource: "claim.access-over-reservation", actor: "service-boundary", expectation: "deny" },
    { resource: "claim.invitation-reservation", actor: "service-boundary", expectation: "allow" },
    { resource: "claim.invitation-replay", actor: "service-boundary", expectation: "deny" },
    { resource: "auth.refresh-after-session-revocation", actor: "peer", expectation: "deny" },
  );
  return rows;
}

function client(url, key) { return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } }); }
function hash(token) { return createHash("sha256").update(token).digest("hex"); }

async function signIn(config, role) {
  const instance = client(config.url, config.key);
  const { data, error } = await instance.auth.signInWithPassword(config.credentials[role]);
  if (error || !data.user) throw new Error(`Synthetic ${role} sign-in failed: ${errorSummary(error)}`);
  return { client: instance, user: data.user };
}

async function readCount(instance, table, column, id) {
  const { data, error } = await instance.from(table).select("*", { count: "exact" }).eq(column, id);
  return { count: data?.length ?? 0, error };
}

async function main() {
  const config = loadVerificationConfig(process.env);
  const identities = Object.fromEntries(await Promise.all(ROLES.map(async (raw) => {
    const role = raw.toLowerCase(); return [role, await signIn(config, role)];
  })));
  const admin = client(config.url, config.secret);
  const anonymous = client(config.url, config.key);
  const subjectId = identities.subject.user.id;
  const directId = identities.direct.user.id;

  const { data: relation } = await admin.from("mentorship_relationships").select("id").eq("mentor_id", directId).eq("student_id", subjectId).eq("status", "active").single();
  const { data: assignment } = await admin.from("habit_assignments").select("id").eq("student_id", subjectId).eq("status", "active").limit(1).single();
  const { data: completion } = await admin.from("completions").select("id").eq("student_id", subjectId).limit(1).single();
  const { data: attention } = await admin.from("attention_items").select("id").eq("student_id", subjectId).limit(1).single();
  const { data: followup } = await admin.from("followups").select("id,actor_id").eq("actor_id", directId).limit(1).single();
  if (!relation || !assignment || !completion || !attention || !followup) throw new Error("Disposable hosted fixture graph is incomplete");

  const lookup = {
    "profile.subject": ["profiles", "id", subjectId],
    "relationship.subject": ["mentorship_relationships", "id", relation.id],
    "assignment.subject": ["habit_assignments", "id", assignment.id],
    "completion.subject": ["completions", "id", completion.id],
    "attention.subject": ["attention_items", "id", attention.id],
  };
  const results = [];
  for (const resource of resources) for (const actor of actors) {
    const instance = actor === "anonymous" ? anonymous : identities[actor].client;
    const outcome = await readCount(instance, ...lookup[resource]);
    const allowed = !outcome.error && outcome.count === 1;
    const expectation = actor === "subject" || actor === "direct" ? "allow" : "deny";
    results.push({ resource, actor, expectation, pass: expectation === "allow" ? allowed : !allowed });
  }
  for (const actor of ["direct", "subject", "senior"]) {
    const outcome = await readCount(identities[actor].client, "followups", "id", followup.id);
    results.push({ resource: "followup.direct-private", actor, expectation: actor === "direct" ? "allow" : "deny", pass: actor === "direct" ? !outcome.error && outcome.count === 1 : outcome.count === 0 });
  }

  const withdrawal = await identities.subject.client.rpc("withdraw_consent", { p_purpose: "direct_mentor_visibility" });
  if (withdrawal.error) throw withdrawal.error;
  for (const actor of ["direct", "senior"]) {
    const outcome = await readCount(identities[actor].client, "profiles", "id", subjectId);
    results.push({ resource: "profile.subject-after-withdrawal", actor, expectation: "deny", pass: outcome.count === 0 });
  }
  const { data: visibilityDoc } = await admin.from("legal_documents").select("kind,version,content_hash").eq("kind", "direct_mentor_visibility_consent").eq("is_current", true).single();
  await admin.from("legal_events").insert({ user_id: subjectId, event_kind: "consent_granted", purpose: "direct_mentor_visibility", document_kind: visibilityDoc.kind, document_version: visibilityDoc.version, content_hash: visibilityDoc.content_hash, recipient_scope: { direct_mentor_id: identities.senior.user.id }, affirmative_method: "hosted_wrong_recipient_denial" });
  const wrongRecipient = await readCount(identities.direct.client, "profiles", "id", subjectId);
  results.push({ resource: "profile.subject-wrong-consent-recipient", actor: "direct", expectation: "deny", pass: wrongRecipient.count === 0 });
  await admin.from("legal_events").insert({ user_id: subjectId, event_kind: "consent_granted", purpose: "direct_mentor_visibility", document_kind: visibilityDoc.kind, document_version: visibilityDoc.version, content_hash: visibilityDoc.content_hash, recipient_scope: { direct_mentor_id: directId }, affirmative_method: "hosted_fixture_restore" });
  await admin.from("mentorship_relationships").insert({ mentor_id: directId, student_id: subjectId });

  await admin.from("profiles").update({ onboarding_completed_at: null }).eq("id", identities.outsider.user.id);
  const incompleteProfile = await readCount(identities.outsider.client, "profiles", "id", identities.outsider.user.id);
  const incompleteRpc = await identities.outsider.client.rpc("reconcile_my_attention");
  results.push({ resource: "profile.incomplete-self", actor: "outsider", expectation: "deny", pass: incompleteProfile.count === 0 });
  results.push({ resource: "rpc.incomplete-reconcile", actor: "outsider", expectation: "deny", pass: Boolean(incompleteRpc.error) });
  await admin.from("profiles").update({ onboarding_completed_at: new Date().toISOString() }).eq("id", identities.outsider.user.id);

  await admin.from("profiles").update({ account_state: "closure_requested" }).eq("id", subjectId);
  const stale = await readCount(identities.subject.client, "profiles", "id", subjectId);
  const staleCompletion = await readCount(identities.subject.client, "completions", "id", completion.id);
  results.push({ resource: "profile.subject-closure-recovery", actor: "subject", expectation: "allow", pass: stale.count === 1 });
  results.push({ resource: "completion.subject-stale-jwt-closure", actor: "subject", expectation: "deny", pass: staleCompletion.count === 0 });
  await admin.from("profiles").update({ account_state: "active" }).eq("id", subjectId);

  async function accessCase(resource, fields, userId, expectation) {
    const token = randomBytes(32).toString("base64url");
    const { data: code, error } = await admin.from("access_codes").insert({ token_hash: hash(token), created_by: directId, maximum_uses: 1, expires_at: new Date(Date.now() + 3600000).toISOString(), ...fields }).select("id").single();
    if (error) throw error;
    const claim = await admin.rpc("begin_pending_registration", { p_user_id: userId, p_claim_kind: "access_code", p_token_hash: hash(token) });
    results.push({ resource, actor: "service-boundary", expectation, pass: expectation === "allow" ? !claim.error : Boolean(claim.error) });
    return { code, token, claim };
  }
  const createdCodes = [];
  createdCodes.push(await accessCase("claim.access-expired", { created_at: new Date(Date.now() - 7200000).toISOString(), expires_at: new Date(Date.now() - 3600000).toISOString() }, identities.outsider.user.id, "deny"));
  createdCodes.push(await accessCase("claim.access-revoked", { revoked_at: new Date().toISOString() }, identities.outsider.user.id, "deny"));
  createdCodes.push(await accessCase("claim.access-exhausted", { consumed_uses: 1 }, identities.outsider.user.id, "deny"));
  const reserved = await accessCase("claim.access-reservation", {}, identities.outsider.user.id, "allow");
  createdCodes.push(reserved);
  const over = await admin.rpc("begin_pending_registration", { p_user_id: identities.peer.user.id, p_claim_kind: "access_code", p_token_hash: hash(reserved.token) });
  results.push({ resource: "claim.access-over-reservation", actor: "service-boundary", expectation: "deny", pass: Boolean(over.error) });
  await admin.from("pending_registrations").delete().in("user_id", [identities.outsider.user.id, identities.peer.user.id]);

  const inviteToken = randomBytes(32).toString("base64url");
  const { data: invitation } = await admin.from("mentorship_invitations").insert({ mentor_id: directId, token_hash: hash(inviteToken), expires_at: new Date(Date.now() + 3600000).toISOString() }).select("id").single();
  const inviteClaim = await admin.rpc("begin_pending_registration", { p_user_id: identities.outsider.user.id, p_claim_kind: "mentorship_invitation", p_token_hash: hash(inviteToken) });
  const inviteReplay = await admin.rpc("begin_pending_registration", { p_user_id: identities.peer.user.id, p_claim_kind: "mentorship_invitation", p_token_hash: hash(inviteToken) });
  results.push({ resource: "claim.invitation-reservation", actor: "service-boundary", expectation: "allow", pass: !inviteClaim.error });
  results.push({ resource: "claim.invitation-replay", actor: "service-boundary", expectation: "deny", pass: Boolean(inviteReplay.error) });
  await admin.from("pending_registrations").delete().in("user_id", [identities.outsider.user.id, identities.peer.user.id]);
  await admin.from("mentorship_invitations").delete().eq("id", invitation.id);
  await admin.from("access_codes").delete().in("id", createdCodes.map((entry) => entry.code.id));

  const revokedSessions = await admin.rpc("revoke_user_sessions", { p_user_id: identities.peer.user.id });
  const refreshAfterRevocation = await identities.peer.client.auth.refreshSession();
  results.push({ resource: "auth.refresh-after-session-revocation", actor: "peer", expectation: "deny",
    pass: !revokedSessions.error && Boolean(refreshAfterRevocation.error) });

  const failed = results.filter((entry) => !entry.pass);
  console.log(JSON.stringify({ checks: results.length, passed: results.length - failed.length, failed }, null, 2));
  if (failed.length) process.exitCode = 1;
  for (const identity of Object.values(identities)) await identity.client.auth.signOut();
}

if (process.argv[1] && import.meta.url.endsWith(process.argv[1].replaceAll("\\", "/"))) {
  main().catch((error) => { console.error(redact(errorSummary(error), [])); process.exitCode = 1; });
}
