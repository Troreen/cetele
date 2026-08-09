import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { AssignmentDetailScreen } from "@/components/screens/assignment-detail-screen";
import { fixtureState } from "@/modules/cetele/fixtures";
import { CeteleProvider } from "@/modules/cetele/store";

describe("AssignmentDetailScreen evidence", () => {
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
});
