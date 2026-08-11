import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { AssignmentDetailScreen } from "@/components/screens/assignment-detail-screen";
import { TodayScreen } from "@/components/screens/today-screen";
import { SettingsScreen } from "@/components/screens/settings-screen";
import { fixtureState } from "@/modules/cetele/fixtures";
import { CeteleProvider } from "@/modules/cetele/store";

describe("AssignmentDetailScreen evidence", () => {
  beforeEach(() => {
    localStorage.clear();
    window.history.replaceState(null, "", "/progress?theme=light&range=week");
  });
  afterEach(cleanup);

  it("keeps an assignment-scoped excuse out of another assignment's streak", () => {
    const state = {
      ...fixtureState,
      completions: [
        { assignmentId: "mentor-reading", date: "2026-08-08", amount: 10, retrospective: false, note: "" },
        { assignmentId: "mentor-reading", date: "2026-08-09", amount: 10, retrospective: false, note: "" },
      ],
      excuses: [
        { studentId: "mentor", assignmentId: "mentor-focus", date: "2026-08-08", note: "", grantedBy: "senior" },
      ],
    };

    render(<CeteleProvider initialState={state}><AssignmentDetailScreen assignmentId="mentor-reading" /></CeteleProvider>);

    const summary = screen.getByRole("region", { name: "Seri özeti" });
    expect(summary).toHaveTextContent("2 Güncel seri");
    expect(summary).toHaveTextContent("2 En iyi seri");
  });

  it("keeps the current streak while today is still pending", () => {
    const state = {
      ...fixtureState,
      completions: [
        { assignmentId: "mentor-reading", date: "2026-08-07", amount: 10, retrospective: false, note: "" },
        { assignmentId: "mentor-reading", date: "2026-08-08", amount: 10, retrospective: false, note: "" },
      ],
    };

    render(<CeteleProvider initialState={state}><AssignmentDetailScreen assignmentId="mentor-reading" /></CeteleProvider>);

    const summary = screen.getByRole("region", { name: "Seri özeti" });
    expect(summary).toHaveTextContent("2 Güncel seri");
  });

  it("places history and streak insights inside every full six-month Habit Assignment card", () => {
    window.history.replaceState(null, "", "/today?theme=light&range=six-months");
    render(<CeteleProvider initialState={fixtureState}><TodayScreen /></CeteleProvider>);

    const cards = screen.getAllByRole("article");
    expect(cards).toHaveLength(2);
    const readingInsights = within(cards[0]).getByRole("link", { name: "Günlük okuma geçmişi: güncel seri 2 gün, en iyi seri 3 gün" });
    const focusInsights = within(cards[1]).getByRole("link", { name: "Tefekkür geçmişi: güncel seri 1 gün, en iyi seri 3 gün" });
    expect(readingInsights).toHaveAttribute("href", "/progress/mentor-reading?theme=light");
    expect(focusInsights).toHaveAttribute("href", "/progress/mentor-focus?theme=light");
    expect(screen.queryByRole("link", { name: /geçmişini ve serilerini aç/ })).not.toBeInTheDocument();
  });

  it("lets General Settings turn month and day grid labels off independently", () => {
    window.history.replaceState(null, "", "/today?theme=light&range=six-months");
    render(<CeteleProvider initialState={fixtureState}><SettingsScreen /><TodayScreen /></CeteleProvider>);

    fireEvent.click(screen.getByRole("checkbox", { name: "Ay etiketlerini göster" }));
    expect(screen.queryByLabelText("Ay etiketleri")).not.toBeInTheDocument();
    expect(screen.getAllByLabelText("Gün etiketleri")).toHaveLength(2);

    fireEvent.click(screen.getByRole("checkbox", { name: "Gün etiketlerini göster" }));
    expect(screen.queryByLabelText("Gün etiketleri")).not.toBeInTheDocument();
  });
});
