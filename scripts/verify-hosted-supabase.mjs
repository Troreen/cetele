import { randomUUID } from "node:crypto";
import { pathToFileURL } from "node:url";
import process from "node:process";
import { createClient } from "@supabase/supabase-js";

const ROLES = ["subject", "direct", "senior", "peer", "outsider"];

export const REQUIRED_ENV_NAMES = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
  ...ROLES.flatMap((role) => [
    `CETELE_VERIFY_${role.toUpperCase()}_EMAIL`,
    `CETELE_VERIFY_${role.toUpperCase()}_PASSWORD`,
  ]),
];

export function loadVerificationConfig(env) {
  const missing = REQUIRED_ENV_NAMES.filter((name) => !env[name]?.trim());
  if (missing.length) throw new Error(`Missing required environment variables: ${missing.join(", ")}`);

  const url = new URL(env.NEXT_PUBLIC_SUPABASE_URL);
  if (url.protocol !== "https:") throw new Error("NEXT_PUBLIC_SUPABASE_URL must use HTTPS for hosted verification.");
  const publishableKey = env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY.trim();
  if (publishableKey.startsWith("sb_secret_")) throw new Error("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY must not contain a secret key.");
  assertLegacyAnonKey(publishableKey);

  const identities = Object.fromEntries(ROLES.map((role) => {
    const prefix = `CETELE_VERIFY_${role.toUpperCase()}`;
    const email = env[`${prefix}_EMAIL`].trim().toLowerCase();
    const password = env[`${prefix}_PASSWORD`];
    if (!/^\S+@\S+\.\S+$/.test(email)) throw new Error(`${prefix}_EMAIL must be an email address.`);
    if (password.length < 8) throw new Error(`${prefix}_PASSWORD must contain at least 8 characters.`);
    return [role, { email, password }];
  }));
  if (new Set(Object.values(identities).map(({ email }) => email)).size !== ROLES.length) {
    throw new Error("Each hosted verification identity must use a distinct email address.");
  }
  return { url: url.toString().replace(/\/$/, ""), publishableKey, identities };
}

function assertLegacyAnonKey(key) {
  if (!key.includes(".")) return;
  try {
    const payload = JSON.parse(Buffer.from(key.split(".")[1], "base64url").toString("utf8"));
    if (payload.role && payload.role !== "anon") throw new Error("Legacy JWT key role is not anon.");
  } catch (error) {
    if (error instanceof Error && error.message === "Legacy JWT key role is not anon.") throw error;
  }
}

export function redact(value, secrets = []) {
  let output = String(value ?? "");
  for (const secret of [...secrets].filter(Boolean).sort((a, b) => b.length - a.length)) {
    output = output.split(secret).join("[REDACTED]");
  }
  return output
    .replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, "[REDACTED_EMAIL]")
    .replace(/\b(?:sb_(?:secret|publishable)_[A-Za-z0-9_-]+|eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+)\b/g, "[REDACTED_TOKEN]")
    .replace(/(bearer\s+)[A-Za-z0-9._~-]+/gi, "$1[REDACTED_TOKEN]");
}

