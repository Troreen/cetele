import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { TodayScreen } from "@/components/screens/today-screen";
import { fixtureState } from "@/modules/cetele/fixtures";
import { CeteleProvider } from "@/modules/cetele/store";

describe("TodayScreen history modes", () => {
  beforeEach(() => {
    localStorage.clear();
    window.history.replaceState(null, "", "/today?theme=dark");
  });

  afterEach(cleanup);

  it("switches between the editable rolling week and each habit's six-month grid", () => {
    const midweekState = { ...fixtureState, today: "2026-08-06" };
    render(<CeteleProvider initialState={midweekState}><TodayScreen /></CeteleProvider>);

    expect(screen.queryByRole("heading", { name: "Bugün" })).not.toBeInTheDocument();
    expect(screen.queryByText("Bugünün kaydı ve altı aylık ilerlemen bir arada.")).not.toBeInTheDocument();
    const tabs = screen.getByRole("tablist", { name: "Ana sayfa görünümü" });
    expect(within(tabs).getByRole("tab", { name: "Hafta görünümü" })).toHaveAttribute("aria-selected", "true");
    expect(within(tabs).queryByText("Hafta")).not.toBeInTheDocument();
    expect(screen.getByText("Son 7 gün")).toBeVisible();
    expect(document.querySelectorAll(".habit-card.compact-list-row")).toHaveLength(2);
    expect(screen.queryByText("Günün kısa muhasebesi")).not.toBeInTheDocument();
    expect(document.querySelectorAll(".habit-card .completion-action")).toHaveLength(0);
    const weeklyGrid = screen.getByLabelText("Tefekkür: 7 günlük görünüm");
    expect(within(weeklyGrid).getByText("31 Temmuz Cuma: henüz atanmamıştı")).toBeInTheDocument();
    expect(within(weeklyGrid).queryByText(/7 Ağustos Cuma/)).not.toBeInTheDocument();
    fireEvent.click(within(weeklyGrid).getByRole("button", { name: /6 Ağustos Perşembe: tamamlandı/ }));
    expect(within(weeklyGrid).getByRole("button", { name: /6 Ağustos Perşembe: bugün bekliyor/ })).toHaveAttribute("aria-pressed", "false");
    expect(screen.queryByRole("link", { name: /geçmişi: güncel seri .* en iyi seri/ })).not.toBeInTheDocument();

    fireEvent.click(within(tabs).getByRole("tab", { name: "6 aylık görünüm" }));

    expect(window.location.search).toBe("?theme=dark&range=six-months");
    expect(screen.getByLabelText("Tefekkür: 182 günlük görünüm")).toBeVisible();
    expect(screen.getAllByLabelText("Ay etiketleri")).toHaveLength(2);
    expect(screen.getByRole("button", { name: "Tefekkür: bugün tamamlandı olarak işaretle" })).toBeVisible();
    expect(screen.getAllByRole("link", { name: /geçmişi: güncel seri .* en iyi seri/ })).toHaveLength(2);
  });
});
