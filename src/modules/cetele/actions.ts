"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient, requireUser } from "@/lib/supabase/server";

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

export async function signOut() {
  if (process.env.NEXT_PUBLIC_CETELE_DATA_ADAPTER === "supabase") {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.signOut();
    if (error) throw new Error(error.message);
  }
  redirect("/sign-in");
}

export async function recordCompletion(input: unknown) {
  const parsed = z.object({ assignmentId: z.string().uuid(), date: isoDate, amount: z.number().positive().nullable(), note: z.string().max(500).default("") }).parse(input);
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

export async function inviteDirectStudent(input: unknown) {
  const parsed = z.object({ email: z.email(), name: z.string().trim().min(2).max(100) }).parse(input);
  const email = parsed.email.trim().toLowerCase();
  const name = parsed.name;
  const { user } = await requireUser();
  const admin = createSupabaseAdminClient();
  const origin = process.env.CETELE_APP_ORIGIN;
  if (!origin) throw new Error("CETELE_APP_ORIGIN sunucu ayarı eksik.");
  const appOrigin = new URL(origin);
  if (!["http:", "https:"].includes(appOrigin.protocol) || appOrigin.pathname !== "/" || appOrigin.search || appOrigin.hash) throw new Error("CETELE_APP_ORIGIN must contain only an HTTP(S) application origin.");
  const { data: invitation, error: createError } = await admin.from("mentorship_invitations").insert({ mentor_id: user.id, invitee_email: email, invitee_name: name }).select("id").single();
  if (createError) throw new Error(createError.message);
  const redirectTo = new URL("/auth/confirm", appOrigin);
  redirectTo.searchParams.set("invitation", invitation.id);
  const { data, error } = await admin.auth.admin.inviteUserByEmail(email, { redirectTo: redirectTo.toString(), data: { name, inviting_mentor_id: user.id, invitation_id: invitation.id } });
  if (error || !data.user) await admin.from("mentorship_invitations").delete().eq("id", invitation.id).eq("mentor_id", user.id);
  if (error || !data.user) throw new Error(error?.message ?? "Davet oluşturulamadı.");
  const { error: invitationError } = await admin.from("mentorship_invitations").update({ invited_user_id: data.user.id }).eq("id", invitation.id).eq("mentor_id", user.id).select("id").single();
  if (invitationError) throw new Error(invitationError.message);
}

export async function signInWithPassword(input: unknown) {
  const { email, password } = z.object({ email: z.email(), password: z.string().min(8) }).parse(input);
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw new Error(error.message);
}

export async function setAccountPassword(input: unknown) {
  const { password } = z.object({ password: z.string().min(8) }).parse(input);
  const { supabase } = await requireUser();
  const { error } = await supabase.auth.updateUser({ password });
  if (error) throw new Error(error.message);
}

export async function acceptMentorshipInvitation(input: unknown) {
  const { invitationId } = z.object({ invitationId: z.string().uuid() }).parse(input);
  const { supabase } = await requireUser();
  const { error } = await supabase.rpc("accept_mentorship_invitation", { p_invitation_id: invitationId });
  if (error) throw new Error(error.message);
}

const definitionInput = z.object({
  id: z.string(), name: z.string().min(1).max(100), description: z.string().max(240), guide: z.string().max(4000), why: z.string().max(1000), completionDefinition: z.string().min(1).max(1000), tips: z.string().max(1000), mode: z.enum(["binary", "quantitative"]), defaultTarget: z.number().positive().nullable(), visibility: z.enum(["private", "shared"]),
});

export async function createHabitDefinition(input: unknown) {
  const parsed = definitionInput.parse(input);
  const { supabase, user } = await requireUser();
  const { data: responsibility, error: responsibilityError } = await supabase.from("mentorship_relationships").select("student_id").eq("mentor_id", user.id).eq("status", "active").limit(1).maybeSingle();
  if (responsibilityError) throw new Error(responsibilityError.message);
  if (!responsibility) throw new Error("Alışkanlık yalnızca etkin doğrudan öğrencisi olan mentorlar tarafından oluşturulabilir.");
  const { data: profile, error: profileError } = await supabase.from("profiles").select("display_name").eq("id", user.id).single();
  if (profileError) throw new Error(profileError.message);
  const { error } = await supabase.from("habit_definitions").insert({ author_id: user.id, creator_name: profile.display_name, name: parsed.name, description: parsed.description, guide: parsed.guide, why_it_matters: parsed.why, completion_definition: parsed.completionDefinition, practical_tips: parsed.tips, mode: parsed.mode, default_target: parsed.defaultTarget, visibility: parsed.visibility });
  if (error) throw new Error(error.message);
}

export async function adoptHabitDefinition(input: unknown) {
  const { definitionId } = z.object({ definitionId: z.string().uuid() }).parse(input);
  const { supabase, user } = await requireUser();
  const { data: responsibility, error: responsibilityError } = await supabase.from("mentorship_relationships").select("student_id").eq("mentor_id", user.id).eq("status", "active").limit(1).maybeSingle();
  if (responsibilityError) throw new Error(responsibilityError.message);
  if (!responsibility) throw new Error("Alışkanlık yalnızca etkin doğrudan öğrencisi olan mentorlar tarafından kopyalanabilir.");
  const { data: source, error: readError } = await supabase.from("habit_definitions").select("*").eq("id", definitionId).eq("visibility", "shared").single();
  if (readError) throw new Error(readError.message);
  const { data: profile, error: profileError } = await supabase.from("profiles").select("display_name").eq("id", user.id).single();
  if (profileError) throw new Error(profileError.message);
  const { error } = await supabase.from("habit_definitions").insert({ author_id: user.id, creator_name: profile.display_name, name: source.name, description: source.description, guide: source.guide, why_it_matters: source.why_it_matters, completion_definition: source.completion_definition, practical_tips: source.practical_tips, resources: source.resources, mode: source.mode, default_target: source.default_target, visibility: "private", source_definition_id: source.id, source_creator_id: source.author_id, source_creator_name: source.creator_name });
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
  const parsed = z.object({ studentEnabled: z.boolean(), studentTime: z.string().regex(/^\d{2}:\d{2}$/), mentorEnabled: z.boolean(), mentorTime: z.string().regex(/^\d{2}:\d{2}$/) }).parse(input);
  const { supabase, user } = await requireUser();
  const { error } = await supabase.from("reminder_preferences").upsert({ user_id: user.id, student_enabled: parsed.studentEnabled, student_time: parsed.studentTime, mentor_enabled: parsed.mentorEnabled, mentor_time: parsed.mentorTime });
  if (error) throw new Error(error.message);
}

export async function saveTheme(input: unknown) {
  const { theme } = z.object({ theme: z.enum(["dark", "light"]) }).parse(input);
  const { supabase, user } = await requireUser();
  const { error } = await supabase.from("profiles").update({ theme }).eq("id", user.id);
  if (error) throw new Error(error.message);
}

export async function endHabitAssignment(input: unknown) {
  const { assignmentId, reason } = z.object({ assignmentId: z.string().uuid(), reason: z.string().min(3).max(500) }).parse(input);
  const { supabase } = await requireUser();
  const { error } = await supabase.rpc("end_habit_assignment", { p_assignment_id: assignmentId, p_reason: reason });
  if (error) throw new Error(error.message);
}
