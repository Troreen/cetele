import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({
  notFound: vi.fn(() => {
    throw new Error("NEXT_NOT_FOUND");
  }),
}));

vi.mock("next/navigation", () => ({ notFound: mocks.notFound }));
vi.mock("@/components/screens/assignment-detail-screen", () => ({ AssignmentDetailScreen: () => null }));
vi.mock("@/components/screens/student-detail-screen", () => ({ StudentDetailScreen: () => null }));

import AssignmentPage from "@/app/(app)/progress/[assignmentId]/page";
import StudentPage from "@/app/(app)/students/[studentId]/page";

describe("route input boundaries", () => {
  const previousAdapter = process.env.NEXT_PUBLIC_CETELE_DATA_ADAPTER;

  beforeEach(() => {
    process.env.NEXT_PUBLIC_CETELE_DATA_ADAPTER = "supabase";
  });

  afterEach(() => {
    vi.clearAllMocks();
    if (previousAdapter === undefined) delete process.env.NEXT_PUBLIC_CETELE_DATA_ADAPTER;
    else process.env.NEXT_PUBLIC_CETELE_DATA_ADAPTER = previousAdapter;
  });

  it("rejects malformed hosted UUID route parameters", async () => {
    await expect(AssignmentPage({ params: Promise.resolve({ assignmentId: "not-a-uuid" }) })).rejects.toThrow("NEXT_NOT_FOUND");
    await expect(StudentPage({ params: Promise.resolve({ studentId: "not-a-uuid" }) })).rejects.toThrow("NEXT_NOT_FOUND");
    expect(mocks.notFound).toHaveBeenCalledTimes(2);
  });

  it("keeps deterministic local fixture identifiers available", async () => {
    process.env.NEXT_PUBLIC_CETELE_DATA_ADAPTER = "local";
    await expect(AssignmentPage({ params: Promise.resolve({ assignmentId: "mentor-reading" }) })).resolves.toBeTruthy();
    await expect(StudentPage({ params: Promise.resolve({ studentId: "ayse" }) })).resolves.toBeTruthy();
  });
});
