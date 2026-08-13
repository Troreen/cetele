import { createHash } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createSupabaseAdminClient: vi.fn(),
  requireUser: vi.fn(),
}));

vi.mock("@/lib/supabase/admin", () => ({ createSupabaseAdminClient: mocks.createSupabaseAdminClient }));
vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: vi.fn(),
  requireUser: mocks.requireUser,
}));

import { createManualInvitation, revokeManualInvitation } from "@/modules/cetele/actions";

function creationDouble() {
  const insert = vi.fn().mockResolvedValue({ error: null });
  return { admin: { from: vi.fn(() => ({ insert })) }, insert };
}

describe("single-use mentorship invitation actions", () => {
  const previousOrigin = process.env.CETELE_APP_ORIGIN;

  beforeEach(() => {
    process.env.CETELE_APP_ORIGIN = "https://cetele.example";
    const maybeSingle = vi.fn().mockResolvedValue({ data: { id: "mentor-id", account_state: "active" }, error: null });
    mocks.requireUser.mockResolvedValue({ user: { id: "mentor-id" }, supabase: { from: vi.fn(() => ({ select: vi.fn(() => ({ eq: vi.fn(() => ({ maybeSingle })) })) })) } });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
    if (previousOrigin === undefined) delete process.env.CETELE_APP_ORIGIN;
    else process.env.CETELE_APP_ORIGIN = previousOrigin;
  });

  it("stores no invitee identity, only a SHA-256 token hash and 72-hour expiry", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-09T12:00:00.000Z"));
    const double = creationDouble();
    mocks.createSupabaseAdminClient.mockReturnValue(double.admin);

    const result = await createManualInvitation({});
    const url = new URL(result.url);
    const token = new URLSearchParams(url.hash.slice(1)).get("token");

    expect(url.pathname).toBe("/invite/accept");
    expect(url.search).toBe("");
    expect(token).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(result.expiresAt).toBe("2026-08-12T12:00:00.000Z");
    expect(double.insert).toHaveBeenCalledWith({
      mentor_id: "mentor-id",
      token_hash: createHash("sha256").update(token!).digest("hex"),
      expires_at: result.expiresAt,
    });
    expect(JSON.stringify(double.insert.mock.calls)).not.toContain(token);
    expect(JSON.stringify(double.insert.mock.calls)).not.toMatch(/email|name|alias/i);
  });

  it.each(["http://localhost:3000", "http://127.0.0.1:3000", "http://[::1]:3000"])(
    "allows an explicit loopback HTTP origin: %s",
    async (origin) => {
      process.env.CETELE_APP_ORIGIN = origin;
      const double = creationDouble();
      mocks.createSupabaseAdminClient.mockReturnValue(double.admin);
      expect(new URL((await createManualInvitation({})).url).origin).toBe(origin);
    },
  );

  it.each(["http://cetele.example", "https://user:password@cetele.example"])(
    "rejects an unsafe application origin: %s",
    async (origin) => {
      process.env.CETELE_APP_ORIGIN = origin;
      const double = creationDouble();
      mocks.createSupabaseAdminClient.mockReturnValue(double.admin);
      await expect(createManualInvitation({})).rejects.toThrow("Davet bağlantısı oluşturulamadı.");
      expect(double.insert).not.toHaveBeenCalled();
    },
  );

  it("revokes only the authenticated mentor's own unused invitation", async () => {
    const maybeSingle = vi.fn().mockResolvedValue({ data: { id: "c0a80121-7ac0-4ce0-bf4a-6f87be9c6bcb" }, error: null });
    const select = vi.fn(() => ({ maybeSingle }));
    const revokedIs = vi.fn(() => ({ select }));
    const acceptedIs = vi.fn(() => ({ is: revokedIs }));
    const mentorEq = vi.fn(() => ({ is: acceptedIs }));
    const invitationEq = vi.fn(() => ({ eq: mentorEq }));
    const update = vi.fn(() => ({ eq: invitationEq }));
    mocks.createSupabaseAdminClient.mockReturnValue({ from: vi.fn(() => ({ update })) });

    await revokeManualInvitation({ invitationId: "c0a80121-7ac0-4ce0-bf4a-6f87be9c6bcb" });

    expect(invitationEq).toHaveBeenCalledWith("id", "c0a80121-7ac0-4ce0-bf4a-6f87be9c6bcb");
    expect(mentorEq).toHaveBeenCalledWith("mentor_id", "mentor-id");
    expect(acceptedIs).toHaveBeenCalledWith("accepted_at", null);
    expect(revokedIs).toHaveBeenCalledWith("revoked_at", null);
  });
});
