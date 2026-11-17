import { timedFetch, fetchJson } from "./http.js";
import { GEOCODING_API } from "./geocoding.js";
import { fetchWeatherForLocation } from "./forecast.js";

const POSTAL_PINCODE_API = "https://api.postalpincode.in/pincode";

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
        await timedFetch(
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

