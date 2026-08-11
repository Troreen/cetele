import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const providerSignOut = vi.fn();

vi.mock("@supabase/ssr", () => ({
  createServerClient: () => ({ auth: { signOut: providerSignOut } }),
}));

vi.mock("next/headers", () => ({
  cookies: async () => ({ getAll: () => [], set: vi.fn() }),
}));

vi.mock("next/navigation", () => ({
  redirect: (destination: string) => {
    throw new Error(`NEXT_REDIRECT:${destination}`);
  },
}));

import { signOut } from "@/modules/cetele/actions";

describe("sign out", () => {
  const previousAdapter = process.env.NEXT_PUBLIC_CETELE_DATA_ADAPTER;
  const previousUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const previousKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  beforeEach(() => {
    process.env.NEXT_PUBLIC_CETELE_DATA_ADAPTER = "supabase";
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "publishable-test-key";
    providerSignOut.mockResolvedValue({ error: null });
  });

  afterEach(() => {
    if (previousAdapter === undefined) delete process.env.NEXT_PUBLIC_CETELE_DATA_ADAPTER;
    else process.env.NEXT_PUBLIC_CETELE_DATA_ADAPTER = previousAdapter;
    if (previousUrl === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    else process.env.NEXT_PUBLIC_SUPABASE_URL = previousUrl;
    if (previousKey === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
    else process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = previousKey;
    vi.clearAllMocks();
  });

  it("revokes the hosted Supabase session", async () => {
    await signOut().catch(() => undefined);

    expect(providerSignOut).toHaveBeenCalledOnce();
  });
});
