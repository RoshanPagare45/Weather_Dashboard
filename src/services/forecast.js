import { fetchJson } from "./http.js";

const WEATHER_API = "https://api.open-meteo.com/v1/forecast";
const HISTORICAL_API = "https://archive-api.open-meteo.com/v1/archive";

/*
 * ==================================================
 * WEATHER CONDITION
 * ==================================================
 */

export function getWeatherCondition(code) {

    if (code === 0) {

        return {
            type: "clear",
            label: "Clear sky",
            icon: "☀️"
        };

    }

    if ([1, 2].includes(code)) {

        return {
            type: "partly-cloudy",
            label: "Partly cloudy",
            icon: "🌤️"
        };

    }

    if (code === 3) {

        return {
            type: "cloudy",
            label: "Overcast",
            icon: "☁️"
        };

    }

    if ([45, 48].includes(code)) {

        return {
            type: "fog",
            label: "Foggy",
            icon: "🌫️"
        };

    }

    if (
        [51, 53, 55, 56, 57].includes(code)
    ) {

        return {
            type: "drizzle",
            label: "Drizzle",
            icon: "🌦️"
        };

    }

    if (
        [61, 63, 65, 66, 67].includes(code)
    ) {

        return {
            type: "rain",
            label: "Rain",
            icon: "🌧️"
        };

    }

    if (
        [71, 73, 75, 77].includes(code)
    ) {

        return {
            type: "snow",
            label: "Snow",
            icon: "❄️"
        };

    }

    if (
        [80, 81, 82].includes(code)
    ) {

        return {
            type: "showers",
            label: "Rain showers",
            icon: "🌦️"
        };

    }

    if (
        [85, 86].includes(code)
    ) {

        return {
            type: "snow",
            label: "Snow showers",
            icon: "🌨️"
        };

    }

    if (
        [95, 96, 99].includes(code)
    ) {

        return {
            type: "storm",
            label: "Thunderstorm",
            icon: "⛈️"
        };

    }

    return {
        type: "cloudy",
        label: "Cloudy",
        icon: "☁️"
    };

}


/*
 * ==================================================
 * DAY NAME
 * ==================================================
 */

function getDayName(
    dateString,
    index
) {

    if (index === 0) {

        return "Today";

    }

    if (index === 1) {

        return "Tomorrow";

    }

    const date =
        new Date(
            `${dateString}T12:00:00`
        );

    return date.toLocaleDateString(
        "en-IN",
        {
            weekday: "short"
        }
    );

}


/*
 * ==================================================
 * HISTORICAL DAY NAME
 * ==================================================
 */

function getHistoricalDayName(
    dateString,
    index
) {

    if (index === 0) {

        return "Yesterday";

    }

    if (index === 1) {

        return "2 days ago";

    }

    if (index === 2) {

        return "3 days ago";

    }

    if (index === 3) {

        return "4 days ago";

    }

    if (index === 4) {

        return "5 days ago";

    }

    if (index === 5) {

        return "6 days ago";

    }

    if (index === 6) {

        return "7 days ago";

    }

    if (index === 7) {

        return "8 days ago";

    }

    const date =
        new Date(
            `${dateString}T12:00:00`
        );

    return date.toLocaleDateString(
        "en-IN",
        {
            weekday: "short"
        }
    );

}


/*
 * ==================================================
 * SAFE NUMBER
 * ==================================================
 */

export function safeNumber(value) {

    if (
        value === null ||
        value === undefined ||
        Number.isNaN(Number(value))
    ) {

        return null;

    }

    return Number(value);

}


/*
 * ==================================================
 * BUILD HISTORICAL DATA
 * ==================================================
 */

