import { createHash } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createSupabaseAdminClient: vi.fn(),
  createSupabaseServerClient: vi.fn(),
  requireUser: vi.fn(),
}));

vi.mock("@/lib/supabase/admin", () => ({ createSupabaseAdminClient: mocks.createSupabaseAdminClient }));
vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: mocks.createSupabaseServerClient,
  requireUser: mocks.requireUser,
}));

import { claimManualInvitation, createManualInvitation, revokeManualInvitation } from "@/modules/cetele/actions";

const TOKEN = "A".repeat(43);

function adminDouble() {
  const insert = vi.fn().mockResolvedValue({ error: null });
  const maybeSingle = vi.fn();
  const eq = vi.fn(() => ({ maybeSingle }));
  const select = vi.fn(() => ({ eq }));
  const createUser = vi.fn();
  const deleteUser = vi.fn().mockResolvedValue({ error: null });
  const rpc = vi.fn();
  const admin = {
    from: vi.fn(() => ({ insert, select })),
    auth: { admin: { createUser, deleteUser } },
    rpc,
  };
  return { admin, createUser, deleteUser, eq, insert, maybeSingle, rpc };
}

describe("manual invitation actions", () => {
  const previousOrigin = process.env.CETELE_APP_ORIGIN;

  beforeEach(() => {
    process.env.CETELE_APP_ORIGIN = "https://cetele.example";
    mocks.requireUser.mockResolvedValue({ user: { id: "mentor-id" }, supabase: {} });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
    if (previousOrigin === undefined) delete process.env.CETELE_APP_ORIGIN;
    else process.env.CETELE_APP_ORIGIN = previousOrigin;
  });

  it("stores only a SHA-256 hash and returns a 72-hour fragment URL", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-09T12:00:00.000Z"));
    const double = adminDouble();
    mocks.createSupabaseAdminClient.mockReturnValue(double.admin);

    const result = await createManualInvitation({ name: "  Ayşe Kaya  " });
    const url = new URL(result.url);
    const token = new URLSearchParams(url.hash.slice(1)).get("token");

    expect(Object.keys(result).sort()).toEqual(["expiresAt", "url"]);
    expect(url.pathname).toBe("/invite/accept");
    expect(url.search).toBe("");
    expect(token).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(result.expiresAt).toBe("2026-08-12T12:00:00.000Z");
    expect(double.insert).toHaveBeenCalledWith({
      mentor_id: "mentor-id",
      invitee_name: "Ayşe Kaya",
      token_hash: createHash("sha256").update(token!).digest("hex"),
      expires_at: result.expiresAt,
    });
    expect(JSON.stringify(double.insert.mock.calls)).not.toContain(token);
  });

  it.each([
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://[::1]:3000",
  ])("allows an explicit loopback HTTP application origin: %s", async (origin) => {
    process.env.CETELE_APP_ORIGIN = origin;
    const double = adminDouble();
    mocks.createSupabaseAdminClient.mockReturnValue(double.admin);

    const result = await createManualInvitation({ name: "Ayşe Kaya" });

    expect(new URL(result.url).origin).toBe(origin);
    expect(double.insert).toHaveBeenCalledOnce();
  });

  it.each([
    "http://cetele.example",
    "https://user:password@cetele.example",
  ])("rejects an unsafe application origin: %s", async (origin) => {
    process.env.CETELE_APP_ORIGIN = origin;
    const double = adminDouble();
    mocks.createSupabaseAdminClient.mockReturnValue(double.admin);

    await expect(createManualInvitation({ name: "Ayşe Kaya" })).rejects.toThrow("Davet bağlantısı oluşturulamadı.");
    expect(double.insert).not.toHaveBeenCalled();
  });

  it("creates, atomically claims, and signs in the invited account", async () => {
    const double = adminDouble();
    double.maybeSingle.mockResolvedValue({ data: { invitee_name: "Ayşe Kaya", expires_at: "2099-01-01T00:00:00.000Z", accepted_at: null, cancelled_at: null, invited_user_id: null }, error: null });
    double.createUser.mockResolvedValue({ data: { user: { id: "student-id" } }, error: null });
    double.rpc.mockResolvedValue({ error: null });
    const signInWithPassword = vi.fn().mockResolvedValue({ error: null });
    mocks.createSupabaseAdminClient.mockReturnValue(double.admin);
    mocks.createSupabaseServerClient.mockResolvedValue({ auth: { signInWithPassword } });

    await expect(claimManualInvitation({ token: TOKEN, email: "STUDENT@example.com", password: "secure-pass", passwordConfirmation: "secure-pass" }))
      .resolves.toEqual({ outcome: "signed-in" });

    const hash = createHash("sha256").update(TOKEN).digest("hex");
    expect(double.eq).toHaveBeenCalledWith("token_hash", hash);
    expect(double.createUser).toHaveBeenCalledWith({ email: "student@example.com", password: "secure-pass", email_confirm: true, user_metadata: { name: "Ayşe Kaya" } });
    expect(double.rpc).toHaveBeenCalledWith("claim_mentorship_invitation", { p_token_hash: hash, p_user_id: "student-id" });
    expect(signInWithPassword).toHaveBeenCalledWith({ email: "student@example.com", password: "secure-pass" });
  });

  it("does not reveal whether a token hash exists", async () => {
    const double = adminDouble();
    double.maybeSingle.mockResolvedValue({ data: null, error: null });
    mocks.createSupabaseAdminClient.mockReturnValue(double.admin);

    await expect(claimManualInvitation({ token: TOKEN, email: "student@example.com", password: "secure-pass", passwordConfirmation: "secure-pass" }))
      .rejects.toThrow("Davet bağlantısı geçersiz, kullanılmış veya süresi dolmuş.");
    expect(double.createUser).not.toHaveBeenCalled();
  });

  it("deletes a newly created auth user when the database claim fails", async () => {
    const double = adminDouble();
    double.maybeSingle.mockResolvedValue({ data: { invitee_name: "Ayşe Kaya", expires_at: "2099-01-01T00:00:00.000Z", accepted_at: null, cancelled_at: null, invited_user_id: null }, error: null });
    double.createUser.mockResolvedValue({ data: { user: { id: "student-id" } }, error: null });
    double.rpc.mockResolvedValue({ error: { message: "sensitive database detail" } });
    mocks.createSupabaseAdminClient.mockReturnValue(double.admin);

    await expect(claimManualInvitation({ token: TOKEN, email: "student@example.com", password: "secure-pass", passwordConfirmation: "secure-pass" }))
      .rejects.toThrow("Davet bağlantısı geçersiz, kullanılmış veya süresi dolmuş.");
    expect(double.deleteUser).toHaveBeenCalledWith("student-id");
    expect(mocks.createSupabaseServerClient).not.toHaveBeenCalled();
  });

  it("returns cleanup-required when auth-user cleanup resolves with an error", async () => {
    const double = adminDouble();
    double.maybeSingle.mockResolvedValue({ data: { invitee_name: "Ayşe Kaya", expires_at: "2099-01-01T00:00:00.000Z", accepted_at: null, cancelled_at: null, invited_user_id: null }, error: null });
    double.createUser.mockResolvedValue({ data: { user: { id: "student-id" } }, error: null });
    double.rpc.mockResolvedValue({ error: { message: "sensitive database detail" } });
    double.deleteUser.mockResolvedValue({ data: null, error: { message: "sensitive cleanup detail" } });
    mocks.createSupabaseAdminClient.mockReturnValue(double.admin);

    await expect(claimManualInvitation({ token: TOKEN, email: "student@example.com", password: "secure-pass", passwordConfirmation: "secure-pass" }))
      .resolves.toEqual({ outcome: "cleanup-required" });
    expect(double.deleteUser).toHaveBeenCalledWith("student-id");
    expect(mocks.createSupabaseServerClient).not.toHaveBeenCalled();
  });

  it("returns sign-in-required when the committed claim cannot establish a session", async () => {
    const double = adminDouble();
    double.maybeSingle.mockResolvedValue({ data: { invitee_name: "Ayşe Kaya", expires_at: "2099-01-01T00:00:00.000Z", accepted_at: null, cancelled_at: null, invited_user_id: null }, error: null });
    double.createUser.mockResolvedValue({ data: { user: { id: "student-id" } }, error: null });
    double.rpc.mockResolvedValue({ error: null });
    const signInWithPassword = vi.fn().mockResolvedValue({ error: { message: "sensitive provider detail" } });
    mocks.createSupabaseAdminClient.mockReturnValue(double.admin);
    mocks.createSupabaseServerClient.mockResolvedValue({ auth: { signInWithPassword } });

    await expect(claimManualInvitation({ token: TOKEN, email: "student@example.com", password: "secure-pass", passwordConfirmation: "secure-pass" }))
      .resolves.toEqual({ outcome: "sign-in-required" });
    expect(double.deleteUser).not.toHaveBeenCalled();
  });

  it("revokes only the authenticated mentor's own pending invitation", async () => {
    const maybeSingle = vi.fn().mockResolvedValue({ data: { id: "c0a80121-7ac0-4ce0-bf4a-6f87be9c6bcb" }, error: null });
    const select = vi.fn(() => ({ maybeSingle }));
    const cancelledIs = vi.fn(() => ({ select }));
    const acceptedIs = vi.fn(() => ({ is: cancelledIs }));
    const mentorEq = vi.fn(() => ({ is: acceptedIs }));
    const invitationEq = vi.fn(() => ({ eq: mentorEq }));
    const update = vi.fn(() => ({ eq: invitationEq }));
    mocks.createSupabaseAdminClient.mockReturnValue({ from: vi.fn(() => ({ update })) });

    await revokeManualInvitation({ invitationId: "c0a80121-7ac0-4ce0-bf4a-6f87be9c6bcb" });

    expect(invitationEq).toHaveBeenCalledWith("id", "c0a80121-7ac0-4ce0-bf4a-6f87be9c6bcb");
    expect(mentorEq).toHaveBeenCalledWith("mentor_id", "mentor-id");
    expect(acceptedIs).toHaveBeenCalledWith("accepted_at", null);
    expect(cancelledIs).toHaveBeenCalledWith("cancelled_at", null);
  });
});
