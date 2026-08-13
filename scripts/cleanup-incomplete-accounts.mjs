import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const secret = process.env.SUPABASE_SECRET_KEY;
const disposableRef = process.env.CETELE_DISPOSABLE_PROJECT_REF;
const productionRef = process.env.CETELE_PRODUCTION_PROJECT_REF;
const execute = process.env.CETELE_CLEANUP_EXECUTE === "true";

if (!url || !secret || !disposableRef || !productionRef) throw new Error("Missing cleanup configuration: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SECRET_KEY, CETELE_DISPOSABLE_PROJECT_REF, CETELE_PRODUCTION_PROJECT_REF");
const actualRef = new URL(url).hostname.split(".")[0];
if (actualRef !== disposableRef || actualRef === productionRef) throw new Error("Cleanup is restricted to the explicitly named disposable Supabase project");

const admin = createClient(url, secret, { auth: { persistSession: false, autoRefreshToken: false } });
const { data, error } = await admin.from("pending_registrations").select("user_id,onboarding_completed_at,cleanup_after")
  .is("onboarding_completed_at", null).lte("cleanup_after", new Date().toISOString()).limit(100);
if (error) throw error;

console.log(JSON.stringify({ mode: execute ? "execute" : "dry-run", expiredIncompleteAccounts: data.length }));
if (!execute) process.exit(0);

let deleted = 0;
for (const account of data) {
  // Incomplete users have no profile or active-consent state, so every app RLS/RPC
  // remains denied even if an already-issued access JWT survives Auth deletion.
  const revoked = await admin.rpc("revoke_user_sessions", { p_user_id: account.user_id });
  if (revoked.error) throw new Error(`Session revocation failed after ${deleted} deletions`);
  const result = await admin.auth.admin.deleteUser(account.user_id);
  if (result.error) throw new Error(`Auth cleanup failed after ${deleted} deletions`);
  deleted += 1;
}
console.log(JSON.stringify({ mode: "execute", deleted }));
