"use server";

import { createHash, randomBytes } from "node:crypto";
import { z } from "zod";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient, requireUser } from "@/lib/supabase/server";
import { aliasSchema } from "./account-policy";

const tokenSchema = z.string().regex(/^[A-Za-z0-9_-]{43}$/);
const claimSchema = z.object({ token: tokenSchema, kind: z.enum(["access_code", "mentorship_invitation"]) });
const DRAFT_VERSION = "draft-fixture-2026-08-12";
const CLAIM_FAILURE = "Bağlantı geçersiz, kullanılmış veya süresi dolmuş.";
const REGISTRATION_RESPONSE = "E-posta uygunsa doğrulama bağlantısı gönderildi.";

function tokenHash(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

async function requireAppAdministrator() {
  const { user, supabase } = await requireUser();
  const { data: activeProfile, error: profileError } = await supabase.from("profiles").select("id,account_state").eq("id", user.id).maybeSingle();
  if (profileError || activeProfile?.account_state !== "active") throw new Error("Bu işlem için etkin bir hesap gerekiyor.");
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin.from("app_administrators").select("user_id").eq("user_id", user.id).maybeSingle();
  if (error || !data) throw new Error("Bu işlem için uygulama yöneticisi yetkisi gerekiyor.");
  return { admin, user };
}

function applicationOrigin() {
  const raw = process.env.CETELE_APP_ORIGIN;
  if (!raw) throw new Error("Hesap işlemi başlatılamadı.");
  const origin = new URL(raw);
  const loopback = ["localhost", "127.0.0.1", "[::1]"].includes(origin.hostname);
  if ((origin.protocol !== "https:" && !(origin.protocol === "http:" && loopback)) || origin.username || origin.password || origin.pathname !== "/" || origin.search || origin.hash) {
    throw new Error("Hesap işlemi başlatılamadı.");
  }
  return origin;
}

function nonProductionSignupIsEnabled() {
  if (process.env.CETELE_ALLOW_NON_PRODUCTION_SIGNUP !== "true") return false;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const disposableRef = process.env.CETELE_DISPOSABLE_PROJECT_REF;
  const productionRef = process.env.CETELE_PRODUCTION_PROJECT_REF;
  if (!url || !disposableRef || !productionRef) return false;
  try {
    const actualRef = new URL(url).hostname.split(".")[0];
    return actualRef === disposableRef && actualRef !== productionRef;
  } catch {
    return false;
  }
}

export async function previewRegistrationClaim(input: unknown) {
  const parsed = claimSchema.safeParse(input);
  if (!parsed.success) throw new Error(CLAIM_FAILURE);
  const admin = createSupabaseAdminClient();
  const hash = tokenHash(parsed.data.token);
  if (parsed.data.kind === "access_code") {
    const { data, error } = await admin.from("access_codes").select("expires_at,revoked_at,maximum_uses,consumed_uses").eq("token_hash", hash).maybeSingle();
    if (error || !data || data.revoked_at || data.consumed_uses >= data.maximum_uses || new Date(data.expires_at).getTime() <= Date.now()) throw new Error(CLAIM_FAILURE);
    return { kind: parsed.data.kind, mentorAlias: null } as const;
  }
  const { data, error } = await admin.from("mentorship_invitations").select("expires_at,revoked_at,accepted_at,claimed_user_id,mentor_id").eq("token_hash", hash).maybeSingle();
  if (error || !data || data.revoked_at || data.accepted_at || data.claimed_user_id || new Date(data.expires_at).getTime() <= Date.now()) throw new Error(CLAIM_FAILURE);
  const { data: mentor } = await admin.from("profiles").select("alias,account_state,onboarding_completed_at").eq("id", data.mentor_id).maybeSingle();
  if (mentor?.account_state !== "active" || !mentor.onboarding_completed_at) throw new Error(CLAIM_FAILURE);
  return { kind: parsed.data.kind, mentorAlias: mentor.alias } as const;
}

export async function startRegistration(input: unknown) {
  if (!nonProductionSignupIsEnabled()) return { message: REGISTRATION_RESPONSE } as const;
  const parsed = claimSchema.extend({ email: z.email() }).safeParse(input);
  if (!parsed.success) return { message: REGISTRATION_RESPONSE } as const;
  try {
    await previewRegistrationClaim(parsed.data);
    const admin = createSupabaseAdminClient();
    const redirect = new URL("/auth/confirm", applicationOrigin());
    redirect.searchParams.set("kind", parsed.data.kind);
    const redirectTo = redirect.toString();
    const { data: created, error } = await admin.auth.admin.inviteUserByEmail(parsed.data.email.trim().toLowerCase(), { redirectTo });
    if (error || !created.user) {
      // Supabase does not expose invite resend for an existing invited user.
      // A generic recovery email lets an abandoned, still-pending account
      // re-enter the same verified setup flow without revealing existence.
      await admin.auth.resetPasswordForEmail(parsed.data.email.trim().toLowerCase(), { redirectTo });
      return { message: REGISTRATION_RESPONSE } as const;
    }
    const bind = await admin.rpc("begin_pending_registration", { p_user_id: created.user.id, p_claim_kind: parsed.data.kind, p_token_hash: tokenHash(parsed.data.token) });
    if (bind.error) await admin.auth.admin.deleteUser(created.user.id);
  } catch {
    // Public copy remains generic to avoid confirming account or claim state.
  }
  return { message: REGISTRATION_RESPONSE } as const;
}

export async function createAccessCode(input: unknown) {
  const parsed = z.object({ maximumUses: z.number().int().min(1).max(100), lifetimeHours: z.number().int().min(1).max(720) }).parse(input);
  const { admin, user } = await requireAppAdministrator();
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + parsed.lifetimeHours * 60 * 60 * 1000).toISOString();
  const { data, error } = await admin.from("access_codes").insert({
    token_hash: tokenHash(token),
    created_by: user.id,
    maximum_uses: parsed.maximumUses,
    expires_at: expiresAt,
  }).select("id").single();
  if (error || !data) throw new Error("Erişim Kodu oluşturulamadı.");
  const url = new URL("/access/claim", applicationOrigin());
  url.hash = `token=${encodeURIComponent(token)}`;
  return { id: data.id, url: url.toString(), expiresAt, maximumUses: parsed.maximumUses };
}

