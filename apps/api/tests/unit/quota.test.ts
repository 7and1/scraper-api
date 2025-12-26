import { describe, expect, it } from "vitest";
import {
  checkAndIncrementQuota,
  getQuotaInfo,
  getResetTime,
} from "../../src/services/quota";

// Helper to get reset time for testing
function getTestResetTime(): number {
  return getResetTime();
}

describe("quota service", () => {
  describe("getResetTime", () => {
    it("returns UTC midnight of next day", () => {
      const now = Date.UTC(2024, 0, 15, 14, 30, 0); // Jan 15, 2024 14:30 UTC
      const reset = getResetTime(now);
      const expected = Date.UTC(2024, 0, 16, 0, 0, 0); // Jan 16, 2024 00:00 UTC
      expect(reset).toBe(expected);
    });

    it("handles end of month rollover", () => {
      const now = Date.UTC(2024, 0, 31, 23, 59, 59); // Jan 31, 2024 23:59:59 UTC
      const reset = getResetTime(now);
      const expected = Date.UTC(2024, 1, 1, 0, 0, 0); // Feb 1, 2024 00:00 UTC
      expect(reset).toBe(expected);
    });

    it("handles end of year rollover", () => {
      const now = Date.UTC(2024, 11, 31, 23, 59, 59); // Dec 31, 2024 23:59:59 UTC
      const reset = getResetTime(now);
      const expected = Date.UTC(2025, 0, 1, 0, 0, 0); // Jan 1, 2025 00:00 UTC
      expect(reset).toBe(expected);
    });
  });

  describe("getResetTime defaults", () => {
    it("uses current time when no argument provided", () => {
      const before = Date.now();
      const reset = getResetTime();
      const after = Date.now();
      expect(reset).toBeGreaterThanOrEqual(before);
      expect(reset).toBeLessThanOrEqual(after + 24 * 60 * 60 * 1000);
    });
  });
});
