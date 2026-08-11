import { beforeEach, describe, expect, it } from "vitest";
import { hrefWithUiState, pushUiState, readHistoryRange, readTheme } from "@/modules/cetele/url-state";

describe("URL-backed UI state", () => {
  beforeEach(() => window.history.replaceState(null, "", "/progress"));

  it("accepts only supported theme and range values", () => {
    expect(readTheme("?theme=light")).toBe("light");
    expect(readTheme("?theme=neon")).toBeNull();
    expect(readHistoryRange("?range=six-months")).toBe("six-months");
    expect(readHistoryRange("?range=year")).toBeNull();
  });

  it("preserves theme and range through state changes and relevant links", () => {
    window.history.replaceState(null, "", "/progress?theme=light&range=week&debug=1");
    pushUiState({ range: "six-months" });
    expect(window.location.search).toBe("?theme=light&range=six-months&debug=1");
    expect(hrefWithUiState("/students/ayse", window.location.search)).toEqual({
      pathname: "/students/ayse",
      query: { theme: "light", range: "six-months" },
      hash: undefined,
    });
  });

  it("keeps internal paths inside the generated Next route contract", () => {
    if (false) {
      // @ts-expect-error Invalid internal routes must fail the typed-routes gate.
      hrefWithUiState("/not-a-cetele-route", "");
    }
  });
});
