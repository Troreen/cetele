"use server";

import { createHash, randomBytes } from "node:crypto";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient, requireUser } from "@/lib/supabase/server";

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const INVITATION_LIFETIME_MS = 72 * 60 * 60 * 1000;

function applicationOrigin() {
  const origin = process.env.CETELE_APP_ORIGIN;
  if (!origin) throw new Error("Davet bağlantısı oluşturulamadı.");
  const appOrigin = new URL(origin);
  const loopback = ["localhost", "127.0.0.1", "[::1]"].includes(appOrigin.hostname);
  if ((appOrigin.protocol !== "https:" && !(appOrigin.protocol === "http:" && loopback))
    || appOrigin.username || appOrigin.password
    || appOrigin.pathname !== "/" || appOrigin.search || appOrigin.hash) {
    throw new Error("Davet bağlantısı oluşturulamadı.");
  }
  return appOrigin;
}

function invitationTokenHash(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

async function requireActiveUser() {
  const context = await requireUser();
  const { data, error } = await context.supabase.from("profiles").select("id,account_state").eq("id", context.user.id).maybeSingle();
  if (error || data?.account_state !== "active") throw new Error("Bu işlem için etkin bir hesap gerekiyor.");
  return context;
}

export async function signOut() {
  if (process.env.NEXT_PUBLIC_CETELE_DATA_ADAPTER === "supabase") {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.signOut();
    if (error) throw new Error(error.message);
  }
  redirect("/sign-in");
}

export async function recordCompletion(input: unknown) {
  const parsed = z.object({ assignmentId: z.string().uuid(), date: isoDate, amount: z.number().int().positive().nullable(), note: z.string().max(500).default("") }).parse(input);
  const { supabase } = await requireUser();
  const { error } = await supabase.rpc("record_completion", { p_assignment_id: parsed.assignmentId, p_date: parsed.date, p_amount: parsed.amount, p_note: parsed.note });
  if (error) throw new Error(error.message);
}

export async function removeCompletion(input: unknown) {
  const parsed = z.object({ assignmentId: z.string().uuid(), date: isoDate }).parse(input);
  const { supabase } = await requireUser();
  const { error } = await supabase.rpc("remove_completion", { p_assignment_id: parsed.assignmentId, p_date: parsed.date });
  if (error) throw new Error(error.message);
}

export async function markDailyReview(input: unknown) {
  z.object({ date: isoDate }).parse(input);
  const { supabase } = await requireUser();
  const { error } = await supabase.rpc("record_daily_review");
  if (error) throw new Error(error.message);
}

export async function recordFollowUp(input: unknown) {
  const { attentionId, note } = z.object({ attentionId: z.string().uuid(), note: z.string().max(1000).default("") }).parse(input);
  const { supabase } = await requireUser();
  const { error } = await supabase.rpc("record_follow_up", { p_attention_id: attentionId, p_note: note });
  if (error) throw new Error(error.message);
}

export async function createManualInvitation(input: unknown) {
  z.object({}).parse(input);
  const { user } = await requireActiveUser();
  const admin = createSupabaseAdminClient();
  const appOrigin = applicationOrigin();
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + INVITATION_LIFETIME_MS).toISOString();
  const { error } = await admin.from("mentorship_invitations").insert({
    mentor_id: user.id,
    token_hash: invitationTokenHash(token),
    expires_at: expiresAt,
  });
  if (error) throw new Error("Davet bağlantısı oluşturulamadı.");

  const url = new URL("/invite/accept", appOrigin);
  url.hash = `token=${encodeURIComponent(token)}`;
  return { url: url.toString(), expiresAt };
}

export async function revokeManualInvitation(input: unknown) {
  const { invitationId } = z.object({ invitationId: z.string().uuid() }).parse(input);
  const { user } = await requireActiveUser();
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("mentorship_invitations")
    .update({ revoked_at: new Date().toISOString() })
    .eq("id", invitationId)
    .eq("mentor_id", user.id)
    .is("accepted_at", null)
    .is("revoked_at", null)
    .select("id")
    .maybeSingle();
  if (error || !data) throw new Error("Bekleyen davet iptal edilemedi. Lütfen tekrar dene.");
}

export async function signInWithPassword(input: unknown) {
  const { email, password } = z.object({ email: z.email(), password: z.string().min(8) }).parse(input);
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw new Error("E-posta veya parola doğrulanamadı.");
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return { destination: "/sign-in" } as const;
  const { data: profile } = await supabase.from("profiles").select("onboarding_completed_at,account_state").eq("id", auth.user.id).maybeSingle();
  if (!profile?.onboarding_completed_at) return { destination: "/account/setup" } as const;
  if (profile.account_state === "closure_requested") return { destination: "/account/recover-deletion" } as const;
  return { destination: profile.account_state === "active" ? "/today" : "/sign-in" } as const;
}

const definitionInput = z.object({
  id: z.string(), name: z.string().min(1).max(100), description: z.string().max(240), guide: z.string().max(4000), why: z.string().max(1000), completionDefinition: z.string().min(1).max(1000), tips: z.string().max(1000), mode: z.enum(["binary", "quantitative"]), defaultTarget: z.number().positive().nullable(), visibility: z.enum(["private", "shared"]),
}).refine(({ mode, defaultTarget }) => mode === "quantitative" || defaultTarget === null, {
  message: "İkili alışkanlık hedefi boş olmalı.",
  path: ["defaultTarget"],
});

