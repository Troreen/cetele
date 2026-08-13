import { describe, expect, it } from "vitest";
import { fixtureState } from "@/modules/cetele/fixtures";
import { completionRatio, directStudents } from "@/modules/cetele/selectors";

describe("Çetele mentor summaries", () => {
  it("returns only the current mentor's direct students", () => {
    const tarik = fixtureState.people.find((person) => person.id === fixtureState.currentUserId);

    expect(tarik).toMatchObject({ name: "Tarik", mentorId: "senior" });
    expect(directStudents(fixtureState).map((person) => person.name)).toEqual(["Yunus", "Yusuf", "Bera"]);
    expect(directStudents(fixtureState).map((person) => person.name)).not.toContain("Okan");
  });

  it("excludes whole-day and assignment-scoped Excused Days from today's ratio", () => {
    const assignmentScoped = {
      ...fixtureState,
      excuses: [{ studentId: "zeynep", assignmentId: "zeynep-reading", date: fixtureState.today, note: "", grantedBy: "mentor" }],
    };
    const wholeDay = {
      ...fixtureState,
      excuses: [{ studentId: "zeynep", assignmentId: null, date: fixtureState.today, note: "", grantedBy: "mentor" }],
    };

    expect(completionRatio(assignmentScoped, "zeynep")).toEqual({ done: 0, total: 1 });
    expect(completionRatio(wholeDay, "zeynep")).toEqual({ done: 0, total: 0 });
  });
});
