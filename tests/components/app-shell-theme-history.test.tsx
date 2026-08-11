import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  usePathname: () => "/today",
}));

vi.mock("@/modules/cetele/actions", () => ({
  signOut: vi.fn(),
}));

import { AppShell } from "@/components/app-shell";
import { SettingsScreen } from "@/components/screens/settings-screen";
import { fixtureState } from "@/modules/cetele/fixtures";
import { CETELE_STORAGE_KEY, CeteleProvider, useCetele } from "@/modules/cetele/store";
import { pushUiState } from "@/modules/cetele/url-state";

function ThemeProbe() {
  const { state, dispatch } = useCetele();
  return <><output aria-label="Etkin tema">{state.theme}</output><button type="button" onClick={() => { pushUiState({ theme: "light" }); dispatch({ type: "theme", theme: "light" }); }}>Açık temayı kaydet</button></>;
}

describe("AppShell theme history", () => {
  beforeEach(() => {
    localStorage.clear();
    window.history.replaceState(null, "", "/today?theme=light");
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("restores the loaded preference when popstate reaches a URL without a theme", async () => {
    localStorage.setItem(CETELE_STORAGE_KEY, JSON.stringify({ ...fixtureState, theme: "dark" }));
    render(<CeteleProvider initialState={{ ...fixtureState, theme: "light" }}><AppShell><ThemeProbe /></AppShell></CeteleProvider>);
    await waitFor(() => expect(screen.getByLabelText("Etkin tema")).toHaveTextContent("light"));

    act(() => {
      window.history.replaceState(null, "", "/today");
      window.dispatchEvent(new PopStateEvent("popstate"));
    });

    await waitFor(() => expect(screen.getByLabelText("Etkin tema")).toHaveTextContent("dark"));
    expect(document.documentElement).toHaveAttribute("data-theme", "dark");
  });

  it("keeps the newly saved preference when Back reaches a URL without a theme", async () => {
    window.history.replaceState(null, "", "/today");
    render(<CeteleProvider initialState={{ ...fixtureState, theme: "dark" }}><AppShell><ThemeProbe /></AppShell></CeteleProvider>);

    fireEvent.click(screen.getByRole("button", { name: "Açık temayı kaydet" }));
    await waitFor(() => expect(screen.getByLabelText("Etkin tema")).toHaveTextContent("light"));
    expect(JSON.parse(localStorage.getItem(CETELE_STORAGE_KEY) ?? "null")).toMatchObject({ theme: "light" });

    act(() => {
      window.history.replaceState(null, "", "/today");
      window.dispatchEvent(new PopStateEvent("popstate"));
    });

    await waitFor(() => expect(screen.getByLabelText("Etkin tema")).toHaveTextContent("light"));
    expect(document.documentElement).toHaveAttribute("data-theme", "light");
    expect(JSON.parse(localStorage.getItem(CETELE_STORAGE_KEY) ?? "null")).toMatchObject({ theme: "light" });
  });

  it("persists an already-active shared-link theme as the new Back fallback", async () => {
    localStorage.setItem(CETELE_STORAGE_KEY, JSON.stringify({ ...fixtureState, theme: "dark" }));
    render(<CeteleProvider initialState={{ ...fixtureState, theme: "dark" }}><AppShell><ThemeProbe /><SettingsScreen /></AppShell></CeteleProvider>);
    await waitFor(() => expect(screen.getByLabelText("Etkin tema")).toHaveTextContent("light"));

    fireEvent.click(screen.getByRole("button", { name: "Açık" }));
    expect(JSON.parse(localStorage.getItem(CETELE_STORAGE_KEY) ?? "null")).toMatchObject({ theme: "light" });

    act(() => {
      window.history.replaceState(null, "", "/today");
      window.dispatchEvent(new PopStateEvent("popstate"));
    });

    await waitFor(() => expect(screen.getByLabelText("Etkin tema")).toHaveTextContent("light"));
    expect(document.documentElement).toHaveAttribute("data-theme", "light");
    expect(JSON.parse(localStorage.getItem(CETELE_STORAGE_KEY) ?? "null")).toMatchObject({ theme: "light" });
  });

  it("opens the notification summary and its settings route from the bell", async () => {
    render(<CeteleProvider initialState={fixtureState}><AppShell><div /></AppShell></CeteleProvider>);

    fireEvent.click(screen.getByRole("button", { name: "Bildirimler" }));

    const dialog = screen.getByRole("dialog", { name: "Bildirimler" });
    expect(within(dialog).getByText((_, element) => element?.tagName === "P" && element.textContent === " Günlük okuma · 20:30")).toBeVisible();
    expect(within(dialog).getByText((_, element) => element?.tagName === "P" && element.textContent === " Tefekkür · 20:30")).toBeVisible();
    expect(within(dialog).getByText("Mentor inceleme hatırlatıcısı 21:00 için açık.")).toBeVisible();
    expect(within(dialog).getByRole("link", { name: "Bildirim ayarlarını aç" })).toHaveAttribute("href", "/settings?theme=light");
  });

  it("opens account controls from the top-right profile button", () => {
    render(<CeteleProvider initialState={fixtureState}><AppShell><div /></AppShell></CeteleProvider>);

    fireEvent.click(screen.getByRole("button", { name: "Hesap menüsü: Tarik" }));

    const dialog = screen.getByRole("dialog", { name: "Hesabım" });
    expect(within(dialog).getByText("Tarik")).toBeVisible();
    expect(within(dialog).getByRole("link", { name: "Ayarları aç" })).toHaveAttribute("href", "/settings?theme=light");
    expect(within(dialog).getByRole("button", { name: "Çıkış yap" })).toBeVisible();
  });

  it("keeps Today and Progress together as one navigation destination", () => {
    render(<CeteleProvider initialState={fixtureState}><AppShell><div /></AppShell></CeteleProvider>);

    expect(within(screen.getByRole("complementary", { name: "Ana menü" })).queryByRole("link", { name: "İlerlemem" })).not.toBeInTheDocument();
    expect(within(screen.getByRole("navigation", { name: "Mobil menü" })).queryByRole("link", { name: "İlerlemem" })).not.toBeInTheDocument();
  });
});
