import { describe, expect, it } from "vitest";
import {
  adoptSharedHabit,
  canEditCompletion,
  calculateStreaks,
  deriveAttention,
  isMeaningfulCompletion,
  previousDomainDate,
  visibilityFor,
} from "@/modules/cetele/policy";
import { fixtureState } from "@/modules/cetele/fixtures";
import { reduceCeteleState } from "@/modules/cetele/store";

describe("Çetele policy interface", () => {
  it("allows a student to edit only today and yesterday in their local calendar", () => {
    expect(canEditCompletion("2026-08-09", "2026-08-09")).toBe(true);
    expect(canEditCompletion("2026-08-08", "2026-08-09")).toBe(true);
    expect(canEditCompletion("2026-08-07", "2026-08-09")).toBe(false);
    expect(canEditCompletion("2026-08-10", "2026-08-09")).toBe(false);
  });

  it("derives yesterday across month and year boundaries without browser timezone drift", () => {
    expect(previousDomainDate("2026-03-01")).toBe("2026-02-28");
    expect(previousDomainDate("2026-01-01")).toBe("2025-12-31");
  });

  it("counts any positive quantitative effort as meaningful without hiding target progress", () => {
    expect(isMeaningfulCompletion({ mode: "quantitative", amount: 1, target: 20 })).toBe(true);
    expect(isMeaningfulCompletion({ mode: "quantitative", amount: 0, target: 20 })).toBe(false);
    expect(isMeaningfulCompletion({ mode: "binary", amount: null, target: null })).toBe(true);
  });

  it("creates attention on day three, invalidates it after a real correction, and does not clear it from later improvement", () => {
    const misses = ["2026-08-06", "2026-08-07"];
    expect(deriveAttention(misses, [], "2026-08-08")).toEqual({ state: "open", triggerDates: misses });
    expect(deriveAttention(misses, ["2026-08-07"], "2026-08-08")).toEqual({ state: "invalidated", triggerDates: misses });
    expect(deriveAttention(misses, ["2026-08-08"], "2026-08-08")).toEqual({ state: "open", triggerDates: misses });
  });

  it("lets an excused day bridge a streak without extending it", () => {
    expect(calculateStreaks([
      { date: "2026-08-05", state: "completed" },
      { date: "2026-08-06", state: "excused" },
      { date: "2026-08-07", state: "completed" },
    ])).toEqual({ current: 2, best: 2 });
  });

  it("allows individual records upward but never sideways", () => {
    const parents = new Map([["student", "mentor"], ["mentor", "senior"], ["peer", "mentor"]]);
    expect(visibilityFor("student", "student", parents)).toBe("subject");
    expect(visibilityFor("mentor", "student", parents)).toBe("mentor-above");
    expect(visibilityFor("senior", "student", parents)).toBe("mentor-above");
    expect(visibilityFor("peer", "student", parents)).toBe("none");
  });

  it("adopts a shared habit as an independent attributed copy", () => {
    const source = { id: "source", authorId: "mentor-a", name: "Günlük okuma", guide: "On sayfa oku" };
    const adopted = adoptSharedHabit(source, "mentor-b", "copy");
    source.guide = "Yirmi sayfa oku";
    expect(adopted).toEqual({ id: "copy", authorId: "mentor-b", sourceDefinitionId: "source", sourceAuthorId: "mentor-a", name: "Günlük okuma", guide: "On sayfa oku" });
  });

  it("keeps a student-level attention item open until every contributing miss is corrected", () => {
    const state = { ...fixtureState, attention: [{ ...fixtureState.attention[0], contributingAssignmentIds: ["ayse-reading", "ayse-focus"] }] };
    const corrected = reduceCeteleState(state, { type: "complete-yesterday", assignmentId: "ayse-reading", note: "", amount: 1 });
    expect(corrected.attention[0]).toMatchObject({ state: "open", assignmentId: "ayse-focus", contributingAssignmentIds: ["ayse-focus"] });
  });

  it("reconciles a whole-day excuse against every contributing miss in the local adapter", () => {
    const state = { ...fixtureState, attention: [{ ...fixtureState.attention[0], contributingAssignmentIds: ["ayse-reading", "ayse-focus"] }] };
    const excused = reduceCeteleState(state, { type: "excuse", studentId: "ayse", assignmentId: null, date: "2026-08-08", note: "" });
    expect(excused.attention[0].state).toBe("invalidated");
  });

  it("reopens an invalidated attention item when yesterday's correction is removed", () => {
    const state = { ...fixtureState,
      completions: [...fixtureState.completions, { assignmentId: "ayse-reading", date: "2026-08-08", amount: 10, retrospective: true, note: "" }],
      attention: [{ ...fixtureState.attention[0], state: "invalidated" as const, contributingAssignmentIds: ["ayse-reading"] }],
    };
    const reopened = reduceCeteleState(state, { type: "remove-completion", assignmentId: "ayse-reading", date: "2026-08-08" });
    expect(reopened.attention[0]).toMatchObject({ state: "open", contributingAssignmentIds: ["ayse-reading"] });
  });

  it("upserts a quantitative completion without creating duplicate day records", () => {
    const first = reduceCeteleState(fixtureState, { type: "record-completion", assignmentId: "mentor-reading", date: fixtureState.today, amount: 7, note: "İlk kayıt" });
    const updated = reduceCeteleState(first, { type: "record-completion", assignmentId: "mentor-reading", date: fixtureState.today, amount: 12, note: "Düzeltildi" });
    const today = updated.completions.filter((item) => item.assignmentId === "mentor-reading" && item.date === fixtureState.today);
    expect(today).toEqual([{ assignmentId: "mentor-reading", date: fixtureState.today, amount: 12, retrospective: false, note: "Düzeltildi" }]);
  });

  it("persists an explicit assignment order without changing mentor-owned habit fields", () => {
    const reordered = reduceCeteleState(fixtureState, { type: "reorder-assignments", orderedIds: ["mentor-focus", "mentor-reading"] });
    expect(reordered.assignments.find((item) => item.id === "mentor-focus")).toMatchObject({ definitionId: "focus", target: null, order: 0 });
    expect(reordered.assignments.find((item) => item.id === "mentor-reading")).toMatchObject({ definitionId: "reading", target: 10, order: 1 });
  });

  it("voids a mistaken assignment without a Completion and ends one with history", () => {
    const voided = reduceCeteleState(fixtureState, { type: "end-assignment", assignmentId: "ayse-reading" });
    expect(voided.assignments.some((item) => item.id === "ayse-reading")).toBe(false);

    const ended = reduceCeteleState(fixtureState, { type: "end-assignment", assignmentId: "mentor-reading" });
    expect(ended.assignments.find((item) => item.id === "mentor-reading")?.status).toBe("ended");
    expect(ended.completions.filter((item) => item.assignmentId === "mentor-reading")).toEqual(
      fixtureState.completions.filter((item) => item.assignmentId === "mentor-reading"),
    );
  });

  it("removes a terminal assignment from every open Needs Attention contributor set", () => {
    const attention = [{
      ...fixtureState.attention[0],
      assignmentId: "ayse-reading",
      contributingAssignmentIds: ["ayse-reading", "ayse-focus"],
    }];
    const withHistoricalCompletion = {
      ...fixtureState,
      completions: [...fixtureState.completions, {
        assignmentId: "ayse-reading",
        date: "2026-08-01",
        amount: 10,
        retrospective: false,
        note: "",
      }],
      attention,
    };

    const ended = reduceCeteleState(withHistoricalCompletion, { type: "end-assignment", assignmentId: "ayse-reading" });
    expect(ended.attention[0]).toMatchObject({
      state: "open",
      assignmentId: "ayse-focus",
      contributingAssignmentIds: ["ayse-focus"],
    });

    const voided = reduceCeteleState({ ...fixtureState, attention: [{ ...attention[0], contributingAssignmentIds: ["ayse-reading"] }] }, { type: "end-assignment", assignmentId: "ayse-reading" });
    expect(voided.attention[0].state).toBe("invalidated");
  });
});
