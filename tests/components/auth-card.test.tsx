import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AuthCard } from "@/components/auth-card";

const mocks = vi.hoisted(() => ({
  push: vi.fn(),
  signIn: vi.fn(),
  startRegistration: vi.fn(),
  recovery: vi.fn(),
  preview: vi.fn(),
}));

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: mocks.push }) }));
vi.mock("@/modules/cetele/actions", () => ({ signInWithPassword: mocks.signIn }));
vi.mock("@/modules/cetele/account-actions", () => ({ startRegistration: mocks.startRegistration, requestPasswordRecovery: mocks.recovery, previewRegistrationClaim: mocks.preview }));

describe("AuthCard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("NEXT_PUBLIC_CETELE_DATA_ADAPTER", "supabase");
    mocks.preview.mockResolvedValue({ kind: "mentorship_invitation", mentorAlias: "Fixture Mentor" });
    window.history.replaceState(null, "", "/sign-in");
  });
  afterEach(cleanup);

  it("uses generic Turkish copy for a failed returning sign-in", async () => {
    mocks.signIn.mockRejectedValue(new Error("User not found"));
    render(<AuthCard mode="sign-in" />);
    fireEvent.change(screen.getByLabelText("Özel e-posta"), { target: { value: "synthetic@example.test" } });
    fireEvent.change(screen.getByLabelText("Parola"), { target: { value: "fixture-password" } });
    fireEvent.click(screen.getByRole("button", { name: /Giriş yap/ }));
    expect(await screen.findByRole("alert")).toHaveTextContent("E-posta veya parola doğrulanamadı");
    expect(screen.queryByText("User not found")).not.toBeInTheDocument();
  });

  it("reads a Mentorship Invitation secret from the fragment, submits it in the body, and scrubs it", async () => {
    const token = "A".repeat(43);
    window.history.replaceState(null, "", `/invite/accept#token=${token}`);
    mocks.startRegistration.mockResolvedValue({ message: "E-posta uygunsa doğrulama bağlantısı gönderildi." });
    render(<AuthCard mode="mentorship-invitation" />);
    fireEvent.change(screen.getByLabelText("Özel e-posta"), { target: { value: "synthetic@example.test" } });
    fireEvent.click(screen.getByRole("button", { name: /Doğrulama e-postası iste/ }));
    await waitFor(() => expect(mocks.startRegistration).toHaveBeenCalledWith({ token, email: "synthetic@example.test", kind: "mentorship_invitation" }));
    expect(window.location.hash).toBe("");
    expect(await screen.findByRole("status")).toHaveTextContent("E-posta uygunsa");
  });

  it("does not submit a malformed bearer fragment", () => {
    window.history.replaceState(null, "", "/access/claim#token=short");
    render(<AuthCard mode="access-code" />);
    expect(screen.getByRole("button", { name: /Doğrulama e-postası iste/ })).toBeDisabled();
    expect(screen.getByRole("alert")).toHaveTextContent("Bağlantı doğrulanamadı");
    expect(mocks.startRegistration).not.toHaveBeenCalled();
  });

  it("offers generic password recovery without account enumeration", async () => {
    mocks.recovery.mockResolvedValue({ message: "E-posta uygunsa parola yenileme bağlantısı gönderildi." });
    render(<AuthCard mode="sign-in" />);
    fireEvent.click(screen.getByRole("button", { name: "Parolamı unuttum" }));
    fireEvent.change(screen.getByLabelText("Özel e-posta"), { target: { value: "synthetic@example.test" } });
    fireEvent.click(screen.getByRole("button", { name: /Yenileme bağlantısı iste/ }));
    expect(await screen.findByRole("status")).toHaveTextContent("E-posta uygunsa");
  });
});
