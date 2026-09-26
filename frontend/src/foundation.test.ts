import { describe, expect, it } from "vitest";
import { themes } from "./theme/theme";

describe("Nexus foundations", () => {
  it("ships two validated, structurally compatible themes", () => {
    expect(Object.keys(themes)).toEqual(["obsidienne", "solaris"]);
    expect(themes.obsidienne.id).not.toBe(themes.solaris.id);
  });
});
