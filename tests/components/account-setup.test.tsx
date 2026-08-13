import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AccountSetup } from "@/components/account-setup";

const mocks = vi.hoisted(() => ({ complete: vi.fn(), push: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: mocks.push }) }));
vi.mock("@/modules/cetele/account-actions", () => ({ completeAccountSetup: mocks.complete, updateRecoveredPassword: vi.fn() }));

describe("AccountSetup", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("NEXT_PUBLIC_CETELE_DATA_ADAPTER", "supabase");
  });
  afterEach(cleanup);

  it("keeps every legal choice unchecked and blocks submission until each required choice is affirmative", async () => {
    render(<AccountSetup />);
    const submit = screen.getByRole("button", { name: /Hesabı tamamla/ });
    expect(screen.getAllByRole("checkbox")).toHaveLength(3);
    expect(screen.getAllByRole("checkbox").every((choice) => !(choice as HTMLInputElement).checked)).toBe(true);
    expect(submit).toBeDisabled();
    fireEvent.change(screen.getByLabelText("Kullanıcı adı"), { target: { value: "Gölge" } });
    fireEvent.change(screen.getByLabelText("Yeni parola"), { target: { value: "fixture-password" } });
    fireEvent.change(screen.getByLabelText("Parola tekrarı"), { target: { value: "fixture-password" } });
    for (const choice of screen.getAllByRole("checkbox")) fireEvent.click(choice);
    expect(submit).toBeEnabled();
    fireEvent.click(submit);
    await waitFor(() => expect(mocks.complete).toHaveBeenCalledWith(expect.objectContaining({ alias: "Gölge", terms: true, coreTracking: true, directMentorVisibility: true })));
  });

  it("clearly marks legal content as a non-production fixture", () => {
    render(<AccountSetup />);
    expect(screen.getByText(/NON-PRODUCTION FIXTURE/)).toBeVisible();
    expect(screen.getByLabelText("Kullanıcı adı")).toBeVisible();
    expect(screen.queryByText(/yasal ad istemeyiz/i)).not.toBeInTheDocument();
    expect(screen.queryByText("Özel giriş")).not.toBeInTheDocument();
  });
});
