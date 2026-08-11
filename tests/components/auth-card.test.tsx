import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { renderToString } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  push: vi.fn(),
  claimManualInvitation: vi.fn(),
  signInWithPassword: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mocks.push }),
}));

vi.mock("@/modules/cetele/actions", () => ({
  claimManualInvitation: mocks.claimManualInvitation,
  signInWithPassword: mocks.signInWithPassword,
}));

import { AuthCard } from "@/components/auth-card";

const TOKEN = "A".repeat(43);

describe("AuthCard", () => {
  const previousAdapter = process.env.NEXT_PUBLIC_CETELE_DATA_ADAPTER;

  beforeEach(() => {
    process.env.NEXT_PUBLIC_CETELE_DATA_ADAPTER = "supabase";
    window.history.replaceState(null, "", "/");
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
    if (previousAdapter === undefined) delete process.env.NEXT_PUBLIC_CETELE_DATA_ADAPTER;
    else process.env.NEXT_PUBLIC_CETELE_DATA_ADAPTER = previousAdapter;
  });

  it("replaces a raw provider sign-in failure with natural Turkish copy", async () => {
    mocks.signInWithPassword.mockRejectedValueOnce(new Error("Invalid login credentials"));
    render(<AuthCard mode="sign-in" />);

    fireEvent.change(screen.getByLabelText("E-posta"), { target: { value: "user@example.com" } });
    fireEvent.change(screen.getByLabelText("Parola"), { target: { value: "a-secure-password" } });
    fireEvent.click(screen.getByRole("button", { name: /Giriş yap/ }));

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("E-posta veya parola doğrulanamadı. Lütfen tekrar dene.");
    expect(alert).not.toHaveTextContent("Invalid login credentials");
    expect(mocks.push).not.toHaveBeenCalled();
  });

  it("reads the claim token from the fragment and scrubs it after success", async () => {
    window.history.replaceState(null, "", `/invite/accept#token=${TOKEN}`);
    mocks.claimManualInvitation.mockResolvedValueOnce({ outcome: "signed-in" });
    render(<AuthCard mode="claim" />);

    fireEvent.change(screen.getByLabelText("E-posta"), { target: { value: "student@example.com" } });
    fireEvent.change(screen.getByLabelText("Parola"), { target: { value: "a-secure-password" } });
    fireEvent.change(screen.getByLabelText("Parola tekrarı"), { target: { value: "a-secure-password" } });
    const submit = await screen.findByRole("button", { name: /Daveti kabul et/ });
    await waitFor(() => expect(submit).toBeEnabled());
    fireEvent.click(submit);

    await waitFor(() => expect(mocks.claimManualInvitation).toHaveBeenCalledWith({
      token: TOKEN,
      email: "student@example.com",
      password: "a-secure-password",
      passwordConfirmation: "a-secure-password",
    }));
    expect(window.location.hash).toBe("");
    expect(mocks.push).toHaveBeenCalledWith("/today");
  });

  it("shows truthful recovery copy when account cleanup is required", async () => {
    window.history.replaceState(null, "", `/invite/accept#token=${TOKEN}`);
    mocks.claimManualInvitation.mockResolvedValueOnce({ outcome: "cleanup-required" });
    render(<AuthCard mode="claim" />);

    fireEvent.change(screen.getByLabelText("E-posta"), { target: { value: "student@example.com" } });
    fireEvent.change(screen.getByLabelText("Parola"), { target: { value: "a-secure-password" } });
    fireEvent.change(screen.getByLabelText("Parola tekrarı"), { target: { value: "a-secure-password" } });
    const submit = await screen.findByRole("button", { name: /Daveti kabul et/ });
    await waitFor(() => expect(submit).toBeEnabled());
    fireEvent.click(submit);

    expect(await screen.findByRole("alert")).toHaveTextContent("Çetele yöneticisinden yardım iste");
    expect(screen.getByRole("link", { name: "Giriş ekranına dön" })).toHaveAttribute("href", "/sign-in");
    expect(window.location.hash).toBe("");
    expect(mocks.push).not.toHaveBeenCalled();
  });

  it("shows sign-in recovery copy when the claim committed without a session", async () => {
    window.history.replaceState(null, "", `/invite/accept#token=${TOKEN}`);
    mocks.claimManualInvitation.mockResolvedValueOnce({ outcome: "sign-in-required" });
    render(<AuthCard mode="claim" />);

    fireEvent.change(screen.getByLabelText("E-posta"), { target: { value: "student@example.com" } });
    fireEvent.change(screen.getByLabelText("Parola"), { target: { value: "a-secure-password" } });
    fireEvent.change(screen.getByLabelText("Parola tekrarı"), { target: { value: "a-secure-password" } });
    const submit = await screen.findByRole("button", { name: /Daveti kabul et/ });
    await waitFor(() => expect(submit).toBeEnabled());
    fireEvent.click(submit);

    expect(await screen.findByRole("status")).toHaveTextContent("Belirlediğin e-posta ve parola ile giriş yapabilirsin");
    expect(screen.getByRole("link", { name: /Giriş ekranına git/ })).toHaveAttribute("href", "/sign-in");
    expect(window.location.hash).toBe("");
    expect(mocks.push).not.toHaveBeenCalled();
  });

  it("does not announce an invalid token before the client reads the fragment", () => {
    window.history.replaceState(null, "", `/invite/accept#token=${TOKEN}`);

    expect(renderToString(<AuthCard mode="claim" />)).not.toContain("role=\"alert\"");
  });

  it("does not submit a malformed fragment token", async () => {
    window.history.replaceState(null, "", "/invite/accept#token=too-short");
    render(<AuthCard mode="claim" />);

    expect(await screen.findByRole("alert")).toHaveTextContent("Davet tamamlanamadı");
    expect(screen.getByRole("button", { name: /Daveti kabul et/ })).toBeDisabled();
    expect(mocks.claimManualInvitation).not.toHaveBeenCalled();
  });
});
