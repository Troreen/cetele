import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { HabitCard } from "@/components/habit-card";
import { fixtureState } from "@/modules/cetele/fixtures";
import { browserNavigation, CeteleProvider, useCetele } from "@/modules/cetele/store";
import type { Action } from "@/modules/cetele/store";

describe("CeteleProvider hosted persistence", () => {
  afterEach(cleanup);

  it("surfaces a handled Turkish error without optimistic hosted state", async () => {
    const rejectPersistence = async () => { throw new Error("network unavailable"); };
    let dispatch: ((action: Action) => void) | undefined;
    function StateProbe() {
      const store = useCetele();
      dispatch = store.dispatch;
      const completed = store.state.completions.some((item) => item.assignmentId === "mentor-focus" && item.date === store.state.today);
      return <output aria-label="Bugünkü Tefekkür kaydı">{completed ? "tamamlandı" : "bekliyor"}</output>;
    }

    render(<CeteleProvider adapter="supabase" persist={rejectPersistence}><StateProbe /></CeteleProvider>);
    await (dispatch?.({ type: "toggle-completion", assignmentId: "mentor-focus" }) as unknown as Promise<void>);

    expect(screen.getByLabelText("Bugünkü Tefekkür kaydı")).toHaveTextContent("bekliyor");
    expect(await screen.findByRole("alert")).toHaveTextContent("Değişiklik kaydedilemedi. Lütfen tekrar deneyin.");
  });

  it("reloads after successful hosted persistence", async () => {
    const persist = vi.fn().mockResolvedValue(undefined);
    const reload = vi.spyOn(browserNavigation, "reload").mockImplementation(() => undefined);
    const assignment = fixtureState.assignments.find((item) => item.id === "mentor-focus");
    if (!assignment) throw new Error("fixture assignment missing");

    render(<CeteleProvider adapter="supabase" persist={persist}><HabitCard assignment={assignment} /></CeteleProvider>);
    await act(async () => fireEvent.click(screen.getByRole("button", { name: "Tefekkür: bugün tamamlandı olarak işaretle" })));

    await waitFor(() => expect(reload).toHaveBeenCalledOnce());
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});