async function requireHabitAuthorContext() {
  const { supabase, user } = await requireUser();
  const [responsibilityResult, profileResult] = await Promise.all([
    supabase.from("mentorship_relationships").select("student_id").eq("mentor_id", user.id).eq("status", "active").limit(1).maybeSingle(),
    supabase.from("profiles").select("alias").eq("id", user.id).single(),
  ]);
  if (responsibilityResult.error) throw new Error(responsibilityResult.error.message);
  if (!responsibilityResult.data) throw new Error("Alışkanlık yalnızca etkin doğrudan öğrencisi olan mentorlar tarafından yönetilebilir.");
  if (profileResult.error || !profileResult.data) throw new Error(profileResult.error?.message ?? "Mentor profili bulunamadı.");
  return { supabase, creatorName: profileResult.data.alias };
}

export async function createHabitDefinition(input: unknown) {
  const parsed = definitionInput.parse(input);
  const { supabase } = await requireHabitAuthorContext();
  const { error } = await supabase.rpc("create_habit_definition", {
    p_name: parsed.name,
    p_description: parsed.description,
    p_guide: parsed.guide,
    p_why_it_matters: parsed.why,
    p_completion_definition: parsed.completionDefinition,
    p_practical_tips: parsed.tips,
    p_mode: parsed.mode,
    p_default_target: parsed.defaultTarget,
    p_visibility: parsed.visibility,
  });
  if (error) throw new Error(error.message);
}

export async function adoptHabitDefinition(input: unknown) {
  const { definitionId } = z.object({ definitionId: z.string().uuid() }).parse(input);
  const { supabase } = await requireHabitAuthorContext();
  const { error } = await supabase.rpc("adopt_habit_definition", { p_source_definition_id: definitionId });
  if (error) throw new Error(error.message);
}

export async function reorderHabitAssignments(input: unknown) {
  const { orderedIds } = z.object({
    orderedIds: z.array(z.string().uuid()).min(1).max(200)
      .refine((ids) => new Set(ids).size === ids.length, "Atama sırası yinelenen kimlik içeremez."),
  }).parse(input);
  const { supabase } = await requireUser();
  const { error } = await supabase.rpc("reorder_habit_assignments", { p_assignment_ids: orderedIds });
  if (error) throw new Error(error.message);
}

export async function assignHabitDefinition(input: unknown) {
  const parsed = z.object({ definitionId: z.string().uuid(), studentId: z.string().uuid(), target: z.number().positive().nullable() }).parse(input);
  const { supabase } = await requireUser();
  const { error } = await supabase.rpc("assign_habit_definition", { p_definition_id: parsed.definitionId, p_student_id: parsed.studentId, p_target: parsed.target });
  if (error) throw new Error(error.message);
}

export async function customizeHabitAssignment(input: unknown) {
  const parsed = z.object({ assignmentId: z.string().uuid(), accent: z.string().regex(/^#[0-9A-Fa-f]{6}$/), icon: z.enum(["book", "heart", "walk", "focus"]), order: z.number().int() }).parse(input);
  const { supabase, user } = await requireUser();
  const { error } = await supabase.from("assignment_preferences").upsert({ assignment_id: parsed.assignmentId, student_id: user.id, accent: parsed.accent, icon: parsed.icon, sort_order: parsed.order });
  if (error) throw new Error(error.message);
}

export async function grantExcusedDay(input: unknown) {
  const parsed = z.object({ studentId: z.string().uuid(), assignmentId: z.string().uuid().nullable(), date: isoDate, note: z.string().max(500) }).parse(input);
  const { supabase } = await requireUser();
  const { error } = await supabase.rpc("grant_excused_day", { p_student_id: parsed.studentId, p_assignment_id: parsed.assignmentId, p_date: parsed.date, p_note: parsed.note });
  if (error) throw new Error(error.message);
}

export async function saveReminderPreferences(input: unknown) {
  const parsed = z.object({ habits: z.record(z.string(), z.object({ enabled: z.boolean(), time: z.string().regex(/^\d{2}:\d{2}$/) })), mentorEnabled: z.boolean(), mentorTime: z.string().regex(/^\d{2}:\d{2}$/) }).parse(input);
  const { supabase, user } = await requireUser();
  const { error } = await supabase.from("reminder_preferences").upsert({ user_id: user.id, habit_reminders: parsed.habits, mentor_enabled: parsed.mentorEnabled, mentor_time: parsed.mentorTime });
  if (error) throw new Error(error.message);
}

export async function saveTheme(input: unknown) {
  const { theme } = z.object({ theme: z.enum(["dark", "light"]) }).parse(input);
  const { supabase, user } = await requireUser();
  const { error } = await supabase.from("profiles").update({ theme }).eq("id", user.id);
  if (error) throw new Error(error.message);
}

export async function saveViewPreferences(input: unknown) {
  const parsed = z.object({ showMonthLabels: z.boolean(), showDayLabels: z.boolean() }).parse(input);
  const { supabase, user } = await requireUser();
  const { error } = await supabase.from("profiles").update({ show_month_labels: parsed.showMonthLabels, show_day_labels: parsed.showDayLabels }).eq("id", user.id);
  if (error) throw new Error(error.message);
}

export async function endHabitAssignment(input: unknown) {
  const { assignmentId, reason } = z.object({ assignmentId: z.string().uuid(), reason: z.string().min(3).max(500) }).parse(input);
  const { supabase } = await requireUser();
  const { error } = await supabase.rpc("end_habit_assignment", { p_assignment_id: assignmentId, p_reason: reason });
  if (error) throw new Error(error.message);
}
