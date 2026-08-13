import { AccessCodeAdmin } from "@/components/access-code-admin";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { requireUser } from "@/lib/supabase/server";

export default async function Page() {
  const { user } = await requireUser();
  const admin = createSupabaseAdminClient();
  const { data: administrator } = await admin.from("app_administrators").select("user_id").eq("user_id", user.id).maybeSingle();
  if (!administrator) return <main className="workspace"><h1>Erişim reddedildi</h1><p>Bu yüzey yalnızca uygulama yöneticileri içindir.</p></main>;
  const { data, error } = await admin.from("access_codes").select("id,maximum_uses,consumed_uses,expires_at,revoked_at").order("created_at", { ascending: false }).limit(100);
  if (error) throw new Error("Erişim Kodları yüklenemedi.");
  return <AccessCodeAdmin codes={data ?? []} />;
}