export async function revokeAccessCode(input: unknown) {
  const { accessCodeId } = z.object({ accessCodeId: z.string().uuid() }).parse(input);
  const { admin } = await requireAppAdministrator();
  const { data, error } = await admin.from("access_codes").update({ revoked_at: new Date().toISOString() })
    .eq("id", accessCodeId).is("revoked_at", null).select("id").maybeSingle();
  if (error || !data) throw new Error("Erişim Kodu iptal edilemedi.");
}

export async function completeAccountSetup(input: unknown) {
  const parsed = z.object({
    alias: aliasSchema,
    password: z.string().min(8).max(72),
    passwordConfirmation: z.string().min(8).max(72),
    terms: z.literal(true),
    coreTracking: z.literal(true),
    directMentorVisibility: z.boolean(),
  }).refine(({ password, passwordConfirmation }) => password === passwordConfirmation, { path: ["passwordConfirmation"], message: "Parolalar aynı olmalı." }).parse(input);
  const supabase = await createSupabaseServerClient();
  const { error: passwordError } = await supabase.auth.updateUser({ password: parsed.password });
  if (passwordError) throw new Error("Parola kaydedilemedi. Doğrulama bağlantısından yeniden deneyebilirsin.");
  const { error } = await supabase.rpc("complete_onboarding", {
    p_alias: parsed.alias,
    p_terms_version: DRAFT_VERSION,
    p_privacy_version: DRAFT_VERSION,
    p_core_version: DRAFT_VERSION,
    p_direct_version: DRAFT_VERSION,
    p_terms: parsed.terms,
    p_core: parsed.coreTracking,
    p_direct: parsed.directMentorVisibility,
  });
  if (error) throw new Error("Hesap kurulumu tamamlanamadı. Bilgilerin korundu; yeniden deneyebilirsin.");
}

export async function requestPasswordRecovery(input: unknown) {
  const { email } = z.object({ email: z.email() }).parse(input);
  const supabase = await createSupabaseServerClient();
  await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), { redirectTo: new URL("/auth/confirm", applicationOrigin()).toString() });
  return { message: "E-posta uygunsa parola yenileme bağlantısı gönderildi." } as const;
}

export async function updateRecoveredPassword(input: unknown) {
  const { password } = z.object({ password: z.string().min(8).max(72) }).parse(input);
  const { error } = await (await createSupabaseServerClient()).auth.updateUser({ password });
  if (error) throw new Error("Parola yenilenemedi. Yeni bir bağlantı iste.");
}

export async function withdrawConsent(input: unknown) {
  const { purpose } = z.object({ purpose: z.enum(["core_tracking", "direct_mentor_visibility"]) }).parse(input);
  const { supabase } = await requireUser();
  const { error } = await supabase.rpc("withdraw_consent", { p_purpose: purpose });
  if (error) throw new Error("Onay geri çekilemedi. Lütfen yeniden dene.");
  await supabase.auth.signOut({ scope: "global" });
}

export async function requestAccountExport() {
  const { supabase } = await requireUser();
  const { error } = await supabase.rpc("request_account_export");
  if (error) throw new Error("Dışa aktarma isteği oluşturulamadı. Lütfen yeniden dene.");
}

export async function requestAccountDeletion() {
  const { supabase } = await requireUser();
  const { error } = await supabase.rpc("request_account_deletion");
  if (error) throw new Error("Hesap silme isteği oluşturulamadı. Lütfen yeniden dene.");
  await supabase.auth.signOut({ scope: "global" });
}

export async function cancelAccountDeletion() {
  const { supabase } = await requireUser();
  const { error } = await supabase.rpc("cancel_account_deletion");
  if (error) throw new Error("Silme talebi kurtarma süresi içinde geri alınamadı.");
}
