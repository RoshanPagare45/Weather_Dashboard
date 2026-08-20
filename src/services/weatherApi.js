const GEOCODING_API =
    "https://geocoding-api.open-meteo.com/v1/search";

const WEATHER_API =
    "https://api.open-meteo.com/v1/forecast";

const HISTORICAL_API =
    "https://archive-api.open-meteo.com/v1/archive";


/*
 * ==================================================
 * FETCH JSON
 * ==================================================
 */

async function fetchJson(url, signal) {

    const response = await fetch(
        url,
        { signal }
    );

    let data = null;

    try {

        data = await response.json();

    } catch {

        throw new Error(
            "Invalid response received from weather service."
        );

    }

    if (!response.ok) {

        throw new Error(
            data?.reason ||
            "Weather service returned an error."
        );

    }

    return data;

}


/*
 * ==================================================
 * CITY AUTOCOMPLETE SEARCH
 * ==================================================
 */

export async function searchCities(
    query,
    signal
) {

    const cleanQuery =
        query.trim();

    if (!cleanQuery) {

        return [];

    }

    const geoUrl =
        `${GEOCODING_API}?name=${encodeURIComponent(cleanQuery)}` +
        `&count=10` +
        `&language=en` +
        `&format=json`;

    const geoData =
        await fetchJson(
            geoUrl,
            signal
        );

    if (
        !geoData.results ||
        geoData.results.length === 0
    ) {

        return [];

    }

    return geoData.results.map(
        (location) => ({

            id: [
                location.id,
                location.latitude,
                location.longitude
            ]
                .filter(Boolean)
                .join("-"),

            name:
                location.name ||
                "Unknown city",

            country:
                location.country ||
                "",

            countryCode:
                location.country_code ||
                "",

            admin1:
                location.admin1 ||
                "",

            admin2:
                location.admin2 ||
                "",

            latitude:
                location.latitude,

            longitude:
                location.longitude,

            timezone:
                location.timezone ||
                ""

        })
    );

}


/*
 * ==================================================
 * WEATHER CONDITION
 * ==================================================
 */

function getWeatherCondition(code) {

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

function safeNumber(value) {

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
 *
 * Shared by both entry points below. Expects a
 * location object with AT LEAST:
 *
 *   { name, country, country_code, latitude, longitude }
 *
 * This is exactly the shape Open-Meteo's geocoding API
 * returns, so a location picked from the autocomplete
 * dropdown can be passed straight in without any
 * re-geocoding — which is what avoids the "wrong city
 * with the same name" bug (e.g. Kochi, India vs.
 * Kochi, China): once the user has picked an exact
 * result, we trust its coordinates and never search
 * by name again.
 * ==================================================
 */

async function fetchWeatherForLocation(
    location,
    signal
) {

    /*
     * ==================================================
     * FORECAST PARAMETERS
     * ==================================================
     */

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
     *
     * IMPORTANT:
     *
     * This is a separate historical request.
     * It gives us actual historical daily
     * weather for the selected city's coordinates.
     * ==================================================
     */

    const today =
        new Date();

    const endDate =
        new Date(today);

    endDate.setDate(
        endDate.getDate() - 1
    );


    const startDate =
        new Date(today);

    startDate.setDate(
        startDate.getDate() - 8
    );


    const formatDate =
        (date) => {

            return date
                .toISOString()
                .split("T")[0];

        };


    const historicalParams =
        new URLSearchParams({

            latitude:
                location.latitude,

            longitude:
                location.longitude,

            start_date:
                formatDate(startDate),

            end_date:
                formatDate(endDate),

            timezone:
                "auto",

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

            temperature_unit:
                "celsius",

            wind_speed_unit:
                "kmh",

            precipitation_unit:
                "mm"

        });


    const historicalData =
        await fetchJson(
            `${HISTORICAL_API}?${historicalParams.toString()}`,
            signal
        );


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

        /*
         * Last 8 completed days
         */
        historical,

        condition

    };

}


/*
 * ==================================================
 * GET WEATHER BY CITY NAME
 * ==================================================
 *
 * Used for a manually TYPED search (no suggestion
 * picked). Since only a name is available, this still
 * has to geocode and guess the best match — if several
 * cities share a name across countries, this can pick
 * the wrong one. Prefer getWeatherByCoordinates whenever
 * an exact location is already known (e.g. the user
 * picked it from the autocomplete dropdown).
 * ==================================================
 */

export async function getWeatherByCity(
    city,
    signal
) {

    const cleanCity =
        city.trim();

    if (!cleanCity) {

        throw new Error(
            "Please enter a city name."
        );

    }


    const geoUrl =
        `${GEOCODING_API}?name=${encodeURIComponent(cleanCity)}` +
        `&count=1` +
        `&language=en` +
        `&format=json`;

    const geoData =
        await fetchJson(
            geoUrl,
            signal
        );

    if (
        !geoData.results ||
        geoData.results.length === 0
    ) {

        throw new Error(
            `We couldn't find "${cleanCity}". Please check the city name.`
        );

    }

    const location =
        geoData.results[0];


    return fetchWeatherForLocation(
        location,
        signal
    );

}


/*
 * ==================================================
 * GET WEATHER BY COORDINATES / EXACT LOCATION
 * ==================================================
 *
 * Used when the user picked an exact result from the
 * autocomplete dropdown. The location object already
 * carries the correct latitude/longitude, so there is
 * no re-geocoding step and therefore no risk of
 * resolving to a different city that happens to share
 * the same name (e.g. Kochi, India vs. Kochi, China).
 *
 * Accepts the same shape returned by Open-Meteo's
 * geocoding API:
 *
 *   { name, country, country_code, admin1,
 *     latitude, longitude, ... }
 * ==================================================
 */

export async function getWeatherByCoordinates(
    location,
    signal
) {

    if (
        !location ||
        typeof location.latitude !== "number" ||
        typeof location.longitude !== "number"
    ) {

        throw new Error(
            "A valid location with coordinates is required."
        );

    }

    return fetchWeatherForLocation(
        location,
        signal
    );

}