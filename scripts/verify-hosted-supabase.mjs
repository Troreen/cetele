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

export function errorSummary(error) {
  if (error instanceof Error) return error.message;
  if (error && typeof error === "object") {
    const { code, message, details, hint } = error;
    return JSON.stringify({ code, message, details, hint });
  }
  return String(error ?? "Unknown hosted verification error");
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
    ["shared-definition.mentor", "senior", "allow"],
    ["shared-definition.non-mentor", "subject", "deny"],
    ["shared-definition.non-mentor", "peer", "deny"],
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
    ["rpc.assign-subject", "direct", "allow"],
    ["rpc.remove-completion.active-assignment", "subject", "allow"],
    ["rpc.end-assignment", "direct", "allow"],
    ["rpc.remove-completion.ended-assignment", "subject", "deny"],
    ["rpc.reconcile-attention", "direct", "allow"],
    ["attention.subject", "subject", "deny"],
    ["attention.subject", "direct", "allow"],
    ["attention.subject", "senior", "allow"],
    ["attention.subject", "peer", "deny"],
    ["attention.subject", "outsider", "deny"],
    ["attention.completion-invalidation", "subject", "allow"],
    ["attention.removal-reopening", "subject", "allow"],
    ["rpc.record-follow-up", "subject", "deny"],
    ["rpc.record-follow-up", "peer", "deny"],
    ["rpc.record-follow-up", "outsider", "deny"],
    ["preference.self", "subject", "allow"],
    ["preference.subject", "direct", "deny"],
    ["preference.subject", "senior", "deny"],
    ["preference.subject", "peer", "deny"],
    ["preference.subject", "outsider", "deny"],
    ["preference.subject-write", "direct", "deny"],
    ["profile.theme-self-write", "subject", "allow"],
    ["profile.theme-cross-write", "outsider", "deny"],
    ["profile.non-theme-self-write", "subject", "deny"],
    ["reminder.self-write", "subject", "allow"],
    ["reminder.cross-write", "direct", "deny"],
    ["rpc.record-daily-review", "direct", "allow"],
    ["rpc.record-daily-review", "senior", "allow"],
    ["rpc.record-daily-review", "subject", "deny"],
    ["rpc.record-daily-review", "peer", "deny"],
    ["rpc.record-daily-review", "outsider", "deny"],
    ["daily-review.direct", "direct", "allow"],
    ["daily-review.direct", "senior", "allow"],
    ["daily-review.direct", "subject", "deny"],
    ["daily-review.direct", "peer", "deny"],
    ["daily-review.direct", "outsider", "deny"],
    ["rpc.grant-assignment-excuse", "direct", "allow"],
    ["rpc.grant-assignment-excuse", "senior", "deny"],
    ["rpc.grant-assignment-excuse", "subject", "deny"],
    ["rpc.grant-assignment-excuse", "peer", "deny"],
    ["rpc.grant-assignment-excuse", "outsider", "deny"],
    ["rpc.grant-day-excuse", "direct", "allow"],
    ["excuse.subject", "subject", "allow"],
    ["excuse.subject", "direct", "allow"],
    ["excuse.subject", "senior", "allow"],
    ["excuse.subject", "peer", "deny"],
    ["excuse.subject", "outsider", "deny"],
    ["rpc.record-quantitative", "subject", "allow"],
    ["rpc.record-quantitative.yesterday", "subject", "allow"],
    ["rpc.record-quantitative.missing-amount", "subject", "deny"],
    ["completion.quantitative-today", "subject", "allow"],
    ["completion.quantitative-yesterday", "subject", "allow"],
    ["rpc.record-binary.amount", "subject", "deny"],
    ["definition.direct-insert", "direct", "deny"],
    ["rpc.create-definition", "direct", "allow"],
    ["rpc.create-definition", "subject", "deny"],
    ["rpc.create-definition", "peer", "deny"],
    ["rpc.create-definition", "outsider", "deny"],
    ["rpc.adopt-definition", "direct", "allow"],
    ["rpc.adopt-definition", "subject", "deny"],
    ["rpc.adopt-definition", "peer", "deny"],
    ["rpc.adopt-definition", "outsider", "deny"],
    ["rpc.reorder-assignments", "subject", "allow"],
    ["rpc.reorder-assignments", "direct", "deny"],
    ["rpc.assign-subject-intervention", "senior", "allow"],
    ["assignment.intervention-attribution", "senior", "allow"],
    ["assignment.intervention", "direct", "allow"],
    ["assignment.intervention", "senior", "allow"],
    ["assignment.intervention", "subject", "allow"],
    ["assignment.intervention", "peer", "deny"],
    ["assignment.intervention", "outsider", "deny"],
    ["assignment.void", "subject", "deny"],
    ["assignment.void", "direct", "deny"],
    ["assignment.void", "senior", "deny"],
    ["definition.void-link", "subject", "deny"],
    ["definition.void-link", "direct", "deny"],
    ["audit.direct-assignment", "direct", "allow"],
    ["audit.direct-assignment", "senior", "allow"],
    ["audit.direct-assignment", "subject", "deny"],
    ["audit.direct-assignment", "peer", "deny"],
    ["audit.direct-assignment", "outsider", "deny"],
    ["audit.intervention", "direct", "allow"],
    ["audit.intervention", "senior", "allow"],
    ["audit.intervention", "subject", "deny"],
    ["audit.intervention", "peer", "deny"],
    ["audit.intervention", "outsider", "deny"],
    ["audit.excuse", "direct", "allow"],
    ["audit.excuse", "senior", "allow"],
    ["audit.excuse", "subject", "deny"],
    ["audit.excuse", "peer", "deny"],
    ["audit.excuse", "outsider", "deny"],
    ["audit.correction", "direct", "allow"],
    ["audit.correction", "senior", "allow"],
    ["audit.correction", "subject", "deny"],
    ["audit.correction", "peer", "deny"],
    ["audit.correction", "outsider", "deny"],
    ...[
      "profiles", "mentorship_invitations", "mentorship_relationships", "habit_definitions",
      "habit_assignments", "assignment_preferences", "completions", "excused_days",
      "attention_items", "followups", "daily_reviews", "reminder_preferences", "audit_events",
    ].map((table) => [`table.${table}`, "anonymous", "deny"]),
    ...[
      "record_completion", "record_follow_up", "remove_completion", "end_habit_assignment",
      "assign_habit_definition", "grant_excused_day", "record_daily_review",
      "create_habit_definition", "adopt_habit_definition", "reorder_habit_assignments",
      "reconcile_my_attention", "claim_mentorship_invitation", "missed_assignment_ids",
      "handle_new_auth_user", "reject_mentorship_cycle",
    ].map((fn) => [`rpc.${fn}`, "anonymous", "deny"]),
  ].map(([resource, actor, expectation]) => ({ resource, actor, expectation }));
}

