import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const secret = process.env.SUPABASE_SECRET_KEY;
const disposableRef = process.env.CETELE_DISPOSABLE_PROJECT_REF;
const productionRef = process.env.CETELE_PRODUCTION_PROJECT_REF;
const actualRef = url ? new URL(url).hostname.split(".")[0] : "";
if (!url || !secret || !disposableRef || !productionRef || actualRef !== disposableRef || actualRef === productionRef) {
  throw new Error("Auth invite probe is restricted to the explicit disposable Supabase project");
}
if (process.env.CETELE_VERIFY_AUTH_INVITE !== "true") throw new Error("Set CETELE_VERIFY_AUTH_INVITE=true for this bounded synthetic probe");

const admin = createClient(url, secret, { auth: { persistSession: false, autoRefreshToken: false } });
let userId;
try {
  const email = `cetele-fixture-${randomUUID()}@example.com`;
  const { data, error } = await admin.auth.admin.inviteUserByEmail(email, {
    redirectTo: "http://127.0.0.1:3000/auth/confirm?kind=access_code",
    data: { fixture: "disposable-auth-invite-probe" },
  });
  if (error || !data.user) throw error ?? new Error("Invite User returned no synthetic user");
  userId = data.user.id;
  console.log(JSON.stringify({ inviteCreated: true, emailConfirmedAutomatically: Boolean(data.user.email_confirmed_at), syntheticUserDeleted: false }));
} finally {
  if (userId) {
    const { error } = await admin.auth.admin.deleteUser(userId);
    if (error) throw new Error("Synthetic Auth invite cleanup failed");
    console.log(JSON.stringify({ inviteCreated: true, syntheticUserDeleted: true }));
  }
}