function buildHistoricalWeather(
    historicalData
) {

    const daily =
        historicalData.daily || {};

    const historical = [];

    const dates =
        daily.time || [];

    for (
        let index = 0;
        index < dates.length;
        index++
    ) {

        const code =
            daily.weather_code?.[index] ?? 0;

        const condition =
            getWeatherCondition(code);

        historical.push({

            date:
                dates[index],

            day:
                getHistoricalDayName(
                    dates[index],
                    index
                ),

            weatherCode:
                code,

            condition:
                condition.label,

            icon:
                condition.icon,

            type:
                condition.type,

            maxTemperature:
                safeNumber(
                    daily.temperature_2m_max?.[
                        index
                    ]
                ),

            minTemperature:
                safeNumber(
                    daily.temperature_2m_min?.[
                        index
                    ]
                ),

            apparentMaxTemperature:
                safeNumber(
                    daily.apparent_temperature_max?.[
                        index
                    ]
                ),

            apparentMinTemperature:
                safeNumber(
                    daily.apparent_temperature_min?.[
                        index
                    ]
                ),

            precipitation:
                safeNumber(
                    daily.precipitation_sum?.[
                        index
                    ]
                ),

            rain:
                safeNumber(
                    daily.rain_sum?.[
                        index
                    ]
                ),

            showers:
                safeNumber(
                    daily.showers_sum?.[
                        index
                    ]
                ),

            snowfall:
                safeNumber(
                    daily.snowfall_sum?.[
                        index
                    ]
                ),

            precipitationProbability:
                null,

            windSpeed:
                safeNumber(
                    daily.wind_speed_10m_max?.[
                        index
                    ]
                ),

            windGusts:
                safeNumber(
                    daily.wind_gusts_10m_max?.[
                        index
                    ]
                ),

            uvIndex:
                safeNumber(
                    daily.uv_index_max?.[
                        index
                    ]
                ),

            sunrise:
                daily.sunrise?.[
                    index
                ] || null,

            sunset:
                daily.sunset?.[
                    index
                ] || null

        });

    }

    return historical;

}


/*
 * ==================================================
 * FETCH WEATHER FOR A RESOLVED LOCATION
 * ==================================================
 */

function fetchHistoricalData(
    location,
    signal
) {

    const formatDate =
        (date) => date.toISOString().split("T")[0];

    const today = new Date();

    const endDate = new Date(today);
    endDate.setDate(endDate.getDate() - 1);

    const startDate = new Date(today);
    startDate.setDate(startDate.getDate() - 8);

    const params =
        new URLSearchParams({

            latitude: location.latitude,
            longitude: location.longitude,

            start_date: formatDate(startDate),
            end_date: formatDate(endDate),

            timezone: "auto",

            daily: [
                "weather_code",
                "temperature_2m_max",
                "temperature_2m_min",
                "apparent_temperature_max",
                "apparent_temperature_min",
                "sunrise",
                "sunset",
                "daylight_duration",
                "sunshine_duration",
                "precipitation_sum",
                "rain_sum",
                "showers_sum",
                "snowfall_sum",
                "wind_speed_10m_max",
                "wind_gusts_10m_max",
                "uv_index_max"
            ].join(","),

            temperature_unit: "celsius",
            wind_speed_unit: "kmh",
            precipitation_unit: "mm"

        });

    return fetchJson(
        `${HISTORICAL_API}?${params.toString()}`,
        signal
    );

}