function publicClient(config) {
  return createClient(config.url, config.publishableKey, {
    auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
  });
}

function dateInTimezone(timezone, value = new Date()) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit" }).format(value);
}

function shiftIsoDate(date, days) {
  const value = new Date(`${date}T12:00:00Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}

async function rows(client, table, filters) {
  let query = client.from(table).select("*");
  for (const [column, value] of Object.entries(filters)) {
    query = value === null ? query.is(column, null) : query.eq(column, value);
  }
  const result = await query;
  if (result.error) throw result.error;
  return result.data ?? [];
}

async function completionAmountForAssignment(client, assignmentId) {
  const assignment = await client.from("habit_assignments")
    .select("definition_id,target")
    .eq("id", assignmentId)
    .single();
  if (assignment.error) throw assignment.error;
  const definition = await client.from("habit_definitions")
    .select("mode,default_target")
    .eq("id", assignment.data.definition_id)
    .single();
  if (definition.error) throw definition.error;
  return definition.data.mode === "quantitative"
    ? assignment.data.target ?? definition.data.default_target ?? 1
    : null;
}

async function main() {
  const config = loadVerificationConfig(process.env);
  const secrets = [config.publishableKey, ...Object.values(config.identities).flatMap(({ email, password }) => [email, password])];
  const clients = Object.fromEntries(ROLES.map((role) => [role, publicClient(config)]));
  const anonymous = publicClient(config);
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
    const result = await clients[actor].rpc(fn, args);
    const { error } = result;
    const passed = expectation === "allow" ? !error : Boolean(error);
    record(resource, actor, expectation, passed, passed ? "" : error?.message ?? "RPC unexpectedly succeeded");
    return result;
  };
  const checkUpdate = async (resource, actor, expectation, table, values, filters) => {
    let query = clients[actor].from(table).update(values).select("*");
    for (const [column, value] of Object.entries(filters)) query = query.eq(column, value);
    const result = await query;
    const changed = !result.error && (result.data?.length ?? 0) === 1;
    const passed = expectation === "allow" ? changed : !changed;
    record(resource, actor, expectation, passed, passed ? "" : result.error?.message ?? `expected ${expectation}, observed ${result.data?.length ?? 0} changed row(s)`);
    return result;
  };
  const checkInsertPrivilegeDenied = async (resource, actor, table, values) => {
    const result = await clients[actor].from(table).insert(values).select("*");
    const passed = result.error?.code === "42501";
    record(resource, actor, "deny", passed, passed ? "" : result.error?.message ?? "direct insert unexpectedly succeeded");
    return result;
  };
  const checkAnonymousTable = async (table) => {
    const result = await anonymous.from(table).select("*").limit(1);
    const passed = Boolean(result.error) || (result.data?.length ?? 0) === 0;
    record(`table.${table}`, "anonymous", "deny", passed, passed ? "" : "anonymous query returned protected data");
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

    const assignments = await clients.subject.from("habit_assignments").select("id,created_at").eq("student_id", users.subject.id).eq("status", "active");
    if (assignments.error || !assignments.data?.length) throw new Error("Seed precondition failed: subject needs an active Habit Assignment.");
    const firstMissedDate = shiftIsoDate(today, -2);
    const secondMissedDate = shiftIsoDate(today, -1);
    const [missedCompletions, missedExcuses] = await Promise.all([
      clients.subject.from("completions").select("assignment_id,completion_date").in("completion_date", [firstMissedDate, secondMissedDate]),
      clients.subject.from("excused_days").select("assignment_id,excuse_date").eq("student_id", users.subject.id).in("excuse_date", [firstMissedDate, secondMissedDate]),
    ]);
    if (missedCompletions.error || missedExcuses.error) throw new Error(`Attention seed precondition failed: ${missedCompletions.error?.message ?? missedExcuses.error?.message}`);
    const expectedContributors = assignments.data
      .filter((candidate) => dateInTimezone(subjectProfile.data.timezone, new Date(candidate.created_at)) <= firstMissedDate)
      .filter((candidate) => !missedCompletions.data.some((entry) => entry.assignment_id === candidate.id))
      .filter((candidate) => !missedExcuses.data.some((entry) => entry.assignment_id === null || entry.assignment_id === candidate.id))
      .sort((left, right) => left.created_at.localeCompare(right.created_at) || left.id.localeCompare(right.id))
      .map(({ id }) => id);
    if (!expectedContributors.length) throw new Error("Seed precondition failed: subject needs an active assignment missed on both of the previous two local dates.");

    const reconcileResult = await clients.direct.rpc("reconcile_my_attention", {});
    const attentionResult = await clients.direct.from("attention_items")
      .select("id,trigger_assignment_id,contributing_assignment_ids,state")
      .eq("student_id", users.subject.id)
      .eq("second_missed_date", secondMissedDate)
      .maybeSingle();
    const reconciled = !reconcileResult.error
      && !attentionResult.error
      && attentionResult.data?.state === "open"
      && attentionResult.data.trigger_assignment_id === expectedContributors[0]
      && JSON.stringify(attentionResult.data.contributing_assignment_ids) === JSON.stringify(expectedContributors);
    record("rpc.reconcile-attention", "direct", "allow", reconciled, reconciled ? "" : reconcileResult.error?.message ?? attentionResult.error?.message ?? "attention outcome did not match the deterministic missed-assignment seed");
    for (const [actor, expectation] of [["subject", "deny"], ["direct", "allow"], ["senior", "allow"], ["peer", "deny"], ["outsider", "deny"]]) {
      await checkRows("attention.subject", actor, expectation, "attention_items", { student_id: users.subject.id, second_missed_date: secondMissedDate });
    }

    let invalidationPassed = true;
    let invalidationDetail = "";
    let reopeningPassed = true;
    let reopeningDetail = "";
    const temporaryCompletionIds = [];
    try {
      for (let index = 0; index < expectedContributors.length; index += 1) {
        const assignmentId = expectedContributors[index];
        const amount = await completionAmountForAssignment(clients.subject, assignmentId);
        const completion = await clients.subject.rpc("record_completion", {
          p_assignment_id: assignmentId,
          p_date: secondMissedDate,
          p_amount: amount,
          p_note: cleanupMarker,
        });
        if (completion.error) {
          invalidationPassed = false;
          invalidationDetail = completion.error.message;
          break;
        }
        temporaryCompletionIds.push(assignmentId);

        const remaining = expectedContributors.slice(index + 1);
        const transition = await clients.direct.from("attention_items")
          .select("state,trigger_assignment_id,contributing_assignment_ids,invalidated_at")
          .eq("id", attentionResult.data.id)
          .single();
        const transitionMatches = !transition.error && (remaining.length
          ? transition.data.state === "open"
            && transition.data.trigger_assignment_id === remaining[0]
            && JSON.stringify(transition.data.contributing_assignment_ids) === JSON.stringify(remaining)
          : transition.data.state === "invalidated" && transition.data.invalidated_at !== null);
        if (!transitionMatches) {
          invalidationPassed = false;
          invalidationDetail = transition.error?.message ?? "attention did not shrink to the remaining contributors or invalidate after the final completion";
          break;
        }
      }
      if (temporaryCompletionIds.length !== expectedContributors.length) invalidationPassed = false;
    } finally {
      for (let index = temporaryCompletionIds.length - 1; index >= 0; index -= 1) {
        const assignmentId = temporaryCompletionIds[index];
        const removal = await clients.subject.rpc("remove_completion", {
          p_assignment_id: assignmentId,
          p_date: secondMissedDate,
        });
        if (removal.error) {
          reopeningPassed = false;
          reopeningDetail ||= removal.error.message;
          continue;
        }
        const expectedReopenedContributors = expectedContributors.slice(index);
        const reopened = await clients.direct.from("attention_items")
          .select("state,trigger_assignment_id,contributing_assignment_ids,invalidated_at")
          .eq("id", attentionResult.data.id)
          .single();
        const reopeningMatches = !reopened.error
          && reopened.data.state === "open"
          && reopened.data.invalidated_at === null
          && reopened.data.trigger_assignment_id === expectedReopenedContributors[0]
          && JSON.stringify(reopened.data.contributing_assignment_ids) === JSON.stringify(expectedReopenedContributors);
        if (!reopeningMatches) {
          reopeningPassed = false;
          reopeningDetail ||= reopened.error?.message ?? "completion removal did not reopen attention with the exact contributor set";
        }
      }
      if (temporaryCompletionIds.length !== expectedContributors.length) {
        reopeningPassed = false;
        reopeningDetail ||= "temporal invalidation setup did not reach every contributor";
      }
    }
    record("attention.completion-invalidation", "subject", "allow", invalidationPassed, invalidationPassed ? "" : invalidationDetail);
    record("attention.removal-reopening", "subject", "allow", reopeningPassed, reopeningPassed ? "" : reopeningDetail);

    for (const actor of ["subject", "peer", "outsider"]) {
      await checkRpc("rpc.record-follow-up", actor, "deny", "record_follow_up", { p_attention_id: attentionResult.data.id, p_note: cleanupMarker });
    }

    const subjectTheme = await clients.subject.from("profiles").select("theme,show_month_labels,show_day_labels").eq("id", users.subject.id).single();
    if (subjectTheme.error) throw new Error(`Theme precondition failed: ${subjectTheme.error.message}`);
    const alternateTheme = subjectTheme.data.theme === "dark" ? "light" : "dark";
    const alternateProfilePreferences = { theme: alternateTheme, show_month_labels: !subjectTheme.data.show_month_labels, show_day_labels: !subjectTheme.data.show_day_labels };
    await checkUpdate("profile.theme-self-write", "subject", "allow", "profiles", alternateProfilePreferences, { id: users.subject.id });
    const restoreTheme = await clients.subject.from("profiles").update({ theme: subjectTheme.data.theme, show_month_labels: subjectTheme.data.show_month_labels, show_day_labels: subjectTheme.data.show_day_labels }).eq("id", users.subject.id);
    if (restoreTheme.error) throw new Error(`Theme restore failed: ${restoreTheme.error.message}`);
    await checkUpdate("profile.theme-cross-write", "outsider", "deny", "profiles", alternateProfilePreferences, { id: users.subject.id });
    const alternateTimezone = subjectProfile.data.timezone === "UTC" ? "Europe/Stockholm" : "UTC";
    const timezoneWrite = await checkUpdate("profile.non-theme-self-write", "subject", "deny", "profiles", { timezone: alternateTimezone }, { id: users.subject.id });
    if (!timezoneWrite.error && timezoneWrite.data?.length) {
      await clients.subject.from("profiles").update({ timezone: subjectProfile.data.timezone }).eq("id", users.subject.id);
    }

    const reminder = await clients.subject.from("reminder_preferences").select("habit_reminders").eq("user_id", users.subject.id).single();
    if (reminder.error) throw new Error(`Reminder precondition failed: ${reminder.error.message}`);
    const changedHabitReminders = { ...reminder.data.habit_reminders, [assignments.data[0].id]: { enabled: true, time: "19:45" } };
    await checkUpdate("reminder.self-write", "subject", "allow", "reminder_preferences", { habit_reminders: changedHabitReminders }, { user_id: users.subject.id });
    const restoreReminder = await clients.subject.from("reminder_preferences").update({ habit_reminders: reminder.data.habit_reminders }).eq("user_id", users.subject.id);
    if (restoreReminder.error) throw new Error(`Reminder restore failed: ${restoreReminder.error.message}`);
    await checkUpdate("reminder.cross-write", "direct", "deny", "reminder_preferences", { habit_reminders: changedHabitReminders }, { user_id: users.subject.id });

    await checkRpc("rpc.record-daily-review", "direct", "allow", "record_daily_review", {});
    await checkRpc("rpc.record-daily-review", "senior", "allow", "record_daily_review", {});
    for (const actor of ["subject", "peer", "outsider"]) {
      await checkRpc("rpc.record-daily-review", actor, "deny", "record_daily_review", {});
    }
    for (const [actor, expectation] of [["direct", "allow"], ["senior", "allow"], ["subject", "deny"], ["peer", "deny"], ["outsider", "deny"]]) {
      await checkRows("daily-review.direct", actor, expectation, "daily_reviews", { mentor_id: users.direct.id, review_date: today });
    }

    const directProfile = await clients.direct.from("profiles").select("display_name").eq("id", users.direct.id).single();
    if (directProfile.error) throw new Error(`Direct Mentor profile precondition failed: ${directProfile.error.message}`);
    const createDefinitionArgs = {
      p_name: cleanupMarker,
      p_description: "",
      p_guide: "",
      p_why_it_matters: "",
      p_completion_definition: "Hosted verification artifact",
      p_practical_tips: "",
      p_mode: "binary",
      p_default_target: null,
      p_visibility: "shared",
    };
    await checkInsertPrivilegeDenied("definition.direct-insert", "direct", "habit_definitions", {
      author_id: users.direct.id,
      creator_name: "Forged attribution",
      name: `${cleanupMarker}:forged`,
      completion_definition: "This row must not be inserted directly",
      mode: "binary",
      visibility: "shared",
    });
    const artifactDefinition = await clients.direct.rpc("create_habit_definition", createDefinitionArgs);
    const artifactDefinitionCreated = !artifactDefinition.error && typeof artifactDefinition.data === "string";
    record("rpc.create-definition", "direct", "allow", artifactDefinitionCreated, artifactDefinition.error?.message ?? "");
    if (!artifactDefinitionCreated) throw new Error(`Verification artifact definition failed: ${artifactDefinition.error?.message ?? "no definition ID"}`);
    for (const [actor, expectation, resource] of [["senior", "allow", "shared-definition.mentor"], ["subject", "deny", "shared-definition.non-mentor"], ["peer", "deny", "shared-definition.non-mentor"], ["outsider", "deny", "shared-definition.cross-tree"]]) {
      await checkRows(resource, actor, expectation, "habit_definitions", { id: artifactDefinition.data });
    }
    for (const actor of ["subject", "peer", "outsider"]) {
      await checkRpc("rpc.create-definition", actor, "deny", "create_habit_definition", createDefinitionArgs);
    }
    const adoptedDefinition = await clients.direct.rpc("adopt_habit_definition", { p_source_definition_id: artifactDefinition.data });
    const adoptionCreated = !adoptedDefinition.error && typeof adoptedDefinition.data === "string";
    record("rpc.adopt-definition", "direct", "allow", adoptionCreated, adoptedDefinition.error?.message ?? "");
    if (!adoptionCreated) throw new Error(`Verification adoption failed: ${adoptedDefinition.error?.message ?? "no definition ID"}`);
    for (const actor of ["subject", "peer", "outsider"]) {
      await checkRpc("rpc.adopt-definition", actor, "deny", "adopt_habit_definition", { p_source_definition_id: artifactDefinition.data });
    }
    const assignmentResult = await clients.direct.rpc("assign_habit_definition", { p_definition_id: artifactDefinition.data, p_student_id: users.subject.id, p_target: null });
    const assignmentId = assignmentResult.data;
    const assignmentCreated = !assignmentResult.error && typeof assignmentId === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(assignmentId);
    record("rpc.assign-subject", "direct", "allow", assignmentCreated, assignmentCreated ? "" : assignmentResult.error?.message ?? "RPC did not return a canonical assignment UUID");
    if (!assignmentCreated) throw new Error("Verification artifact assignment failed.");

    for (const [actor, expectation] of [["subject", "allow"], ["direct", "allow"], ["senior", "allow"], ["peer", "deny"], ["outsider", "deny"]]) {
      await checkRows("assignment.subject", actor, expectation, "habit_assignments", { id: assignmentId });
    }

    const preference = await clients.subject.from("assignment_preferences").upsert({
      assignment_id: assignmentId,
      student_id: users.subject.id,
      icon: "book",
      accent: "#55a7ff",
      sort_order: 99,
    }).select("assignment_id").single();
    record("preference.self", "subject", "allow", !preference.error && preference.data?.assignment_id === assignmentId, preference.error?.message ?? "");
    for (const actor of ["direct", "senior", "peer", "outsider"]) {
      await checkRows("preference.subject", actor, "deny", "assignment_preferences", { assignment_id: assignmentId });
    }
    await checkUpdate("preference.subject-write", "direct", "deny", "assignment_preferences", { sort_order: 100 }, { assignment_id: assignmentId });

    for (const [actor, expectation] of [["direct", "allow"], ["senior", "allow"], ["subject", "deny"], ["peer", "deny"], ["outsider", "deny"]]) {
      await checkRows("audit.direct-assignment", actor, expectation, "audit_events", { entity_id: assignmentId, event_type: "habit_assigned" });
    }

    const assignmentExcuseArgs = { p_student_id: users.subject.id, p_assignment_id: assignmentId, p_date: today, p_note: cleanupMarker };
    const assignmentExcuse = await checkRpc("rpc.grant-assignment-excuse", "direct", "allow", "grant_excused_day", assignmentExcuseArgs);
    for (const actor of ["senior", "subject", "peer", "outsider"]) {
      await checkRpc("rpc.grant-assignment-excuse", actor, "deny", "grant_excused_day", assignmentExcuseArgs);
    }
    await checkRpc("rpc.grant-day-excuse", "direct", "allow", "grant_excused_day", {
      ...assignmentExcuseArgs,
      p_assignment_id: null,
      p_date: shiftIsoDate(today, 30),
    });
    for (const [actor, expectation] of [["subject", "allow"], ["direct", "allow"], ["senior", "allow"], ["peer", "deny"], ["outsider", "deny"]]) {
      await checkRows("excuse.subject", actor, expectation, "excused_days", { id: assignmentExcuse.data });
    }
    for (const [actor, expectation] of [["direct", "allow"], ["senior", "allow"], ["subject", "deny"], ["peer", "deny"], ["outsider", "deny"]]) {
      await checkRows("audit.excuse", actor, expectation, "audit_events", { entity_id: assignmentExcuse.data, event_type: "excused_day_granted" });
    }

    const completionArgs = { p_assignment_id: assignmentId, p_date: today, p_amount: null, p_note: cleanupMarker };
    await checkRpc("rpc.record-binary.amount", "subject", "deny", "record_completion", { ...completionArgs, p_amount: 1 });
    await checkRpc("rpc.record-completion", "subject", "allow", "record_completion", completionArgs);
    for (const actor of ["direct", "senior", "peer", "outsider"]) {
      await checkRpc("rpc.record-completion", actor, "deny", "record_completion", completionArgs);
    }
    await checkRpc("rpc.record-completion.locked-date", "subject", "deny", "record_completion", { ...completionArgs, p_date: shiftIsoDate(today, -2) });

    for (const [actor, expectation] of [["subject", "allow"], ["direct", "allow"], ["senior", "allow"], ["peer", "deny"], ["outsider", "deny"]]) {
      await checkRows("completion.subject", actor, expectation, "completions", { assignment_id: assignmentId, completion_date: today });
    }
    for (const actor of ["peer", "outsider"]) {
      await checkRpc("rpc.assign-subject", actor, "deny", "assign_habit_definition", { p_definition_id: artifactDefinition.data, p_student_id: users.subject.id, p_target: null });
    }
    await checkRpc("rpc.remove-completion.active-assignment", "subject", "allow", "remove_completion", { p_assignment_id: assignmentId, p_date: today });
    const removedCompletion = await rows(clients.subject, "completions", { assignment_id: assignmentId, completion_date: today });
    if (removedCompletion.length) throw new Error("Active-assignment completion removal did not delete the verification artifact.");
    const restoreCompletion = await clients.subject.rpc("record_completion", completionArgs);
    if (restoreCompletion.error) throw new Error(`Verification artifact completion restore failed: ${restoreCompletion.error.message}`);

    const quantitativeDefinition = await clients.direct.rpc("create_habit_definition", {
      ...createDefinitionArgs,
      p_name: `${cleanupMarker}:quantitative`,
      p_completion_definition: "Hosted quantitative verification artifact",
      p_mode: "quantitative",
      p_default_target: 5,
      p_visibility: "private",
    });
    if (quantitativeDefinition.error || typeof quantitativeDefinition.data !== "string") throw new Error(`Quantitative definition failed: ${quantitativeDefinition.error?.message ?? "no definition ID"}`);
    const quantitativeAssignment = await clients.direct.rpc("assign_habit_definition", {
      p_definition_id: quantitativeDefinition.data,
      p_student_id: users.subject.id,
      p_target: 5,
    });
    if (quantitativeAssignment.error || typeof quantitativeAssignment.data !== "string") {
      throw new Error(`Quantitative assignment failed: ${quantitativeAssignment.error?.message ?? "no assignment ID"}`);
    }
    await checkRpc("rpc.record-quantitative", "subject", "allow", "record_completion", {
      p_assignment_id: quantitativeAssignment.data,
      p_date: today,
      p_amount: 3,
      p_note: cleanupMarker,
    });
    await checkRpc("rpc.record-quantitative.yesterday", "subject", "allow", "record_completion", {
      p_assignment_id: quantitativeAssignment.data,
      p_date: shiftIsoDate(today, -1),
      p_amount: 2,
      p_note: cleanupMarker,
    });
    await checkRpc("rpc.record-quantitative.missing-amount", "subject", "deny", "record_completion", {
      p_assignment_id: quantitativeAssignment.data,
      p_date: today,
      p_amount: null,
      p_note: cleanupMarker,
    });
    for (const [resource, date, amount] of [
      ["completion.quantitative-today", today, 3],
      ["completion.quantitative-yesterday", shiftIsoDate(today, -1), 2],
    ]) {
      const persisted = await clients.subject.from("completions")
        .select("amount,retrospective")
        .eq("assignment_id", quantitativeAssignment.data)
        .eq("completion_date", date)
        .single();
      const expectedRetrospective = date !== today;
      const passed = !persisted.error
        && Number(persisted.data?.amount) === amount
        && persisted.data?.retrospective === expectedRetrospective;
      record(resource, "subject", "allow", passed, persisted.error?.message ?? (passed ? "" : "persisted quantitative completion did not match amount/retrospective semantics"));
    }
    const activeAssignmentsForReorder = await clients.subject.from("habit_assignments")
      .select("id")
      .eq("student_id", users.subject.id)
      .eq("status", "active")
      .order("created_at", { ascending: false });
    if (activeAssignmentsForReorder.error || !activeAssignmentsForReorder.data?.length) {
      throw new Error(`Assignment reorder precondition failed: ${activeAssignmentsForReorder.error?.message ?? "no active assignments"}`);
    }
    const reorderedAssignmentIds = activeAssignmentsForReorder.data.map((item) => item.id);
    await checkRpc("rpc.reorder-assignments", "subject", "allow", "reorder_habit_assignments", { p_assignment_ids: reorderedAssignmentIds });
    await checkRpc("rpc.reorder-assignments", "direct", "deny", "reorder_habit_assignments", { p_assignment_ids: reorderedAssignmentIds });

    const seniorProfile = await clients.senior.from("profiles").select("display_name").eq("id", users.senior.id).single();
    if (seniorProfile.error) throw new Error(`Senior profile precondition failed: ${seniorProfile.error.message}`);
    const interventionDefinition = await clients.senior.rpc("create_habit_definition", {
      ...createDefinitionArgs,
      p_name: `${cleanupMarker}:intervention`,
      p_completion_definition: "Hosted intervention verification artifact",
      p_visibility: "private",
    });
    if (interventionDefinition.error || typeof interventionDefinition.data !== "string") throw new Error(`Intervention definition failed: ${interventionDefinition.error?.message ?? "no definition ID"}`);
    const intervention = await clients.senior.rpc("assign_habit_definition", {
      p_definition_id: interventionDefinition.data,
      p_student_id: users.subject.id,
      p_target: null,
    });
    const interventionAllowed = !intervention.error && typeof intervention.data === "string";
    record("rpc.assign-subject-intervention", "senior", "allow", interventionAllowed, intervention.error?.message ?? "");
    if (!interventionAllowed) throw new Error("Senior intervention assignment failed.");
    const interventionAttribution = await clients.senior.from("habit_assignments")
      .select("assigned_by,intervention_for_mentor_id")
      .eq("id", intervention.data)
      .single();
    const attributionPassed = !interventionAttribution.error
      && interventionAttribution.data?.assigned_by === users.senior.id
      && interventionAttribution.data?.intervention_for_mentor_id === users.direct.id;
    record("assignment.intervention-attribution", "senior", "allow", attributionPassed, interventionAttribution.error?.message ?? (attributionPassed ? "" : "intervention attribution did not identify the senior and responsible mentor"));
    for (const [actor, expectation] of [["subject", "allow"], ["direct", "allow"], ["senior", "allow"], ["peer", "deny"], ["outsider", "deny"]]) {
      await checkRows("assignment.intervention", actor, expectation, "habit_assignments", { id: intervention.data });
    }
    for (const [actor, expectation] of [["direct", "allow"], ["senior", "allow"], ["subject", "deny"], ["peer", "deny"], ["outsider", "deny"]]) {
      await checkRows("audit.intervention", actor, expectation, "audit_events", { entity_id: intervention.data, event_type: "senior_assignment_intervention" });
    }
    const endIntervention = await clients.direct.rpc("end_habit_assignment", { p_assignment_id: intervention.data, p_reason: cleanupMarker });
    if (endIntervention.error || endIntervention.data !== "void") throw new Error(`Intervention correction failed: ${endIntervention.error?.message ?? "expected void"}`);
    for (const actor of ["subject", "direct", "senior"]) {
      await checkRows("assignment.void", actor, "deny", "habit_assignments", { id: intervention.data });
    }
    for (const actor of ["subject", "direct"]) {
      await checkRows("definition.void-link", actor, "deny", "habit_definitions", { id: interventionDefinition.data });
    }

    const endResult = await clients.direct.rpc("end_habit_assignment", { p_assignment_id: assignmentId, p_reason: cleanupMarker });
    const assignmentEnded = !endResult.error && endResult.data === "ended";
    record("rpc.end-assignment", "direct", "allow", assignmentEnded, assignmentEnded ? "" : endResult.error?.message ?? "RPC did not preserve the completed assignment as ended");
    await checkRpc("rpc.remove-completion.ended-assignment", "subject", "deny", "remove_completion", { p_assignment_id: assignmentId, p_date: today });
    for (const [actor, expectation] of [["direct", "allow"], ["senior", "allow"], ["subject", "deny"], ["peer", "deny"], ["outsider", "deny"]]) {
      await checkRows("audit.correction", actor, expectation, "audit_events", { entity_id: assignmentId, event_type: "assignment_corrected" });
    }

    const protectedTables = [
      "profiles", "mentorship_invitations", "mentorship_relationships", "habit_definitions",
      "habit_assignments", "assignment_preferences", "completions", "excused_days",
      "attention_items", "followups", "daily_reviews", "reminder_preferences", "audit_events",
    ];
    for (const table of protectedTables) await checkAnonymousTable(table);
    const anonymousRpcs = [
      ["record_completion", { p_assignment_id: assignmentId, p_date: today, p_amount: null, p_note: "" }],
      ["record_follow_up", { p_attention_id: attentionResult.data.id, p_note: "" }],
      ["remove_completion", { p_assignment_id: assignmentId, p_date: today }],
      ["end_habit_assignment", { p_assignment_id: assignmentId, p_reason: "" }],
      ["assign_habit_definition", { p_definition_id: artifactDefinition.data, p_student_id: users.subject.id, p_target: null }],
      ["grant_excused_day", { p_student_id: users.subject.id, p_assignment_id: assignmentId, p_date: today, p_note: "" }],
      ["create_habit_definition", createDefinitionArgs],
      ["adopt_habit_definition", { p_source_definition_id: artifactDefinition.data }],
      ["reorder_habit_assignments", { p_assignment_ids: [assignmentId] }],
      ["record_daily_review", {}],
      ["reconcile_my_attention", {}],
      ["claim_mentorship_invitation", { p_token_hash: "0".repeat(64), p_user_id: users.subject.id }],
      ["missed_assignment_ids", { p_student_id: users.subject.id, p_first_date: firstMissedDate, p_second_date: secondMissedDate }],
      ["handle_new_auth_user", {}],
      ["reject_mentorship_cycle", {}],
    ];
    for (const [fn, args] of anonymousRpcs) {
      const result = await anonymous.rpc(fn, args);
      const privilegeDenied = result.error?.code === "42501" || result.error?.code === "PGRST202";
      record(
        `rpc.${fn}`,
        "anonymous",
        "deny",
        privilegeDenied,
        privilegeDenied ? "" : result.error ? `anonymous reached RPC body (${result.error.code ?? "unknown error code"})` : "anonymous RPC unexpectedly succeeded",
      );
    }

    const matrixKey = ({ resource, actor, expectation }) => `${resource}\u0000${actor}\u0000${expectation}`;
    const plannedKeys = plannedMatrix().map(matrixKey).sort();
    const observedKeys = results.map(matrixKey).sort();
    if (JSON.stringify(observedKeys) !== JSON.stringify(plannedKeys)) {
      throw new Error("Hosted verification implementation does not match its declared matrix.");
    }

    const failed = results.filter(({ status }) => status === "FAIL").length;
    const projectRef = new URL(config.url).hostname.split(".")[0];
    console.log(JSON.stringify({ gate: failed ? "FAIL" : "PASS", project_ref: projectRef, cleanup_marker: cleanupMarker, passed: results.length - failed, failed, results }, null, 2));
    if (failed) process.exitCode = 1;
  } catch (error) {
    console.error(redact(errorSummary(error), secrets));
    console.error(`Cleanup marker (marker-bearing artifacts may have been written): ${cleanupMarker}`);
    process.exitCode = 1;
  } finally {
    await Promise.allSettled([...Object.values(clients), anonymous].map((client) => client.auth.signOut({ scope: "local" })));
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try { await main(); }
  catch (error) {
    console.error(redact(error instanceof Error ? error.message : error));
    process.exitCode = 1;
  }
}
