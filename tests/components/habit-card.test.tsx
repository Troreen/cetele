import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { HabitCard } from "@/components/habit-card";
import { fixtureState } from "@/modules/cetele/fixtures";
import { CeteleProvider } from "@/modules/cetele/store";

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

  it("keeps only today and yesterday interactive in the history grid", () => {
    const assignment = fixtureState.assignments.find((item) => item.id === "mentor-focus");
    if (!assignment) throw new Error("fixture assignment missing");
    render(<CeteleProvider><HabitCard assignment={assignment} /></CeteleProvider>);
    const grid = screen.getByLabelText("Tefekkür: son 28 gün");
    expect(within(grid).getAllByRole("button")).toHaveLength(2);
    expect(within(grid).getByRole("button", { name: /8 Ağustos Cumartesi/ })).toBeVisible();
    expect(within(grid).getByRole("button", { name: /9 Ağustos Pazar/ })).toBeVisible();
  });
});
