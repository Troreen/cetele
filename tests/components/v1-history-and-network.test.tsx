import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { AttentionScreen } from "@/components/screens/attention-screen";
import { NetworkScreen } from "@/components/screens/network-screen";
import { StudentDetailScreen } from "@/components/screens/student-detail-screen";
import { TodayScreen } from "@/components/screens/today-screen";
import { fixtureState } from "@/modules/cetele/fixtures";
import { CeteleProvider } from "@/modules/cetele/store";

describe("V1 history and mentor aggregate surfaces", () => {
  beforeEach(() => {
    localStorage.clear();
    window.history.replaceState(null, "", "/today");
  });
  afterEach(cleanup);

  it("shows exactly the current Monday-through-Sunday week on Today", () => {
    render(<CeteleProvider><TodayScreen /></CeteleProvider>);
    const grid = screen.getByLabelText("Tefekkür: 7 günlük görünüm");
    expect(grid.children).toHaveLength(7);
    expect(within(grid).getByText(/3 Ağustos Pazartesi/)).toBeInTheDocument();
    expect(within(grid).getByRole("button", { name: /9 Ağustos Pazar/ })).toBeInTheDocument();
  });

  it("marks dates before the assignment start as unavailable and not editable", () => {
    const state = {
      ...fixtureState,
      assignments: fixtureState.assignments.map((assignment) => assignment.id === "mentor-focus"
        ? { ...assignment, startedOn: "2026-08-09" }
        : assignment),
    };
    render(<CeteleProvider initialState={state}><TodayScreen /></CeteleProvider>);

    const grid = screen.getByLabelText("Tefekkür: 7 günlük görünüm");
    expect(within(grid).getByText(/8 Ağustos Cumartesi: henüz atanmamıştı/)).toBeInTheDocument();
    expect(within(grid).queryByRole("button", { name: /8 Ağustos Cumartesi/ })).not.toBeInTheDocument();
  });

  it("offers only Week and 6 Months on mentor student history and stores the range in the URL", () => {
    window.history.replaceState(null, "", "/students/zeynep?theme=light&range=week");
    render(<CeteleProvider><StudentDetailScreen studentId="zeynep" /></CeteleProvider>);
    expect(screen.getByLabelText("Günlük okuma: 7 günlük görünüm").children).toHaveLength(7);

    fireEvent.click(screen.getByRole("tab", { name: "6 Ay" }));

    expect(window.location.search).toBe("?theme=light&range=six-months");
    expect(screen.getByLabelText("Günlük okuma: 182 günlük görünüm").children).toHaveLength(182);
  });

  it("keeps an ended student's history visible to their mentor as a read-only grid", () => {
    const ended = {
      ...fixtureState.assignments.find((assignment) => assignment.id === "zeynep-focus")!,
      id: "zeynep-ended-focus",
      status: "ended" as const,
      startedOn: "2026-08-03",
      endedOn: "2026-08-08",
    };
    const state = {
      ...fixtureState,
      assignments: [...fixtureState.assignments, ended],
      completions: [...fixtureState.completions, { assignmentId: ended.id, date: "2026-08-08", amount: null, retrospective: false, note: "" }],
    };

    render(<CeteleProvider initialState={state}><StudentDetailScreen studentId="zeynep" /></CeteleProvider>);

    const history = screen.getByRole("region", { name: "Geçmiş atama kayıtları" });
    const grid = within(history).getByLabelText("Tefekkür: 7 günlük görünüm");
    expect(within(grid).getByText(/8 Ağustos Cumartesi: tamamlandı/)).toBeInTheDocument();
    expect(within(grid).getByText(/9 Ağustos Pazar: atama sona ermişti/)).toBeInTheDocument();
    expect(within(history).getByLabelText("Tefekkür: atama 8 Ağustos Cumartesi tarihinde sona erdi")).toBeInTheDocument();
    expect(within(history).queryByLabelText(/Tefekkür: bugün bekliyor/)).not.toBeInTheDocument();
    expect(within(history).queryByRole("button", { name: /tamamlandı olarak işaretle/ })).not.toBeInTheDocument();
  });

  it("preserves theme and range in Today and Attention workflow links", () => {
    window.history.replaceState(null, "", "/today?theme=light&range=six-months");
    const today = render(<CeteleProvider><TodayScreen /></CeteleProvider>);
    expect(screen.getByRole("link", { name: /Öğrencileri gözden geçir/ })).toHaveAttribute("href", "/students?theme=light&range=six-months");
    today.unmount();

    window.history.replaceState(null, "", "/attention?theme=light&range=six-months");
    render(<CeteleProvider><AttentionScreen /></CeteleProvider>);
    expect(screen.getByRole("link", { name: "Ayşe Yılmaz kaydını aç" })).toHaveAttribute("href", "/students/ayse?theme=light&range=six-months");
  });

  it("shows only aggregate direct-group and branch completion", () => {
    render(<CeteleProvider initialState={{ ...fixtureState, today: "2026-08-08" }}><NetworkScreen /></CeteleProvider>);
    const summary = screen.getByLabelText("Bugünkü grup ve kol özeti");
    expect(within(summary).getByText("Doğrudan grup")).toBeVisible();
    expect(within(summary).getByText("%75")).toBeVisible();
    expect(within(summary).getByText("Tüm kol")).toBeVisible();
    expect(within(summary).getByText("%60")).toBeVisible();
    expect(summary).not.toHaveTextContent("Zeynep Kaya");
  });
});
