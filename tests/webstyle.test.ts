import { describe, expect, it } from "vitest";
import { flattenWebStyle } from "../src/ui/webstyle";

describe("flattenWebStyle", () => {
  it("returns undefined for empty input", () => {
    expect(flattenWebStyle(undefined)).toBeUndefined();
  });

  it("deep-flattens nested arrays so no indexed keys reach the DOM", () => {
    const flat = flattenWebStyle([{ width: 10 }, [{ height: 20 }, null, false, [{ opacity: 0.5 }]] as never]);
    expect(flat).toEqual({ width: 10, height: 20, opacity: 0.5 });
    expect(Object.keys(flat!).every((k) => Number.isNaN(Number(k)))).toBe(true);
  });

  it("strips RNW compiler metadata", () => {
    const flat = flattenWebStyle({ $$css: true, width: "92%" } as never);
    expect(flat).toEqual({ width: "92%" });
  });

  it("later entries win", () => {
    expect(flattenWebStyle([{ width: 1 }, { width: 2 }])).toEqual({ width: 2 });
  });
});
