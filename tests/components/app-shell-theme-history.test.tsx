import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
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
import { CeteleProvider, useCetele } from "@/modules/cetele/store";
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
    localStorage.setItem("cetele-v1-state", JSON.stringify({ ...fixtureState, theme: "dark" }));
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
    expect(JSON.parse(localStorage.getItem("cetele-v1-state") ?? "null")).toMatchObject({ theme: "light" });

    act(() => {
      window.history.replaceState(null, "", "/today");
      window.dispatchEvent(new PopStateEvent("popstate"));
    });

    await waitFor(() => expect(screen.getByLabelText("Etkin tema")).toHaveTextContent("light"));
    expect(document.documentElement).toHaveAttribute("data-theme", "light");
    expect(JSON.parse(localStorage.getItem("cetele-v1-state") ?? "null")).toMatchObject({ theme: "light" });
  });

  it("persists an already-active shared-link theme as the new Back fallback", async () => {
    localStorage.setItem("cetele-v1-state", JSON.stringify({ ...fixtureState, theme: "dark" }));
    render(<CeteleProvider initialState={{ ...fixtureState, theme: "dark" }}><AppShell><ThemeProbe /><SettingsScreen /></AppShell></CeteleProvider>);
    await waitFor(() => expect(screen.getByLabelText("Etkin tema")).toHaveTextContent("light"));

    fireEvent.click(screen.getByRole("button", { name: "Açık" }));
    expect(JSON.parse(localStorage.getItem("cetele-v1-state") ?? "null")).toMatchObject({ theme: "light" });

    act(() => {
      window.history.replaceState(null, "", "/today");
      window.dispatchEvent(new PopStateEvent("popstate"));
    });

    await waitFor(() => expect(screen.getByLabelText("Etkin tema")).toHaveTextContent("light"));
    expect(document.documentElement).toHaveAttribute("data-theme", "light");
    expect(JSON.parse(localStorage.getItem("cetele-v1-state") ?? "null")).toMatchObject({ theme: "light" });
  });
});
