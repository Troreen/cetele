import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { HabitCard } from "@/components/habit-card";
import { fixtureState } from "@/modules/cetele/fixtures";
import { CETELE_STORAGE_KEY, CeteleProvider } from "@/modules/cetele/store";

describe("HabitCard interactions", () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => { cleanup(); vi.useRealTimers(); });

  it("opens the intentional action menu after a card long press", () => {
    vi.useFakeTimers();
    const assignment = fixtureState.assignments.find((item) => item.id === "mentor-focus");
    if (!assignment) throw new Error("fixture assignment missing");
    render(<CeteleProvider><HabitCard assignment={assignment} /></CeteleProvider>);
    const card = screen.getByRole("article");
    fireEvent.pointerDown(card, { button: 0 });
    act(() => vi.advanceTimersByTime(520));
    expect(screen.getByRole("dialog", { name: "Tefekkür seçenekleri" })).toBeVisible();
  });

  it("manages a reminder for this Habit Assignment from its card", () => {
    const assignment = fixtureState.assignments.find((item) => item.id === "mentor-focus");
    if (!assignment) throw new Error("fixture assignment missing");
    render(<CeteleProvider><HabitCard assignment={assignment} /></CeteleProvider>);

    expect(screen.queryByRole("button", { name: "Tefekkür seçenekleri" })).not.toBeInTheDocument();
    fireEvent.keyDown(screen.getByRole("article"), { key: "F10", shiftKey: true });
    fireEvent.click(screen.getByRole("button", { name: "Tefekkür hatırlatıcısını yönet" }));

    const dialog = screen.getByRole("dialog", { name: "Tefekkür hatırlatıcısı" });
    expect(within(dialog).getByRole("checkbox", { name: "Tefekkür hatırlatıcısını aç" })).toBeChecked();
    expect(within(dialog).getByLabelText("Hatırlatma saati")).toHaveValue("20:30");
  });

  it("keeps only today and yesterday interactive in the history grid", () => {
    const assignment = fixtureState.assignments.find((item) => item.id === "mentor-focus");
    if (!assignment) throw new Error("fixture assignment missing");
    render(<CeteleProvider><HabitCard assignment={assignment} /></CeteleProvider>);
    const grid = screen.getByLabelText("Tefekkür: son 28 gün");
    expect(within(grid).getAllByRole("button")).toHaveLength(2);
    expect(within(grid).getByRole("button", { name: /8 Ağustos Cumartesi/ })).toBeVisible();
    expect(within(grid).getByRole("button", { name: /9 Ağustos Pazar/ })).toBeVisible();
  });

  it("accepts only positive integer amounts for a quantitative completion", () => {
    const assignment = fixtureState.assignments.find((item) => item.id === "mentor-reading");
    if (!assignment) throw new Error("fixture assignment missing");
    render(<CeteleProvider><HabitCard assignment={assignment} /></CeteleProvider>);

    fireEvent.click(screen.getByRole("button", { name: /Günlük okuma: bugün 0 \/ 10\. Miktar gir/ }));
    const amount = screen.getByRole("spinbutton", { name: "Miktar" });
    expect(amount).toHaveAttribute("min", "1");
    expect(amount).toHaveAttribute("step", "1");
    expect(amount).toHaveAttribute("inputmode", "numeric");

    fireEvent.change(amount, { target: { value: "1.5" } });
    fireEvent.submit(amount.closest("form")!);
    expect(screen.getByText("Pozitif bir tam sayı gir.")).toBeVisible();
  });

  it("normalizes a legacy fractional amount when local state hydrates", async () => {
    localStorage.setItem(CETELE_STORAGE_KEY, JSON.stringify({
      ...fixtureState,
      completions: [...fixtureState.completions, {
        assignmentId: "mentor-reading",
        date: fixtureState.today,
        amount: 9.9,
        retrospective: false,
        note: "",
      }],
    }));
    const assignment = fixtureState.assignments.find((item) => item.id === "mentor-reading");
    if (!assignment) throw new Error("fixture assignment missing");

    render(<CeteleProvider><HabitCard assignment={assignment} /></CeteleProvider>);

    await waitFor(() => expect(screen.getByText("10 / 10 bugün kaydedildi")).toBeVisible());
    await waitFor(() => expect(JSON.parse(localStorage.getItem(CETELE_STORAGE_KEY) ?? "null").completions).toContainEqual(expect.objectContaining({
      assignmentId: "mentor-reading",
      date: fixtureState.today,
      amount: 10,
    })));
  });
});
