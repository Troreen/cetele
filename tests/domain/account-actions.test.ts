import { createHash } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ createAdmin: vi.fn(), createServer: vi.fn(), requireUser: vi.fn() }));
vi.mock("@/lib/supabase/admin", () => ({ createSupabaseAdminClient: mocks.createAdmin }));
vi.mock("@/lib/supabase/server", () => ({ createSupabaseServerClient: mocks.createServer, requireUser: mocks.requireUser }));

import { completeAccountSetup, createAccessCode, startRegistration } from "@/modules/cetele/account-actions";

describe("private account actions", () => {
  const originalFlag = process.env.CETELE_ALLOW_NON_PRODUCTION_SIGNUP;
  const originalOrigin = process.env.CETELE_APP_ORIGIN;
  const originalUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const originalDisposable = process.env.CETELE_DISPOSABLE_PROJECT_REF;
  const originalProduction = process.env.CETELE_PRODUCTION_PROJECT_REF;

  beforeEach(() => {
    process.env.CETELE_APP_ORIGIN = "https://cetele.example";
    const maybeSingle = vi.fn().mockResolvedValue({ data: { id: "admin-id", account_state: "active" }, error: null });
    mocks.requireUser.mockResolvedValue({ user: { id: "admin-id" }, supabase: { from: vi.fn(() => ({ select: vi.fn(() => ({ eq: vi.fn(() => ({ maybeSingle })) })) })) } });
  });
  afterEach(() => {
    vi.clearAllMocks();
    if (originalFlag === undefined) delete process.env.CETELE_ALLOW_NON_PRODUCTION_SIGNUP; else process.env.CETELE_ALLOW_NON_PRODUCTION_SIGNUP = originalFlag;
    if (originalOrigin === undefined) delete process.env.CETELE_APP_ORIGIN; else process.env.CETELE_APP_ORIGIN = originalOrigin;
    if (originalUrl === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_URL; else process.env.NEXT_PUBLIC_SUPABASE_URL = originalUrl;
    if (originalDisposable === undefined) delete process.env.CETELE_DISPOSABLE_PROJECT_REF; else process.env.CETELE_DISPOSABLE_PROJECT_REF = originalDisposable;
    if (originalProduction === undefined) delete process.env.CETELE_PRODUCTION_PROJECT_REF; else process.env.CETELE_PRODUCTION_PROJECT_REF = originalProduction;
  });

  it("refuses service-role account creation on the configured production project even if the flag is enabled", async () => {
    process.env.CETELE_ALLOW_NON_PRODUCTION_SIGNUP = "true";
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://production-ref.supabase.co";
    process.env.CETELE_DISPOSABLE_PROJECT_REF = "production-ref";
    process.env.CETELE_PRODUCTION_PROJECT_REF = "production-ref";
    await startRegistration({ token: "A".repeat(43), email: "fixture@example.test", kind: "access_code" });
    expect(mocks.createAdmin).not.toHaveBeenCalled();
  });

  it("keeps account creation blocked unless the explicit non-production flag is enabled", async () => {
    delete process.env.CETELE_ALLOW_NON_PRODUCTION_SIGNUP;
    await expect(startRegistration({ token: "A".repeat(43), email: "fixture@example.test", kind: "access_code" }))
      .resolves.toEqual({ message: "E-posta uygunsa doğrulama bağlantısı gönderildi." });
    expect(mocks.createAdmin).not.toHaveBeenCalled();
  });

  it("sets the password before asking the atomic onboarding RPC to consume the claim", async () => {
    const updateUser = vi.fn().mockResolvedValue({ error: null });
    const rpc = vi.fn().mockResolvedValue({ error: null });
    mocks.createServer.mockResolvedValue({ auth: { updateUser }, rpc });
    await completeAccountSetup({ alias: "Gölge", password: "fixture-password", passwordConfirmation: "fixture-password", terms: true, coreTracking: true, directMentorVisibility: true });
    expect(updateUser).toHaveBeenCalledWith({ password: "fixture-password" });
    expect(rpc).toHaveBeenCalledWith("complete_onboarding", expect.objectContaining({ p_alias: "Gölge", p_terms: true, p_core: true, p_direct: true }));
    expect(updateUser.mock.invocationCallOrder[0]).toBeLessThan(rpc.mock.invocationCallOrder[0]);
  });

  it("shows an Access Code once while storing only its hash", async () => {
    const administrator = { select: vi.fn(() => ({ eq: vi.fn(() => ({ maybeSingle: vi.fn().mockResolvedValue({ data: { user_id: "admin-id" }, error: null }) })) })) };
    const single = vi.fn().mockResolvedValue({ data: { id: "d4107c7a-26e7-42ff-aef5-a4d7d9739731" }, error: null });
    const insert = vi.fn(() => ({ select: vi.fn(() => ({ single })) }));
    const admin = { from: vi.fn((table: string) => table === "app_administrators" ? administrator : { insert }) };
    mocks.createAdmin.mockReturnValue(admin);
    const result = await createAccessCode({ maximumUses: 3, lifetimeHours: 24 });
    const token = new URLSearchParams(new URL(result.url).hash.slice(1)).get("token")!;
    expect(token).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(insert).toHaveBeenCalledWith(expect.objectContaining({ token_hash: createHash("sha256").update(token).digest("hex"), maximum_uses: 3 }));
    expect(JSON.stringify(insert.mock.calls)).not.toContain(token);
  });
});
