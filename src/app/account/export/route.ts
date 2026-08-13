import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET() {
  const session = await createSupabaseServerClient();
  const { data: auth, error: authError } = await session.auth.getUser();
  if (authError || !auth.user) return NextResponse.json({ error: "authentication_required" }, { status: 401 });
  const admin = createSupabaseAdminClient();
  const userId = auth.user.id;
  const request = await admin.from("account_requests").select("id").eq("user_id", userId)
    .eq("kind", "export").in("state", ["requested", "processing", "ready"]).order("requested_at", { ascending: false }).limit(1).maybeSingle();
  if (request.error || !request.data) return NextResponse.json({ error: "export_not_requested" }, { status: 403 });

  const [profile, relationships, definitions, assignments, completions, excuses, preferences, reminders, evidence] = await Promise.all([
    admin.from("profiles").select("*").eq("id", userId).maybeSingle(),
    admin.from("mentorship_relationships").select("*").or(`mentor_id.eq.${userId},student_id.eq.${userId}`),
    admin.from("habit_definitions").select("*").eq("author_id", userId),
    admin.from("habit_assignments").select("*").eq("student_id", userId),
    admin.from("completions").select("*").eq("student_id", userId),
    admin.from("excused_days").select("*").eq("student_id", userId),
    admin.from("assignment_preferences").select("*").eq("student_id", userId),
    admin.from("reminder_preferences").select("*").eq("user_id", userId).maybeSingle(),
    admin.from("legal_events").select("*").eq("user_id", userId).order("occurred_at"),
  ]);
  const results = [profile, relationships, definitions, assignments, completions, excuses, preferences, reminders, evidence];
  if (results.some((result) => result.error)) return NextResponse.json({ error: "export_generation_failed" }, { status: 500 });
  const payload = {
    format: "cetele-account-export-v1",
    generated_at: new Date().toISOString(),
    auth: { user_id: userId, recovery_email: auth.user.email ?? null, email_verified_at: auth.user.email_confirmed_at ?? null },
    profile: profile.data,
    direct_relationships: relationships.data,
    authored_habit_definitions: definitions.data,
    assignments: assignments.data,
    completions: completions.data,
    excused_days: excuses.data,
    assignment_preferences: preferences.data,
    reminder_preferences: reminders.data,
    legal_evidence: evidence.data,
  };
  await admin.from("account_requests").update({ state: "completed", completed_at: new Date().toISOString() }).eq("id", request.data.id);
  return new NextResponse(JSON.stringify(payload, null, 2), {
    headers: {
      "Cache-Control": "no-store, max-age=0",
      "Content-Disposition": 'attachment; filename="cetele-account-export.json"',
      "Content-Type": "application/json; charset=utf-8",
      "Referrer-Policy": "no-referrer",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