export function plannedMatrix() {
  return [
    ["profile.self", "subject", "allow"],
    ["profile.subject", "direct", "allow"],
    ["profile.subject", "senior", "allow"],
    ["profile.subject", "peer", "deny"],
    ["profile.subject", "outsider", "deny"],
    ["relationship.direct-subject", "subject", "allow"],
    ["relationship.direct-subject", "direct", "allow"],
    ["relationship.direct-subject", "senior", "allow"],
    ["relationship.direct-subject", "peer", "deny"],
    ["relationship.direct-subject", "outsider", "deny"],
    ["shared-definition.in-tree", "subject", "allow"],
    ["shared-definition.in-tree", "peer", "allow"],
    ["shared-definition.cross-tree", "outsider", "deny"],
    ["assignment.subject", "subject", "allow"],
    ["assignment.subject", "direct", "allow"],
    ["assignment.subject", "senior", "allow"],
    ["assignment.subject", "peer", "deny"],
    ["assignment.subject", "outsider", "deny"],
    ["rpc.record-completion", "subject", "allow"],
    ["rpc.record-completion", "direct", "deny"],
    ["rpc.record-completion", "senior", "deny"],
    ["rpc.record-completion", "peer", "deny"],
    ["rpc.record-completion", "outsider", "deny"],
    ["rpc.record-completion.locked-date", "subject", "deny"],
    ["completion.subject", "subject", "allow"],
    ["completion.subject", "direct", "allow"],
    ["completion.subject", "senior", "allow"],
    ["completion.subject", "peer", "deny"],
    ["completion.subject", "outsider", "deny"],
    ["rpc.assign-subject", "peer", "deny"],
    ["rpc.assign-subject", "outsider", "deny"],
    ["rpc.reconcile-attention", "direct", "allow"],
  ].map(([resource, actor, expectation]) => ({ resource, actor, expectation }));
}

function publicClient(config) {
  return createClient(config.url, config.publishableKey, {
    auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
  });
}

function dateInTimezone(timezone) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
}

