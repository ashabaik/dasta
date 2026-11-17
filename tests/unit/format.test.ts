import { describe, expect, it } from "vitest";
import { formatMoney, formatMonth, parseEgpToPiastres } from "@/lib/format";

describe("money", () => {
  it("parses what a seller types into piastres", () => {
    expect(parseEgpToPiastres("8,400")).toBe(840000);
    expect(parseEgpToPiastres("8400.5")).toBe(840050);
    expect(parseEgpToPiastres(" 12 750 ")).toBe(1275000);
  });
  it("rejects amounts that are not money", () => {
    for (const bad of ["", "0", "-5", "abc", "1.234", "1e5", "١٢٣"]) expect(parseEgpToPiastres(bad)).toBeNull();
  });
  it("formats piastres with Latin digits", () => {
    expect(formatMoney(840000)).toBe("8,400");
    expect(formatMoney(840050)).toBe("8,400.5");
  });
  it("shows the month a seller joined, never the day", () => {
    expect(formatMonth("2026-11-01", "en")).toBe("Nov 2026");
    expect(formatMonth("2026-11-01", "ar")).not.toMatch(/[٠-٩]/);
  });
});
