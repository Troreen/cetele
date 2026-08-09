import "server-only";

import { fixtureState } from "./fixtures";
import type { Assignment, AttentionItem, CeteleState, Completion, Excuse, HabitDefinition, Person, Review } from "./types";
import { requireUser } from "@/lib/supabase/server";

export type DataAdapter = "local" | "supabase";

function localDate(timezone: string) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
}

export async function loadCeteleState(): Promise<{ state: CeteleState; adapter: DataAdapter }> {
  if (process.env.NEXT_PUBLIC_CETELE_DATA_ADAPTER !== "supabase") return { state: fixtureState, adapter: "local" };
  const { supabase, user } = await requireUser();
  const { error: reconciliationError } = await supabase.rpc("reconcile_my_attention", {});
  if (reconciliationError) throw new Error(reconciliationError.message);
  const [profilesResult, invitationsResult, relationshipsResult, definitionsResult, assignmentsResult, completionsResult, attentionResult, followupsResult, reviewsResult, excusesResult, remindersResult] = await Promise.all([
    supabase.from("profiles").select("id,display_name,timezone,group_name,theme"),
    supabase.from("mentorship_invitations").select("id,mentor_id,invitee_name").is("accepted_at", null).is("cancelled_at", null),
    supabase.from("mentorship_relationships").select("mentor_id,student_id,status").eq("status", "active"),
    supabase.from("habit_definitions").select("*"),
    supabase.from("habit_assignments").select("*,assignment_preferences(icon,accent,sort_order)").in("status", ["active", "ended"]),
    supabase.from("completions").select("assignment_id,student_id,completion_date,amount,retrospective,note"),
    supabase.from("attention_items").select("*"),
    supabase.from("followups").select("attention_id,actor_id,private_note,created_at").order("created_at", { ascending: false }),
    supabase.from("daily_reviews").select("mentor_id,review_date,reviewed_at"),
    supabase.from("excused_days").select("student_id,assignment_id,excuse_date,note,granted_by"),
    supabase.from("reminder_preferences").select("*").eq("user_id", user.id).maybeSingle(),
  ]);
  const failure = [profilesResult, invitationsResult, relationshipsResult, definitionsResult, assignmentsResult, completionsResult, attentionResult, followupsResult, reviewsResult, excusesResult, remindersResult].find((result) => result.error)?.error;
  if (failure) throw new Error(failure.message);
  const relationships = (relationshipsResult.data ?? []) as Array<{ mentor_id: string; student_id: string; status: string }>;
  const profiles = (profilesResult.data ?? []) as Array<{ id: string; display_name: string; timezone: string; group_name: string | null; theme?: "dark" | "light" }>;
  const current = profiles.find((profile) => profile.id === user.id);
  const people: Person[] = profiles.map((profile) => ({
    id: profile.id,
    name: profile.display_name,
    initials: profile.display_name.split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase(),
    mentorId: relationships.find((relationship) => relationship.student_id === profile.id)?.mentor_id ?? null,
    invitation: "active",
    groupName: profile.group_name ?? undefined,
  }));
  for (const invitation of invitationsResult.data ?? []) {
    if (people.some((entry) => entry.id === invitation.id)) continue;
    people.push({ id: invitation.id, name: invitation.invitee_name, initials: invitation.invitee_name.split(" ").map((part: string) => part[0]).join("").slice(0, 2).toUpperCase(), mentorId: invitation.mentor_id, invitation: "pending" });
  }
  const definitions: HabitDefinition[] = (definitionsResult.data ?? []).map((item) => ({ id: item.id, authorId: item.author_id, creatorName: item.creator_name, name: item.name, description: item.description, guide: item.guide, why: item.why_it_matters, completionDefinition: item.completion_definition, tips: item.practical_tips, mode: item.mode, defaultTarget: item.default_target, visibility: item.visibility, sourceAuthor: item.source_creator_name ?? undefined }));
  const assignments: Assignment[] = (assignmentsResult.data ?? [])
    .filter((item) => item.status === "active" || item.status === "ended")
    .map((item) => { const preference = Array.isArray(item.assignment_preferences) ? item.assignment_preferences[0] : item.assignment_preferences; return { id: item.id, definitionId: item.definition_id, studentId: item.student_id, assignedBy: item.assigned_by, target: item.target, accent: preference?.accent ?? "#55a7ff", icon: preference?.icon ?? "book", order: preference?.sort_order ?? 0, status: item.status }; });
  const completions: Completion[] = (completionsResult.data ?? []).map((item) => ({ assignmentId: item.assignment_id, date: item.completion_date, amount: item.amount, retrospective: item.retrospective, note: item.note }));
  const attention: AttentionItem[] = (attentionResult.data ?? []).map((item) => {
    const followup = (followupsResult.data ?? []).find((entry) => entry.attention_id === item.id);
    return { id: item.id, studentId: item.student_id, assignmentId: item.trigger_assignment_id, contributingAssignmentIds: item.contributing_assignment_ids, responsibleMentorId: item.responsible_mentor_id, triggerDates: [item.first_missed_date, item.second_missed_date], state: item.state === "followed_up" ? "followed-up" : item.state, followedUpBy: followup?.actor_id, followedUpAt: followup?.created_at, privateNote: followup?.private_note };
  });
  const reviews: Review[] = (reviewsResult.data ?? []).map((item) => ({ mentorId: item.mentor_id, date: item.review_date, reviewedAt: item.reviewed_at }));
  const excuses: Excuse[] = (excusesResult.data ?? []).map((item) => ({ studentId: item.student_id, assignmentId: item.assignment_id, date: item.excuse_date, note: item.note, grantedBy: item.granted_by }));
  const reminder = remindersResult.data;
  return { adapter: "supabase", state: { version: 1, today: localDate(current?.timezone ?? "Europe/Stockholm"), currentUserId: user.id, theme: current?.theme ?? "dark", people, definitions, assignments, completions, attention, reviews, excuses, reminders: { studentEnabled: reminder?.student_enabled ?? true, studentTime: reminder?.student_time?.slice(0, 5) ?? "20:30", mentorEnabled: reminder?.mentor_enabled ?? true, mentorTime: reminder?.mentor_time?.slice(0, 5) ?? "21:00" } } };
}
