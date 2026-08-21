const GEOCODING_API =
    "https://geocoding-api.open-meteo.com/v1/search";

const WEATHER_API =
    "https://api.open-meteo.com/v1/forecast";

const HISTORICAL_API =
    "https://archive-api.open-meteo.com/v1/archive";

/*
 * ==================================================
 * POSTAL PINCODE API
 * ==================================================
 *
 * India Post / Postal PIN Code API
 *
 * Example:
 *
 * https://api.postalpincode.in/pincode/422009
 *
 * This API returns multiple PostOffice records for
 * the same pincode.
 *
 * Example fields:
 *
 * Name
 * BranchType
 * DeliveryStatus
 * Circle
 * District
 * Division
 * Region
 * Block
 * State
 * Country
 * Pincode
 *
 * ==================================================
 */

const POSTAL_PINCODE_API =
    "https://api.postalpincode.in/pincode";


/*
 * ==================================================
 * FETCH JSON
 * ==================================================
 */

async function fetchJson(url, signal, options = {}) {

    const response =
        await fetch(
            url,
            {
                signal,
                ...options
            }
        );

    let data = null;

    try {

        data =
            await response.json();

    } catch {

        throw new Error(
            "Invalid response received from weather service."
        );

    }

    if (!response.ok) {

        throw new Error(
            data?.reason ||
            data?.Message ||
            "Service returned an error."
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
 */

async function fetchWeatherForLocation(
    location,
    signal
) {

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

        historical,

        condition

    };

}


/*
 * ==================================================
 * POSTAL PINCODE LOOKUP
 * ==================================================
 *
 * THIS IS THE IMPORTANT NEW PART.
 *
 * Instead of:
 *
 * Nominatim -> pincode -> generic city
 *
 * We now do:
 *
 * Postal API
 *     ↓
 * all post offices
 *     ↓
 * area/post-office name
 *     ↓
 * district
 *     ↓
 * state
 *     ↓
 * Open-Meteo geocoding
 *     ↓
 * weather
 *
 * ==================================================
 */

async function fetchPostalPincode(
    pincode,
    signal
) {

    const cleanPincode =
        String(pincode)
            .trim();

    if (!/^\d{6}$/.test(cleanPincode)) {

        throw new Error(
            "Please enter a valid 6-digit Indian pincode."
        );

    }


    const url =
        `${POSTAL_PINCODE_API}/${encodeURIComponent(
            cleanPincode
        )}`;


    const response =
        await fetch(
            url,
            {
                signal,
                headers: {
                    "Accept": "application/json"
                }
            }
        );


    if (!response.ok) {

        throw new Error(
            `Postal API returned HTTP ${response.status}.`
        );

    }


    let data;

    try {

        data =
            await response.json();

    } catch {

        throw new Error(
            "Postal API returned an invalid response."
        );

    }


    if (
        !Array.isArray(data) ||
        !data[0]
    ) {

        throw new Error(
            `No postal information found for pincode ${cleanPincode}.`
        );

    }


    const result =
        data[0];


    const postOffices =
        Array.isArray(result.PostOffice)
            ? result.PostOffice
            : [];


    if (
        result.Status !== "Success" ||
        postOffices.length === 0
    ) {

        throw new Error(
            result.Message ||
            `No post offices found for pincode ${cleanPincode}.`
        );

    }


    return {

        message:
            result.Message || "",

        status:
            result.Status || "",

        pincode:
            cleanPincode,

        offices:
            postOffices

    };

}


/*
 * ==================================================
 * CLEAN POST OFFICE NAME
 * ==================================================
 */

function cleanPostOfficeName(
    name
) {

    if (!name) {

        return "";

    }

    return String(name)
        .replace(/\s+B\.O\.?$/i, "")
        .replace(/\s+S\.O\.?$/i, "")
        .replace(/\s+H\.O\.?$/i, "")
        .trim();

}


/*
 * ==================================================
 * BUILD POSTAL AREA LABEL
 * ==================================================
 *
 * Example:
 *
 * Panchavati, Nashik
 *
 * Indira Nagar, Nashik
 *
 * Nashik Road, Nashik
 *
 * ==================================================
 */

function buildPostalAreaLabel(
    office,
    postalData
) {

    const area =
        cleanPostOfficeName(
            office.Name
        );

    const district =
        office.District ||
        postalData.offices?.[0]?.District ||
        "";

    const state =
        office.State ||
        postalData.offices?.[0]?.State ||
        "";


    if (
        area &&
        district &&
        area.toLowerCase() !==
            district.toLowerCase()
    ) {

        return `${area}, ${district}`;

    }


    if (district) {

        return district;

    }


    if (state) {

        return state;

    }


    return area;

}


/*
 * ==================================================
 * FIND BEST POST OFFICE
 * ==================================================
 *
 * If one pincode contains multiple post offices,
 * prefer a main/sub office over branch office when
 * possible.
 *
 * This does NOT discard the other offices.
 *
 * NOTE: retained for backward compatibility (used by
 * getWeatherByPincode below). The primary pincode
 * flow now goes through getPincodeAreas() +
 * getWeatherForPincodeArea() instead, which lets the
 * user pick from ALL areas rather than auto-selecting
 * one.
 *
 * ==================================================
 */

function chooseBestPostOffice(
    offices
) {

    if (
        !Array.isArray(offices) ||
        offices.length === 0
    ) {

        return null;

    }


    const priority = {

        "Head Office": 1,

        "Sub Office": 2,

        "Branch Office": 3

    };


    return [...offices]
        .sort(
            (a, b) => {

                const aPriority =
                    priority[a.BranchType] || 99;

                const bPriority =
                    priority[b.BranchType] || 99;

                return (
                    aPriority -
                    bPriority
                );

            }
        )[0];

}


/*
 * ==================================================
 * GEOCODE VIA NOMINATIM (OPENSTREETMAP)
 * ==================================================
 *
 * NEW.
 *
 * Open-Meteo's geocoding database (used below in
 * geocodePostalOffice's `queries` list) is a simplified,
 * mostly city/town-level dataset — it commonly has NO
 * entry for small Indian post-office localities like
 * "Panchavati" or "Indira Nagar". When that happens, the
 * old flow silently fell through to a DISTRICT-level query
 * (e.g. "Nashik, Maharashtra, India"), which meant every
 * postal area sharing that district collapsed onto the
 * SAME coordinates — so they all reported identical
 * "current" weather, even though the specific localities
 * can have genuinely different conditions right now (one
 * area raining, another only cloudy).
 *
 * Nominatim's underlying OpenStreetMap data is far more
 * granular for India and commonly DOES have individual
 * neighbourhoods/localities as distinct points. We try it
 * FIRST, with the most specific query, before ever falling
 * back to a district/state-level Open-Meteo query — this
 * gives each postal area its own real coordinates whenever
 * possible, so its fetched "current" condition (and
 * therefore its rain/cloudy/clear visual effect) reflects
 * that specific area rather than the whole city/district.
 *
 * This reuses the same Nominatim host already relied on
 * elsewhere in this file for reverse-geocoding
 * (`reverseGeocode` below), just via its forward `/search`
 * endpoint instead of `/reverse`.
 * ==================================================
 */

async function geocodeViaNominatim(
    query,
    signal
) {

    const cleanQuery =
        (query || "")
            .trim();

    if (!cleanQuery) {

        return null;

    }

    try {

        const url =
            `https://nominatim.openstreetmap.org/search?` +
            `format=json` +
            `&addressdetails=1` +
            `&limit=5` +
            `&countrycodes=in` +
            `&q=${encodeURIComponent(cleanQuery)}`;


        const response =
            await fetch(
                url,
                {
                    signal,
                    headers: {
                        "Accept-Language": "en"
                    }
                }
            );


        if (!response.ok) {

            return null;

        }


        const results =
            await response.json();


        if (
            !Array.isArray(results) ||
            results.length === 0
        ) {

            return null;

        }


        const match =
            results[0];

        const latitude =
            Number(match.lat);

        const longitude =
            Number(match.lon);


        if (
            !Number.isFinite(latitude) ||
            !Number.isFinite(longitude)
        ) {

            return null;

        }


        const address =
            match.address || {};


        return {

            latitude,

            longitude,

            timezone:
                "",

            geocodedName:
                match.display_name
                    ?.split(",")[0]
                    ?.trim() ||
                cleanQuery,

            geocodedCountry:
                address.country ||
                "India",

            geocodedCountryCode:
                (
                    address.country_code ||
                    "in"
                ).toUpperCase(),

            geocodedAdmin1:
                address.state || ""

        };

    } catch (error) {

        if (
            error?.name === "AbortError"
        ) {

            throw error;

        }

        return null;

    }

}


/*
 * ==================================================
 * GEOCODE POST OFFICE
 * ==================================================
 *
 * Postal API gives us the actual postal area,
 * district and state, but it normally does not give
 * latitude/longitude.
 *
 * We now try, IN ORDER:
 *
 *   1. Nominatim, area name + district + state
 *      (most granular — often resolves individual
 *      localities that Open-Meteo doesn't know about)
 *   2. Nominatim, area name + district
 *   3. Open-Meteo, area name + district + state
 *   4. Open-Meteo, area name + district
 *   5. Open-Meteo, district + state (district-level
 *      fallback — only reached if nothing more
 *      specific matched anywhere)
 *   6. Open-Meteo, state
 *
 * We NEVER use either service to decide what the
 * pincode itself means — only to convert an already
 * postal-API-derived area into coordinates.
 *
 * ==================================================
 */

async function geocodePostalOffice(
    office,
    postalData,
    signal
) {

    const name =
        cleanPostOfficeName(
            office.Name
        );

    const district =
        office.District ||
        "";

    const state =
        office.State ||
        "";

    const country =
        office.Country ||
        "India";


    /*
     * ==================================================
     * STEP 1
     * TRY NOMINATIM FIRST, MOST SPECIFIC QUERIES
     * ==================================================
     */

    const nominatimQueries = [

        [name, district, state, "India"]
            .filter(Boolean)
            .join(", "),

        [name, district, "India"]
            .filter(Boolean)
            .join(", ")

    ];


    for (
        const query of nominatimQueries
    ) {

        if (!query.trim()) {

            continue;

        }


        const nominatimMatch =
            await geocodeViaNominatim(
                query,
                signal
            );


        if (nominatimMatch) {

            return nominatimMatch;

        }

    }


    /*
     * ==================================================
     * STEP 2
     * FALL BACK TO OPEN-METEO, MOST TO LEAST SPECIFIC
     * ==================================================
     */

    const queries = [

        `${name}, ${district}, ${state}, India`,

        `${name}, ${district}, India`,

        `${district}, ${state}, India`,

        `${state}, India`

    ];


    for (
        const query of queries
    ) {

        if (!query.trim()) {

            continue;

        }


        try {

            const url =
                `${GEOCODING_API}?` +
                `name=${encodeURIComponent(query)}` +
                `&count=10` +
                `&language=en` +
                `&format=json`;


            const data =
                await fetchJson(
                    url,
                    signal
                );


            const results =
                Array.isArray(data.results)
                    ? data.results
                    : [];


            if (
                results.length === 0
            ) {

                continue;

            }


            /*
             * Prefer India.
             */

            const indiaResults =
                results.filter(
                    (result) =>
                        (
                            result.country_code ||
                            ""
                        ).toLowerCase() === "in"
                );


            const candidates =
                indiaResults.length > 0
                    ? indiaResults
                    : results;


            /*
             * Prefer a result whose administrative
             * area/district resembles the postal data.
             */

            const districtLower =
                district.toLowerCase();

            const stateLower =
                state.toLowerCase();


            const strongMatch =
                candidates.find(
                    (result) => {

                        const resultName =
                            (
                                result.name ||
                                ""
                            ).toLowerCase();

                        const resultAdmin1 =
                            (
                                result.admin1 ||
                                ""
                            ).toLowerCase();

                        const resultAdmin2 =
                            (
                                result.admin2 ||
                                ""
                            ).toLowerCase();


                        return (

                            (
                                districtLower &&
                                (
                                    resultName.includes(
                                        districtLower
                                    ) ||
                                    resultAdmin1.includes(
                                        districtLower
                                    ) ||
                                    resultAdmin2.includes(
                                        districtLower
                                    )
                                )
                            ) ||

                            (
                                stateLower &&
                                resultAdmin1.includes(
                                    stateLower
                                )
                            )

                        );

                    }
                );


            const match =
                strongMatch ||
                candidates[0];


            if (
                match &&
                Number.isFinite(
                    Number(match.latitude)
                ) &&
                Number.isFinite(
                    Number(match.longitude)
                )
            ) {

                return {

                    latitude:
                        Number(match.latitude),

                    longitude:
                        Number(match.longitude),

                    timezone:
                        match.timezone || "",

                    geocodedName:
                        match.name || name,

                    geocodedCountry:
                        match.country ||
                        country,

                    geocodedCountryCode:
                        match.country_code ||
                        "IN",

                    geocodedAdmin1:
                        match.admin1 ||
                        state

                };

            }

        } catch (error) {

            if (
                error?.name === "AbortError"
            ) {

                throw error;

            }

            /*
             * Try next query.
             */

        }

    }


    return null;

}


/*
 * ==================================================
 * GET ALL AREAS FOR A PINCODE
 * ==================================================
 *
 * NEW.
 *
 * A single Indian pincode commonly maps to several
 * post office areas (e.g. 422009 → Panchavati,
 * Indira Nagar, Nashik Road, etc). This returns ALL
 * of them, unfiltered — no "best match" is chosen
 * here. The caller (App.jsx) decides what to do:
 *   - exactly 1 area  → fetch its weather directly
 *   - more than 1 area → show a picker and let the
 *     user choose, then call getWeatherForPincodeArea()
 *
 * Each returned office keeps every raw field from the
 * Postal API (Name, District, State, Country,
 * BranchType, DeliveryStatus, Circle, Division,
 * Region, Block, Pincode) PLUS two convenience fields
 * for display:
 *
 *   displayName → cleaned post office name
 *                 (e.g. "Panchavati" instead of
 *                 "Panchavati B.O")
 *
 *   areaLabel   → "Area, District" label suitable for
 *                 a picker UI (e.g. "Panchavati, Nashik")
 *
 * ==================================================
 */

export async function getPincodeAreas(
    pincode,
    signal
) {

    const postalData =
        await fetchPostalPincode(
            pincode,
            signal
        );

    const offices =
        postalData.offices;

    if (
        !offices ||
        offices.length === 0
    ) {

        throw new Error(
            `No area information found for pincode ${postalData.pincode}.`
        );

    }

    const areas =
        offices.map(
            (office) => ({

                ...office,

                displayName:
                    cleanPostOfficeName(
                        office.Name
                    ),

                areaLabel:
                    buildPostalAreaLabel(
                        office,
                        postalData
                    )

            })
        );

    return {

        pincode:
            postalData.pincode,

        offices:
            areas

    };

}


/*
 * ==================================================
 * GET WEATHER FOR A SPECIFIC PINCODE AREA
 * ==================================================
 *
 * NEW.
 *
 * Takes ONE office/area (as returned by
 * getPincodeAreas — either raw Postal API shape or
 * the enriched shape with displayName/areaLabel both
 * work, since only office.Name / .District / .State /
 * .Country / .BranchType etc. are read here) and
 * fetches weather for exactly that area. No auto
 * "best office" guessing.
 *
 * ==================================================
 */

export async function getWeatherForPincodeArea(
    pincode,
    office,
    signal
) {

    if (!office) {

        throw new Error(
            "No postal area was selected."
        );

    }

    const cleanPincode =
        String(pincode)
            .trim();

    const areaName =
        cleanPostOfficeName(
            office.Name
        );

    const district =
        office.District ||
        "";

    const state =
        office.State ||
        "India";

    const country =
        office.Country ||
        "India";

    const postalLocationName =
        office.areaLabel ||
        buildPostalAreaLabel(
            office,
            { offices: [office] }
        );


    /*
     * ==================================================
     * FIND COORDINATES FOR THIS EXACT AREA
     * ==================================================
     */

    const coordinates =
        await geocodePostalOffice(
            office,
            { offices: [office] },
            signal
        );


    if (!coordinates) {

        throw new Error(
            `The postal area "${postalLocationName}" was found, but coordinates could not be determined for weather lookup.`
        );

    }


    const location = {

        name:
            postalLocationName,

        country:
            country,

        country_code:
            "IN",

        admin1:
            state,

        latitude:
            coordinates.latitude,

        longitude:
            coordinates.longitude,

        pincode:
            cleanPincode,

        postalArea:
            areaName,

        district:
            district,

        state:
            state,

        postOffice:
            areaName,

        branchType:
            office.BranchType || "",

        deliveryStatus:
            office.DeliveryStatus || "",

        circle:
            office.Circle || "",

        division:
            office.Division || "",

        region:
            office.Region || "",

        block:
            office.Block || ""

    };


    /*
     * ==================================================
     * FETCH WEATHER
     * ==================================================
     */

    const weather =
        await fetchWeatherForLocation(
            location,
            signal
        );


    /*
     * ==================================================
     * RETURN WEATHER + POSTAL INFORMATION
     * ==================================================
     */

    return {

        ...weather,

        city:
            postalLocationName,

        district:
            district,

        state:
            state,

        pincode:
            cleanPincode,

        postalArea:
            areaName,

        postOffice:
            areaName,

        branchType:
            office.BranchType || "",

        deliveryStatus:
            office.DeliveryStatus || "",

        circle:
            office.Circle || "",

        division:
            office.Division || "",

        region:
            office.Region || "",

        block:
            office.Block || ""

    };

}


/*
 * ==================================================
 * GET WEATHER BY PINCODE
 * ==================================================
 *
 * ORIGINAL IMPLEMENTATION — KEPT AS-IS.
 *
 * This auto-selects a single "best" post office via
 * chooseBestPostOffice() and returns weather for just
 * that one area. It is no longer used by App.jsx's
 * default pincode flow (which now shows every area
 * via getPincodeAreas() + getWeatherForPincodeArea()
 * so the user picks), but is left here untouched in
 * case anything else in the app still calls it.
 *
 * ==================================================
 */

export async function getWeatherByPincode(
    pincode,
    signal
) {

    const cleanPincode =
        String(pincode)
            .trim();


    /*
     * ==================================================
     * STEP 1
     * GET ACTUAL POSTAL DATA
     * ==================================================
     */

    const postalData =
        await fetchPostalPincode(
            cleanPincode,
            signal
        );


    const offices =
        postalData.offices;


    if (
        !offices ||
        offices.length === 0
    ) {

        throw new Error(
            `No area information found for pincode ${cleanPincode}.`
        );

    }


    /*
     * ==================================================
     * STEP 2
     * SELECT BEST OFFICE
     * ==================================================
     */

    const office =
        chooseBestPostOffice(
            offices
        );


    if (!office) {

        throw new Error(
            `No post office found for pincode ${cleanPincode}.`
        );

    }


    /*
     * ==================================================
     * STEP 3
     * GET AREA NAME
     * ==================================================
     */

    const areaName =
        cleanPostOfficeName(
            office.Name
        );


    const district =
        office.District ||
        offices[0]?.District ||
        "";


    const state =
        office.State ||
        offices[0]?.State ||
        "India";


    const country =
        office.Country ||
        "India";


    /*
     * ==================================================
     * STEP 4
     * BUILD USER-FRIENDLY LOCATION
     * ==================================================
     *
     * Example:
     *
     * Pincode:
     * 422009
     *
     * Area:
     * Indira Nagar
     *
     * City/District:
     * Nashik
     *
     * Display:
     * Indira Nagar, Nashik
     *
     * ==================================================
     */

    const postalLocationName =
        buildPostalAreaLabel(
            office,
            postalData
        );


    /*
     * ==================================================
     * STEP 5
     * FIND COORDINATES
     * ==================================================
     */

    const coordinates =
        await geocodePostalOffice(
            office,
            postalData,
            signal
        );


    /*
     * ==================================================
     * STEP 6
     * IF SPECIFIC AREA CANNOT BE GEOCODED,
     * TRY DISTRICT DIRECTLY.
     * ==================================================
     */

    if (!coordinates) {

        throw new Error(
            `The postal area "${postalLocationName}" was found, but coordinates could not be determined for weather lookup.`
        );

    }


    /*
     * ==================================================
     * STEP 7
     * CREATE EXACT WEATHER LOCATION
     * ==================================================
     *
     * IMPORTANT:
     *
     * We keep the Postal API's area name.
     *
     * We do NOT replace it with:
     *
     * Nashik Subdistrict
     *
     * or another generic Open-Meteo name.
     *
     * ==================================================
     */

    const location = {

        name:
            postalLocationName,

        country:
            country,

        country_code:
            "IN",

        admin1:
            state,

        latitude:
            coordinates.latitude,

        longitude:
            coordinates.longitude,

        /*
         * Additional postal information.
         */

        pincode:
            cleanPincode,

        postalArea:
            areaName,

        district:
            district,

        state:
            state,

        postOffice:
            areaName,

        branchType:
            office.BranchType || "",

        deliveryStatus:
            office.DeliveryStatus || "",

        circle:
            office.Circle || "",

        division:
            office.Division || "",

        region:
            office.Region || "",

        block:
            office.Block || "",

        /*
         * Keep every office returned by the API.
         * This can be useful for a future area selector.
         */

        postalOffices:
            offices.map(
                (item) => ({

                    name:
                        cleanPostOfficeName(
                            item.Name
                        ),

                    branchType:
                        item.BranchType || "",

                    deliveryStatus:
                        item.DeliveryStatus || "",

                    district:
                        item.District || "",

                    state:
                        item.State || "",

                    country:
                        item.Country || "India",

                    pincode:
                        item.Pincode ||
                        cleanPincode,

                    block:
                        item.Block || "",

                    division:
                        item.Division || "",

                    region:
                        item.Region || "",

                    circle:
                        item.Circle || ""

                })
            )

    };


    /*
     * ==================================================
     * STEP 8
     * FETCH WEATHER
     * ==================================================
     */

    const weather =
        await fetchWeatherForLocation(
            location,
            signal
        );


    /*
     * ==================================================
     * STEP 9
     * RETURN WEATHER + POSTAL INFORMATION
     * ==================================================
     */

    return {

        ...weather,

        /*
         * Main display name.
         *
         * Example:
         * Indira Nagar, Nashik
         */

        city:
            postalLocationName,

        /*
         * Actual district/city.
         */

        district:
            district,

        state:
            state,

        pincode:
            cleanPincode,

        postalArea:
            areaName,

        postOffice:
            areaName,

        branchType:
            office.BranchType || "",

        deliveryStatus:
            office.DeliveryStatus || "",

        circle:
            office.Circle || "",

        division:
            office.Division || "",

        region:
            office.Region || "",

        block:
            office.Block || "",

        /*
         * ALL offices for this pincode.
         */

        postalOffices:
            location.postalOffices

    };

}


/*
 * ==================================================
 * GET WEATHER BY CITY NAME
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
 * DERIVE PLACE NAME FROM ADDRESS
 * ==================================================
 */

function deriveNameFromAddress(
    address,
    displayName,
    fallback
) {

    const rawName =
        address.city ||
        address.town ||
        address.village ||
        address.municipality ||
        address.county ||
        address.state_district ||
        address.suburb ||
        address.neighbourhood ||
        address.city_district ||
        address.state ||
        displayName?.split(",")[0]?.trim() ||
        fallback;


    if (!rawName) {

        return rawName;

    }


    return rawName
        .replace(
            /\s+(Urban|Rural|District|Mandal|Tehsil|Taluk|Taluka|Sub-?District)\s*$/i,
            ""
        )
        .trim();

}


/*
 * ==================================================
 * DERIVE DETAILED ADDRESS
 * ==================================================
 */

function deriveDetailedAddress(
    address,
    displayName
) {

    const area =
        address.neighbourhood ||
        address.suburb ||
        address.quarter ||
        address.residential ||
        address.city_district ||
        "";


    const city =
        address.city ||
        address.town ||
        address.village ||
        address.municipality ||
        "";


    if (
        area &&
        city &&
        area.toLowerCase() !==
            city.toLowerCase()
    ) {

        return `${area}, ${city}`;

    }


    return (
        area ||
        city ||
        deriveNameFromAddress(
            address,
            displayName,
            null
        )
    );

}


/*
 * ==================================================
 * REVERSE GEOCODE
 * ==================================================
 */

async function reverseGeocode(
    latitude,
    longitude,
    signal,
    { detailed = false } = {}
) {

    const zoomLevels =
        detailed
            ? [18, 16, 14, 10]
            : [10, 14, 18];


    for (
        const zoom of zoomLevels
    ) {

        try {

            const url =
                `https://nominatim.openstreetmap.org/reverse?` +
                `lat=${latitude}` +
                `&lon=${longitude}` +
                `&format=json` +
                `&addressdetails=1` +
                `&zoom=${zoom}`;


            const response =
                await fetch(
                    url,
                    {
                        signal,
                        headers: {
                            "Accept-Language": "en"
                        }
                    }
                );


            if (!response.ok) {

                continue;

            }


            const data =
                await response.json();


            const address =
                data.address || {};


            const name =
                detailed
                    ? deriveDetailedAddress(
                        address,
                        data.display_name
                    )
                    : deriveNameFromAddress(
                        address,
                        data.display_name,
                        null
                    );


            if (name) {

                return {

                    name,

                    country:
                        address.country || "",

                    country_code:
                        (
                            address.country_code ||
                            ""
                        ).toUpperCase(),

                    admin1:
                        address.state || ""

                };

            }

        } catch (reverseError) {

            if (
                reverseError?.name ===
                "AbortError"
            ) {

                throw reverseError;

            }

        }

    }


    return null;

}


/*
 * ==================================================
 * CANONICALIZE VIA OPEN-METEO
 * ==================================================
 */

async function canonicalizeViaOpenMeteo(
    name,
    countryCode,
    signal
) {

    if (!name) {

        return null;

    }


    try {

        const url =
            `${GEOCODING_API}?name=${encodeURIComponent(name)}` +
            `&count=5` +
            `&language=en` +
            `&format=json`;


        const data =
            await fetchJson(
                url,
                signal
            );


        const results =
            Array.isArray(data.results)
                ? data.results
                : [];


        if (
            results.length === 0
        ) {

            return null;

        }


        if (countryCode) {

            const countryMatch =
                results.find(
                    (result) =>
                        (
                            result.country_code ||
                            ""
                        ).toUpperCase() ===
                        countryCode.toUpperCase()
                );


            if (countryMatch) {

                return countryMatch;

            }

        }


        return results[0];

    } catch (canonicalizeError) {

        if (
            canonicalizeError?.name ===
            "AbortError"
        ) {

            throw canonicalizeError;

        }


        return null;

    }

}


/*
 * ==================================================
 * GET WEATHER BY COORDINATES / EXACT LOCATION
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


    const isCurrentLocation =
        location.name ===
        "Current Location";


    const needsNameResolution =
        !location.name ||
        location.name ===
            "Pinned location" ||
        isCurrentLocation;


    let resolvedLocation =
        location;


    if (needsNameResolution) {

        const reverse =
            await reverseGeocode(
                location.latitude,
                location.longitude,
                signal,
                {
                    detailed:
                        isCurrentLocation
                }
            );


        if (reverse) {

            if (isCurrentLocation) {

                resolvedLocation = {

                    ...location,

                    name:
                        reverse.name,

                    country:
                        reverse.country ||
                        location.country,

                    country_code:
                        reverse.country_code ||
                        location.country_code,

                    admin1:
                        reverse.admin1 ||
                        location.admin1

                };

            } else {

                const canonical =
                    await canonicalizeViaOpenMeteo(
                        reverse.name,
                        reverse.country_code,
                        signal
                    );


                resolvedLocation =
                    canonical ||
                    {

                        ...location,

                        name:
                            reverse.name,

                        country:
                            reverse.country ||
                            location.country,

                        country_code:
                            reverse.country_code ||
                            location.country_code,

                        admin1:
                            reverse.admin1 ||
                            location.admin1

                    };

            }

        }

    }


    return fetchWeatherForLocation(
        resolvedLocation,
        signal
    );

}