function shiftIsoDate(date, days) {
  const value = new Date(`${date}T12:00:00Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}

async function rows(client, table, filters) {
  let query = client.from(table).select("id");
  for (const [column, value] of Object.entries(filters)) query = query.eq(column, value);
  const result = await query;
  if (result.error) throw result.error;
  return result.data ?? [];
}

async function main() {
  const config = loadVerificationConfig(process.env);
  const secrets = [config.publishableKey, ...Object.values(config.identities).flatMap(({ email, password }) => [email, password])];
  const clients = Object.fromEntries(ROLES.map((role) => [role, publicClient(config)]));
  const users = {};
  const results = [];
  const cleanupMarker = `cetele-hosted-verify:${randomUUID()}`;
  const record = (resource, actor, expectation, passed, detail = "") => {
    results.push({ resource, actor, expectation, status: passed ? "PASS" : "FAIL", detail: redact(detail, secrets) });
  };
  const checkRows = async (resource, actor, expectation, table, filters) => {
    const data = await rows(clients[actor], table, filters);
    const passed = expectation === "allow" ? data.length === 1 : data.length === 0;
    record(resource, actor, expectation, passed, passed ? "" : `expected ${expectation}, observed ${data.length} row(s)`);
  };
  const checkRpc = async (resource, actor, expectation, fn, args) => {
    const { error } = await clients[actor].rpc(fn, args);
    const passed = expectation === "allow" ? !error : Boolean(error);
    record(resource, actor, expectation, passed, passed ? "" : error?.message ?? "RPC unexpectedly succeeded");
  };

  try {
    for (const role of ROLES) {
      const { data, error } = await clients[role].auth.signInWithPassword(config.identities[role]);
      if (error || !data.user) throw new Error(`Authentication precondition failed for role ${role}: ${error?.message ?? "no user"}`);
      users[role] = data.user;
    }

    const subjectProfile = await clients.subject.from("profiles").select("id,timezone").eq("id", users.subject.id).single();
    if (subjectProfile.error) throw new Error(`Subject profile precondition failed: ${subjectProfile.error.message}`);
    const today = dateInTimezone(subjectProfile.data.timezone);

    await checkRows("profile.self", "subject", "allow", "profiles", { id: users.subject.id });
    for (const [actor, expectation] of [["direct", "allow"], ["senior", "allow"], ["peer", "deny"], ["outsider", "deny"]]) {
      await checkRows("profile.subject", actor, expectation, "profiles", { id: users.subject.id });
    }

    for (const [actor, expectation] of [["subject", "allow"], ["direct", "allow"], ["senior", "allow"], ["peer", "deny"], ["outsider", "deny"]]) {
      await checkRows("relationship.direct-subject", actor, expectation, "mentorship_relationships", { mentor_id: users.direct.id, student_id: users.subject.id, status: "active" });
    }

    const shared = await clients.direct.from("habit_definitions").select("id").eq("author_id", users.direct.id).eq("visibility", "shared").limit(1).maybeSingle();
    if (shared.error || !shared.data) throw new Error("Seed precondition failed: Direct Mentor needs at least one shared Habit Definition.");
    for (const [actor, expectation, resource] of [["subject", "allow", "shared-definition.in-tree"], ["peer", "allow", "shared-definition.in-tree"], ["outsider", "deny", "shared-definition.cross-tree"]]) {
      await checkRows(resource, actor, expectation, "habit_definitions", { id: shared.data.id });
    }

    const assignments = await clients.subject.from("habit_assignments").select("id,definition_id,target").eq("student_id", users.subject.id).eq("status", "active");
    if (assignments.error || !assignments.data?.length) throw new Error("Seed precondition failed: subject needs an active Habit Assignment.");
    let assignment;
    for (const candidate of assignments.data) {
      const existing = await rows(clients.subject, "completions", { assignment_id: candidate.id, completion_date: today });
      if (!existing.length) { assignment = candidate; break; }
    }
    if (!assignment) throw new Error("Seed precondition failed: subject needs an active assignment without a completion today.");
    const definition = await clients.subject.from("habit_definitions").select("mode,default_target").eq("id", assignment.definition_id).single();
    if (definition.error) throw new Error(`Assignment definition precondition failed: ${definition.error.message}`);

    for (const [actor, expectation] of [["subject", "allow"], ["direct", "allow"], ["senior", "allow"], ["peer", "deny"], ["outsider", "deny"]]) {
      await checkRows("assignment.subject", actor, expectation, "habit_assignments", { id: assignment.id });
    }

    const amount = definition.data.mode === "quantitative" ? assignment.target ?? definition.data.default_target ?? 1 : null;
    const completionArgs = { p_assignment_id: assignment.id, p_date: today, p_amount: amount, p_note: cleanupMarker };
    await checkRpc("rpc.record-completion", "subject", "allow", "record_completion", completionArgs);
    for (const actor of ["direct", "senior", "peer", "outsider"]) {
      await checkRpc("rpc.record-completion", actor, "deny", "record_completion", completionArgs);
    }
    await checkRpc("rpc.record-completion.locked-date", "subject", "deny", "record_completion", { ...completionArgs, p_date: shiftIsoDate(today, -2) });

    for (const [actor, expectation] of [["subject", "allow"], ["direct", "allow"], ["senior", "allow"], ["peer", "deny"], ["outsider", "deny"]]) {
      await checkRows("completion.subject", actor, expectation, "completions", { assignment_id: assignment.id, completion_date: today });
    }
    for (const actor of ["peer", "outsider"]) {
      await checkRpc("rpc.assign-subject", actor, "deny", "assign_habit_definition", { p_definition_id: shared.data.id, p_student_id: users.subject.id, p_target: null });
    }
    await checkRpc("rpc.reconcile-attention", "direct", "allow", "reconcile_my_attention", {});

    const failed = results.filter(({ status }) => status === "FAIL").length;
    const projectRef = new URL(config.url).hostname.split(".")[0];
    console.log(JSON.stringify({ gate: failed ? "FAIL" : "PASS", project_ref: projectRef, cleanup_marker: cleanupMarker, passed: results.length - failed, failed, results }, null, 2));
    if (failed) process.exitCode = 1;
  } catch (error) {
    console.error(redact(error instanceof Error ? error.message : error, secrets));
    console.error(`Cleanup marker (if a completion was written): ${cleanupMarker}`);
    process.exitCode = 1;
  } finally {
    await Promise.allSettled(Object.values(clients).map((client) => client.auth.signOut({ scope: "local" })));
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try { await main(); }
  catch (error) {
    console.error(redact(error instanceof Error ? error.message : error));
    process.exitCode = 1;
  }
}
