import { AppShell } from "@/components/app-shell";
import { CeteleProvider } from "@/modules/cetele/store";
import { loadCeteleState } from "@/modules/cetele/loader";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
export default async function ProtectedLayout({ children }: { children: React.ReactNode }) {
  if (process.env.NEXT_PUBLIC_CETELE_DATA_ADAPTER === "supabase") {
    const supabase = await createSupabaseServerClient();
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) redirect("/sign-in");
    const { data: profile } = await supabase.from("profiles").select("onboarding_completed_at,account_state").eq("id", auth.user.id).maybeSingle();
    if (!profile?.onboarding_completed_at) redirect("/account/setup");
    if (profile.account_state !== "active") redirect("/sign-in");
  }
  const loaded = await loadCeteleState();
  return <CeteleProvider initialState={loaded.state} adapter={loaded.adapter}><AppShell>{children}</AppShell></CeteleProvider>;
}
