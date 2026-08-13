import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const secret = process.env.SUPABASE_SECRET_KEY;
const disposableRef = process.env.CETELE_DISPOSABLE_PROJECT_REF;
const productionRef = process.env.CETELE_PRODUCTION_PROJECT_REF;
const execute = process.env.CETELE_DELETION_EXECUTE === "true";
if (!url || !secret || !disposableRef || !productionRef) throw new Error("Missing bounded deletion configuration");
const actualRef = new URL(url).hostname.split(".")[0];
if (actualRef !== disposableRef || actualRef === productionRef) throw new Error("Deletion processing is restricted to the explicit disposable project");

const admin = createClient(url, secret, { auth: { persistSession: false, autoRefreshToken: false } });
const { data, error } = await admin.from("account_requests").select("id,user_id")
  .eq("kind", "deletion").eq("state", "requested").lte("recovery_until", new Date().toISOString()).limit(100);
if (error) throw error;
console.log(JSON.stringify({ mode: execute ? "execute" : "dry-run", recoveriesExpired: data.length }));
if (!execute) process.exit(0);

let deleted = 0;
for (const request of data) {
  // App-owned denial is committed first. This blocks stale access JWTs at RLS/RPC
  // boundaries before the Auth user and cascading application records are removed.
  const blocked = await admin.from("profiles").update({ account_state: "disabled" }).eq("id", request.user_id).select("id").maybeSingle();
  if (blocked.error || !blocked.data) throw new Error(`Account block failed after ${deleted} deletions`);
  const revoked = await admin.rpc("revoke_user_sessions", { p_user_id: request.user_id });
  if (revoked.error) throw new Error(`Session revocation failed after ${deleted} deletions`);
  const removed = await admin.auth.admin.deleteUser(request.user_id);
  if (removed.error) throw new Error(`Auth deletion failed after ${deleted} deletions`);
  deleted += 1;
}
console.log(JSON.stringify({ mode: "execute", deleted }));
