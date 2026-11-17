import { describe, it, expect } from "vitest";
import { cToF, convertWeatherUnits } from "../units.js";

describe("cToF", () => {
    it("converts known values", () => {
        expect(cToF(0)).toBe(32);
        expect(cToF(100)).toBe(212);
        expect(cToF(-40)).toBe(-40);
    });

    it("passes through non-numbers", () => {
        expect(cToF(null)).toBeNull();
    });
});

describe("convertWeatherUnits", () => {
    const weather = {
        current: { temperature_2m: 20, apparent_temperature: 25 },
        currentUnits: { temperature_2m: "°C", apparent_temperature: "°C" },
        currentWeather: { temperature: 20, apparentTemperature: 25 },
        forecast: [{ maxTemperature: 30, minTemperature: 10 }],
        historical: [{ maxTemperature: 0, minTemperature: null }]
    };

    it("returns the same object for Celsius", () => {
        expect(convertWeatherUnits(weather, "C")).toBe(weather);
    });

    it("converts every temperature field for Fahrenheit", () => {
        const f = convertWeatherUnits(weather, "F");
        expect(f.current.temperature_2m).toBe(68);
        expect(f.currentUnits.temperature_2m).toBe("°F");
        expect(f.currentWeather.apparentTemperature).toBe(77);
        expect(f.forecast[0].maxTemperature).toBe(86);
        expect(f.historical[0].minTemperature).toBeNull();
    });

    it("does not mutate the input", () => {
        convertWeatherUnits(weather, "F");
        expect(weather.current.temperature_2m).toBe(20);
    });

    it("handles null weather", () => {
        expect(convertWeatherUnits(null, "F")).toBeNull();
    });
});
