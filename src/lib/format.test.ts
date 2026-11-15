import { describe, expect, it } from "vitest";
import { formatDate, formatDateTime, formatMoney, formatNumber, isRtl, parseDate, todayIso } from "./format";

describe("formatMoney", () => {
  it("formats DJF with no decimals", () => {
    const s = formatMoney(1234567.6, "DJF", "en");
    expect(s).toContain("DJF");
    expect(s).toContain("1,234,568");
    expect(s).not.toMatch(/\.\d/);
  });
  it("formats ETB and USD with two decimals", () => {
    expect(formatMoney(1234.5, "ETB", "en")).toContain("1,234.50");
    expect(formatMoney(0.1 + 0.2, "USD", "en")).toContain("0.30");
  });
  it("uses French grouping in French", () => {
    const s = formatMoney(1234567, "DJF", "fr").replace(/\s/g, " ");
    expect(s).toContain("1 234 567");
  });
  it("keeps Latin digits in Arabic", () => {
    expect(formatMoney(1500, "DJF", "ar")).toMatch(/1.?500/);
  });
  it("shows a dash for missing values", () => {
    expect(formatMoney(null, "DJF", "fr")).toBe("—");
    expect(formatMoney(Number.NaN, "DJF", "fr")).toBe("—");
  });
});

describe("formatNumber", () => {
  it("limits decimals", () => {
    expect(formatNumber(12.34567, "en")).toBe("12.346");
    expect(formatNumber(12, "en", 3, 2)).toBe("12.00");
  });
});

describe("formatDate", () => {
  it("formats SQL dates as dd/mm/yyyy without shifting", () => {
    expect(formatDate("2026-01-05")).toBe("05/01/2026");
  });
  it("formats timestamps in Africa/Djibouti by default", () => {
    // 22:30 UTC on 31 Dec is already 1 Jan in Djibouti (UTC+3)
    expect(formatDate("2025-12-31T22:30:00Z")).toBe("01/01/2026");
    expect(formatDate("2025-12-31T22:30:00Z", "UTC")).toBe("31/12/2025");
  });
  it("formats date-times in 24 h", () => {
    expect(formatDateTime("2026-03-10T05:07:00Z")).toBe("10/03/2026 08:07");
  });
  it("handles empty and invalid input", () => {
    expect(formatDate(null)).toBe("—");
    expect(formatDate("not a date")).toBe("—");
  });
});

describe("parseDate", () => {
  it("parses dd/mm/yyyy", () => {
    expect(parseDate("05/01/2026")).toBe("2026-01-05");
    expect(parseDate("5/1/2026")).toBe("2026-01-05");
  });
  it("rejects impossible dates", () => {
    expect(parseDate("31/02/2026")).toBeNull();
    expect(parseDate("2026-01-05")).toBeNull();
  });
});

describe("todayIso", () => {
  it("uses the given time zone", () => {
    const now = new Date("2026-06-30T22:00:00Z");
    expect(todayIso("Africa/Djibouti", now)).toBe("2026-07-01");
    expect(todayIso("UTC", now)).toBe("2026-06-30");
  });
});

describe("isRtl", () => {
  it("is true only for Arabic", () => {
    expect(isRtl("ar")).toBe(true);
    expect(isRtl("fr")).toBe(false);
    expect(isRtl("so")).toBe(false);
  });
});
