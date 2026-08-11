import { describe, expect, it } from "vitest";
import { fixtureState } from "@/modules/cetele/fixtures";
import { branchStudents, completionRatio, directStudents } from "@/modules/cetele/selectors";

describe("Çetele mentor summaries", () => {
  it("models Tarik as a student and senior mentor over the requested three junior branches", () => {
    const tarik = fixtureState.people.find((person) => person.id === fixtureState.currentUserId);

    expect(tarik).toMatchObject({ name: "Tarik", mentorId: "senior" });
    expect(directStudents(fixtureState).map((person) => person.name)).toEqual(["Yunus", "Yusuf", "Bera"]);
    expect(directStudents(fixtureState, "ayse").map((person) => person.name)).toEqual(["Ilyas", "Okan", "Akif", "Mustafa", "Eyup", "Aslan"]);
    expect(directStudents(fixtureState, "zeynep").map((person) => person.name)).toEqual(["Yusuf Ahmet", "Yusuf Ismail", "Selim", "Berat"]);
    expect(directStudents(fixtureState, "eren").map((person) => person.name)).toEqual(["Emin", "Murat", "Batuhan"]);
    expect(branchStudents(fixtureState)).toHaveLength(16);
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