export async function fetchWeatherForLocation(
    location,
    signal
) {

    // Start the history request now so it runs in
    // parallel with the forecast request below.
    const historicalPromise =
        fetchHistoricalData(location, signal);

    historicalPromise.catch(() => {});

    const params =
        new URLSearchParams({

            latitude:
                location.latitude,

            longitude:
                location.longitude,

            timezone:
                "auto",

            forecast_days:
                "8",

            current: [

                "temperature_2m",
                "relative_humidity_2m",
                "apparent_temperature",
                "is_day",

                "precipitation",
                "rain",
                "showers",
                "snowfall",

                "weather_code",
                "cloud_cover",

                "pressure_msl",
                "surface_pressure",

                "wind_speed_10m",
                "wind_direction_10m",
                "wind_gusts_10m",

                "visibility",
                "uv_index"

            ].join(","),

            daily: [

                "weather_code",

                "temperature_2m_max",
                "temperature_2m_min",

                "apparent_temperature_max",
                "apparent_temperature_min",

                "sunrise",
                "sunset",

                "daylight_duration",
                "sunshine_duration",

                "precipitation_sum",
                "rain_sum",
                "showers_sum",
                "snowfall_sum",

                "precipitation_probability_max",

                "wind_speed_10m_max",
                "wind_gusts_10m_max",

                "uv_index_max"

            ].join(","),

            temperature_unit:
                "celsius",

            wind_speed_unit:
                "kmh",

            precipitation_unit:
                "mm"

        });


    /*
     * ==================================================
     * FETCH 8-DAY FORECAST
     * ==================================================
     */

    const weatherData =
        await fetchJson(
            `${WEATHER_API}?${params.toString()}`,
            signal
        );


    if (!weatherData.current) {

        throw new Error(
            "Current weather information is unavailable."
        );

    }


    /*
     * ==================================================
     * BUILD FORECAST
     * ==================================================
     */

    const daily =
        weatherData.daily || {};

    const forecast = [];

    for (
        let index = 0;
        index < (daily.time?.length || 0);
        index++
    ) {

        const code =
            daily.weather_code?.[index] ?? 0;

        const condition =
            getWeatherCondition(code);

        forecast.push({

            date:
                daily.time[index],

            day:
                getDayName(
                    daily.time[index],
                    index
                ),

            weatherCode:
                code,

            condition:
                condition.label,

            icon:
                condition.icon,

            type:
                condition.type,

            maxTemperature:
                safeNumber(
                    daily.temperature_2m_max?.[
                        index
                    ]
                ),

            minTemperature:
                safeNumber(
                    daily.temperature_2m_min?.[
                        index
                    ]
                ),

            apparentMaxTemperature:
                safeNumber(
                    daily.apparent_temperature_max?.[
                        index
                    ]
                ),

            apparentMinTemperature:
                safeNumber(
                    daily.apparent_temperature_min?.[
                        index
                    ]
                ),

            precipitation:
                safeNumber(
                    daily.precipitation_sum?.[
                        index
                    ]
                ),

            rain:
                safeNumber(
                    daily.rain_sum?.[
                        index
                    ]
                ),

            showers:
                safeNumber(
                    daily.showers_sum?.[
                        index
                    ]
                ),

            snowfall:
                safeNumber(
                    daily.snowfall_sum?.[
                        index
                    ]
                ),

            precipitationProbability:
                safeNumber(
                    daily.precipitation_probability_max?.[
                        index
                    ]
                ),

            windSpeed:
                safeNumber(
                    daily.wind_speed_10m_max?.[
                        index
                    ]
                ),

            windGusts:
                safeNumber(
                    daily.wind_gusts_10m_max?.[
                        index
                    ]
                ),

            uvIndex:
                safeNumber(
                    daily.uv_index_max?.[
                        index
                    ]
                ),

            sunrise:
                daily.sunrise?.[
                    index
                ] || null,

            sunset:
                daily.sunset?.[
                    index
                ] || null

        });

    }


    /*
     * ==================================================
     * FETCH LAST 8 DAYS
     * ==================================================
     */

    // Started earlier, in parallel with the forecast request.
    const historicalData =
        await historicalPromise;


    const historical =
        buildHistoricalWeather(
            historicalData
        );


    /*
     * ==================================================
     * CURRENT WEATHER
     * ==================================================
     */

    const current =
        weatherData.current;

    const condition =
        getWeatherCondition(
            current.weather_code
        );


    const currentWeather = {

        temperature:
            safeNumber(
                current.temperature_2m
            ),

        apparentTemperature:
            safeNumber(
                current.apparent_temperature
            ),

        humidity:
            safeNumber(
                current.relative_humidity_2m
            ),

        precipitation:
            safeNumber(
                current.precipitation
            ),

        rain:
            safeNumber(
                current.rain
            ),

        showers:
            safeNumber(
                current.showers
            ),

        snowfall:
            safeNumber(
                current.snowfall
            ),

        weatherCode:
            current.weather_code,

        cloudCover:
            safeNumber(
                current.cloud_cover
            ),

        isDay:
            current.is_day,

        pressure:
            safeNumber(
                current.pressure_msl
            ),

        surfacePressure:
            safeNumber(
                current.surface_pressure
            ),

        windSpeed:
            safeNumber(
                current.wind_speed_10m
            ),

        windDirection:
            safeNumber(
                current.wind_direction_10m
            ),

        windGusts:
            safeNumber(
                current.wind_gusts_10m
            ),

        visibility:
            safeNumber(
                current.visibility
            ),

        uvIndex:
            safeNumber(
                current.uv_index
            )

    };


    /*
     * ==================================================
     * RETURN EVERYTHING
     * ==================================================
     */

    return {

        city:
            location.name,

        country:
            location.country,

        countryCode:
            location.country_code,

        admin1:
            location.admin1 || "",

        latitude:
            location.latitude,

        longitude:
            location.longitude,

        timezone:
            weatherData.timezone,

        timezoneAbbreviation:
            weatherData.timezone_abbreviation,

        current,

        currentUnits:
            weatherData.current_units,

        currentWeather,

        daily,

        forecast,

        historical,

        condition

    };

}

