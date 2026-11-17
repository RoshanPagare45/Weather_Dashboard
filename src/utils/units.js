/*
 * Temperature unit conversion. The API always returns Celsius;
 * the UI converts at the edge so components stay unchanged.
 */

export const cToF = (c) =>
    typeof c === "number" ? (c * 9) / 5 + 32 : c;

const round1 = (n) =>
    typeof n === "number" ? Math.round(n * 10) / 10 : n;

const convert = (value) => round1(cToF(value));

const TEMP_KEYS = [
    "maxTemperature",
    "minTemperature",
    "apparentMaxTemperature",
    "apparentMinTemperature"
];

function convertDay(day) {

    const copy = { ...day };

    for (const key of TEMP_KEYS) {

        if (key in copy) {

            copy[key] = convert(copy[key]);

        }

    }

    return copy;

}

export function convertWeatherUnits(weather, unit) {

    if (!weather || unit !== "F") {

        return weather;

    }

    return {

        ...weather,

        current: weather.current && {
            ...weather.current,
            temperature_2m: convert(weather.current.temperature_2m),
            apparent_temperature: convert(
                weather.current.apparent_temperature
            )
        },

        currentUnits: weather.currentUnits && {
            ...weather.currentUnits,
            temperature_2m: "°F",
            apparent_temperature: "°F"
        },

        currentWeather: weather.currentWeather && {
            ...weather.currentWeather,
            temperature: convert(weather.currentWeather.temperature),
            apparentTemperature: convert(
                weather.currentWeather.apparentTemperature
            )
        },

        forecast: weather.forecast?.map(convertDay),

        historical: weather.historical?.map(convertDay)

    };

}
