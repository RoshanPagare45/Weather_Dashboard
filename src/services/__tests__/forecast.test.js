import { describe, it, expect } from "vitest";
import { getWeatherCondition, safeNumber } from "../forecast.js";

describe("safeNumber", () => {
    it("returns null for null, undefined and NaN input", () => {
        expect(safeNumber(null)).toBeNull();
        expect(safeNumber(undefined)).toBeNull();
        expect(safeNumber("abc")).toBeNull();
    });

    it("converts numeric values", () => {
        expect(safeNumber("12.5")).toBe(12.5);
        expect(safeNumber(0)).toBe(0);
    });
});

describe("getWeatherCondition", () => {
    it("maps code 0 to clear", () => {
        expect(getWeatherCondition(0).type).toBe("clear");
    });

    it("maps fog codes", () => {
        expect(getWeatherCondition(45).type).toBe("fog");
        expect(getWeatherCondition(48).type).toBe("fog");
    });

    it("always returns a label and icon", () => {
        for (const code of [0, 1, 3, 45, 51, 61, 71, 80, 95, 999]) {
            const result = getWeatherCondition(code);
            expect(result.label).toBeTruthy();
            expect(result.icon).toBeTruthy();
        }
    });
});
