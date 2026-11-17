import { timedFetch, fetchJson } from "./http.js";

export const GEOCODING_API = "https://geocoding-api.open-meteo.com/v1/search";

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


import { fetchWeatherForLocation } from "./forecast.js";

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

export function deriveNameFromAddress(
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

export function deriveDetailedAddress(
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
                await timedFetch(
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
 * Cached wrapper: the same spot (rounded to ~100 m) never
 * hits Nominatim twice, which also keeps us under its
 * ~1 request/second limit.
 */

const reverseCache = new Map();

async function reverseGeocodeCached(
    latitude,
    longitude,
    signal,
    options = {}
) {

    const key =
        `${latitude.toFixed(3)},${longitude.toFixed(3)}` +
        `|${options.detailed ? "d" : "s"}`;

    if (reverseCache.has(key)) {

        return reverseCache.get(key);

    }

    const result =
        await reverseGeocode(
            latitude,
            longitude,
            signal,
            options
        );

    if (result) {

        reverseCache.set(key, result);

    }

    return result;

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


    /*
     * Current location: fetch the weather and resolve the
     * place name IN PARALLEL (the weather only needs the
     * coordinates), and cap the name lookup at 3s so slow
     * Nominatim never blocks the forecast.
     */
    if (isCurrentLocation) {

        const nameController =
            new AbortController();

        const onParentAbort =
            () => nameController.abort();

        signal?.addEventListener(
            "abort",
            onParentAbort
        );

        const namePromise =
            Promise.race([
                reverseGeocodeCached(
                    location.latitude,
                    location.longitude,
                    nameController.signal,
                    { detailed: true }
                ).catch(() => null),
                new Promise((resolve) =>
                    setTimeout(() => {
                        nameController.abort();
                        resolve(null);
                    }, 3000)
                )
            ]);

        try {

            const [weatherData, reverse] =
                await Promise.all([
                    fetchWeatherForLocation(
                        {
                            ...location,
                            name: "Your area"
                        },
                        signal
                    ),
                    namePromise
                ]);

            if (reverse) {

                weatherData.city = reverse.name;

                weatherData.country =
                    reverse.country ||
                    weatherData.country;

                weatherData.countryCode =
                    reverse.country_code ||
                    weatherData.countryCode;

                weatherData.admin1 =
                    reverse.admin1 ||
                    weatherData.admin1;

            }

            return weatherData;

        } finally {

            signal?.removeEventListener(
                "abort",
                onParentAbort
            );

        }

    }


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
