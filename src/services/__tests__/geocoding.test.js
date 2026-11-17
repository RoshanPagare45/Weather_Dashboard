import { describe, it, expect } from "vitest";
import {
    deriveNameFromAddress,
    deriveDetailedAddress
} from "../geocoding.js";

describe("deriveNameFromAddress", () => {
    it("prefers city over other fields", () => {
        expect(
            deriveNameFromAddress(
                { city: "Pune", state: "Maharashtra" },
                "x, y",
                null
            )
        ).toBe("Pune");
    });

    it("strips administrative suffixes", () => {
        expect(
            deriveNameFromAddress(
                { county: "Nashik Rural" },
                "",
                null
            )
        ).toBe("Nashik");
    });

    it("falls back to the first part of display_name", () => {
        expect(
            deriveNameFromAddress({}, "Somewhere, Else", null)
        ).toBe("Somewhere");
    });

    it("uses the fallback when nothing is available", () => {
        expect(deriveNameFromAddress({}, "", "Fallback")).toBe(
            "Fallback"
        );
    });
});

describe("deriveDetailedAddress", () => {
    it("joins area and city", () => {
        expect(
            deriveDetailedAddress(
                { suburb: "Kothrud", city: "Pune" },
                ""
            )
        ).toBe("Kothrud, Pune");
    });

    it("does not repeat identical area and city", () => {
        expect(
            deriveDetailedAddress(
                { suburb: "Pune", city: "Pune" },
                ""
            )
        ).toBe("Pune");
    });

    it("falls back to the generic name", () => {
        expect(
            deriveDetailedAddress({ state: "Goa" }, "")
        ).toBe("Goa");
    });
});
