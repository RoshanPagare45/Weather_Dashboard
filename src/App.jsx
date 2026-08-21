import {
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState
} from "react";

import WeatherSearch from "./components/WeatherSearch";
import WeatherCard from "./components/WeatherCard";
import RainEffect from "./components/RainEffect";

import {
    getWeatherByCity,
    getWeatherByCoordinates,
    getWeatherByPincode,
    getPincodeAreas,
    getWeatherForPincodeArea
} from "./services/weatherApi";

import "./App.css";


function App() {

    const [weather, setWeather] =
        useState(null);

    const [loading, setLoading] =
        useState(false);

    const [error, setError] =
        useState("");


    /*
     * =====================================================
     * PINCODE AREA PICKER
     * =====================================================
     *
     * When a searched pincode maps to more than one
     * postal area, we don't guess — we store every area
     * here and let the user pick one. `null` means there
     * is no active pincode session at all.
     *
     *   { pincode: "422009", offices: [ {...}, {...} ] }
     *
     * NOTE: unlike before, this is NOT cleared once the
     * user picks an area — it stays populated for the
     * lifetime of that pincode search so the user can come
     * back to it later via the "Back" button. Whether the
     * picker grid is actually being SHOWN right now is a
     * separate flag: `showAreaPicker` below.
     * =====================================================
     */

    const [pincodeAreas, setPincodeAreas] =
        useState(null);


    /*
     * =====================================================
     * SHOW AREA PICKER
     * =====================================================
     *
     * true  → render the area-selection grid
     * false → render the weather dashboard (if any)
     *
     * Kept separate from `pincodeAreas` so the offices list
     * can persist in the background while the user is
     * looking at the weather for the area they picked, and
     * they can flip back to the grid without re-searching.
     * =====================================================
     */

    const [showAreaPicker, setShowAreaPicker] =
        useState(false);


    /*
     * =====================================================
     * WEATHER REQUEST CONTROLLER
     * =====================================================
     *
     * Only the newest weather request is allowed
     * to update the UI.
     */

    const weatherControllerRef =
        useRef(null);


    /*
     * =====================================================
     * SEARCH WEATHER
     * =====================================================
     *
     * `payload` is a TAGGED object coming from
     * WeatherSearch.jsx:
     *
     *   { type: "location", latitude, longitude,
     *     name, country, country_code, ... }
     *     — an exact suggestion the user picked from the
     *       autocomplete dropdown. Goes straight to
     *       getWeatherByCoordinates, no re-geocoding.
     *
     *   { type: "coords", latitude, longitude, name }
     *     — the user typed "lat, lon" directly (or this
     *       is the device's current location). Also goes
     *       straight to getWeatherByCoordinates.
     *
     *   { type: "pincode", code }
     *     — the user typed a numeric pincode/postal code.
     *       Goes to getPincodeAreas() first. If the
     *       pincode covers exactly one area, weather is
     *       fetched right away. If it covers more than
     *       one, a picker is shown (see pincodeAreas /
     *       showAreaPicker state above) and
     *       handleSelectPincodeArea() finishes the job
     *       once the user picks one. The user can return
     *       to that picker later via handleBackToAreaPicker().
     *
     *   { type: "name", value }
     *     — the user typed a plain city name and
     *       submitted without picking a suggestion. Goes
     *       to getWeatherByCity (name-based geocoding,
     *       which can still be ambiguous for cities that
     *       share a name across countries).
     * =====================================================
     */

    const handleSearch = useCallback(
        async (payload) => {

            if (!payload || typeof payload !== "object") {

                return;

            }


            const {
                type
            } = payload;


            if (
                type === "name" &&
                !payload.value?.trim()
            ) {

                return;

            }


            if (
                type === "pincode" &&
                !payload.code?.trim()
            ) {

                return;

            }


            /*
             * Cancel the previous request.
             */

            if (weatherControllerRef.current) {

                weatherControllerRef.current.abort();

            }


            const controller =
                new AbortController();

            weatherControllerRef.current =
                controller;


            setLoading(true);
            setError("");

            /*
             * A brand-new search (of any type) always
             * starts a fresh pincode session — clear out
             * whatever the previous pincode search left
             * behind.
             */
            setPincodeAreas(null);
            setShowAreaPicker(false);


            try {

                let weatherData;


                if (
                    type === "location" ||
                    type === "coords"
                ) {

                    weatherData =
                        await getWeatherByCoordinates(
                            {
                                name:
                                    payload.name ||
                                    "Pinned location",

                                country:
                                    payload.country || "",

                                country_code:
                                    payload.country_code || "",

                                admin1:
                                    payload.admin1 || "",

                                latitude:
                                    payload.latitude,

                                longitude:
                                    payload.longitude
                            },
                            controller.signal
                        );

                } else if (type === "pincode") {

                    /*
                     * STEP 1 — list every area for this
                     * pincode. No auto-selection here.
                     */

                    const areasData =
                        await getPincodeAreas(
                            payload.code.trim(),
                            controller.signal
                        );


                    if (
                        controller.signal.aborted ||
                        weatherControllerRef.current !==
                            controller
                    ) {

                        return;

                    }


                    if (
                        areasData.offices.length > 1
                    ) {

                        /*
                         * Multiple areas share this
                         * pincode — show the picker and
                         * stop here. handleSelectPincodeArea
                         * takes it from here once the user
                         * chooses one, and handleBackToAreaPicker
                         * can reopen this same list later.
                         */

                        setPincodeAreas({

                            pincode:
                                areasData.pincode,

                            offices:
                                areasData.offices

                        });

                        setShowAreaPicker(true);

                        setWeather(null);

                        return;

                    }


                    /*
                     * Exactly one area — no need to make
                     * the user pick, fetch it directly.
                     * There's nothing to "go back" to, so
                     * pincodeAreas stays cleared.
                     */

                    weatherData =
                        await getWeatherForPincodeArea(
                            areasData.pincode,
                            areasData.offices[0],
                            controller.signal
                        );

                } else {

                    weatherData =
                        await getWeatherByCity(
                            payload.value.trim(),
                            controller.signal
                        );

                }


                /*
                 * Never allow a stale request to update
                 * the application state.
                 */

                if (
                    controller.signal.aborted ||
                    weatherControllerRef.current !==
                        controller
                ) {

                    return;

                }


                if (!weatherData) {

                    throw new Error(
                        "No weather information was returned."
                    );

                }


                setWeather(weatherData);

            } catch (requestError) {

                if (
                    requestError?.name ===
                    "AbortError"
                ) {

                    return;

                }


                if (
                    controller.signal.aborted ||
                    weatherControllerRef.current !==
                        controller
                ) {

                    return;

                }


                console.error(
                    "Weather API error:",
                    requestError
                );


                setWeather(null);


                setError(
                    requestError?.message ||
                    "Unable to fetch weather information."
                );

            } finally {

                if (
                    weatherControllerRef.current ===
                    controller
                ) {

                    setLoading(false);

                }

            }

        },
        []
    );


    /*
     * =====================================================
     * SELECT A PINCODE AREA
     * =====================================================
     *
     * Called once the user picks one specific area from
     * the picker rendered when handleSearch() found more
     * than one office for a pincode.
     *
     * `pincodeAreas` itself is intentionally left populated
     * afterwards (NOT nulled out) so the user can return to
     * it later via handleBackToAreaPicker() — only the
     * `showAreaPicker` flag flips, swapping the picker grid
     * out for the weather dashboard.
     * =====================================================
     */

    const handleSelectPincodeArea = useCallback(

        async (office) => {

            if (
                !pincodeAreas ||
                !office
            ) {

                return;

            }


            if (weatherControllerRef.current) {

                weatherControllerRef.current.abort();

            }


            const controller =
                new AbortController();

            weatherControllerRef.current =
                controller;


            setLoading(true);
            setError("");


            try {

                const weatherData =
                    await getWeatherForPincodeArea(
                        pincodeAreas.pincode,
                        office,
                        controller.signal
                    );


                if (
                    controller.signal.aborted ||
                    weatherControllerRef.current !==
                        controller
                ) {

                    return;

                }


                if (!weatherData) {

                    throw new Error(
                        "No weather information was returned."
                    );

                }


                setShowAreaPicker(false);

                setWeather(weatherData);

            } catch (requestError) {

                if (
                    requestError?.name ===
                    "AbortError"
                ) {

                    return;

                }


                if (
                    controller.signal.aborted ||
                    weatherControllerRef.current !==
                        controller
                ) {

                    return;

                }


                console.error(
                    "Weather API error:",
                    requestError
                );


                setError(
                    requestError?.message ||
                    "Unable to fetch weather information."
                );

            } finally {

                if (
                    weatherControllerRef.current ===
                    controller
                ) {

                    setLoading(false);

                }

            }

        },
        [pincodeAreas]

    );


    /*
     * =====================================================
     * BACK TO AREA PICKER
     * =====================================================
     *
     * Lets the user return to the list of postal areas for
     * the pincode they already searched, without typing the
     * pincode again. Only meaningful while `pincodeAreas`
     * still holds data from the current pincode session
     * (i.e. that pincode had more than one area).
     * =====================================================
     */

    const handleBackToAreaPicker =
        useCallback(() => {

            if (!pincodeAreas) {

                return;

            }


            if (weatherControllerRef.current) {

                weatherControllerRef.current.abort();

                weatherControllerRef.current =
                    null;

            }


            setLoading(false);
            setError("");
            setWeather(null);

            setShowAreaPicker(true);

        }, [pincodeAreas]);


    /*
     * =====================================================
     * LOAD CURRENT LOCATION WEATHER
     * =====================================================
     *
     * Uses the browser's Geolocation API. Used both on
     * initial page load and whenever the search bar is
     * cleared, so the app always falls back to "where the
     * user actually is" rather than an empty state.
     * =====================================================
     */

    const loadCurrentLocationWeather =
        useCallback(() => {

            if (
                typeof navigator === "undefined" ||
                !navigator.geolocation
            ) {

                setWeather(null);

                setError(
                    "Geolocation isn't available in this browser. Please search for a city, pincode, or coordinates instead."
                );

                return;

            }


            setLoading(true);
            setError("");


            navigator.geolocation.getCurrentPosition(

                (position) => {

                    handleSearch({

                        type: "coords",

                        latitude:
                            position.coords.latitude,

                        longitude:
                            position.coords.longitude,

                        name:
                            "Current Location"

                    });

                },

                () => {

                    setLoading(false);


                    setWeather(null);


                    setError(
                        "We couldn't access your location. Please search for a city, pincode, or coordinates instead."
                    );

                },

                {
                    enableHighAccuracy: true,
                    timeout: 15000,
                    maximumAge: 0
                }

            );

        }, [handleSearch]);


    /*
     * =====================================================
     * INITIAL LOAD — show current location by default
     * =====================================================
     */

    useEffect(() => {

        loadCurrentLocationWeather();

        // Intentionally run once on mount only.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);


    /*
     * =====================================================
     * CLEAR WEATHER
     * =====================================================
     *
     * Clearing the search bar returns to the current
     * location's weather, rather than an empty state, and
     * ends any pincode session that was in progress.
     * =====================================================
     */

    const handleClear =
        useCallback(() => {

            if (weatherControllerRef.current) {

                weatherControllerRef.current.abort();

                weatherControllerRef.current =
                    null;

            }


            setPincodeAreas(null);
            setShowAreaPicker(false);


            loadCurrentLocationWeather();

        }, [loadCurrentLocationWeather]);


    /*
     * =====================================================
     * CANCEL PINCODE AREA PICKER
     * =====================================================
     *
     * Lets the user back out of the picker without
     * choosing an area — falls back to current location
     * weather, same as clearing the search bar. This ends
     * the pincode session entirely (unlike
     * handleBackToAreaPicker, which keeps it alive).
     * =====================================================
     */

    const handleCancelPincodeAreas =
        useCallback(() => {

            setPincodeAreas(null);
            setShowAreaPicker(false);


            if (weatherControllerRef.current) {

                weatherControllerRef.current.abort();

                weatherControllerRef.current =
                    null;

            }


            loadCurrentLocationWeather();

        }, [loadCurrentLocationWeather]);


    /*
     * =====================================================
     * WEATHER THEME
     * =====================================================
     *
     * FIX: this must produce a class name that actually
     * matches what App.css defines (".weather-theme-clear",
     * ".weather-theme-rain", ".weather-theme-cloudy", etc.)
     * — it previously emitted "app-<type>" (e.g. "app-rain"),
     * which matches NO selector in App.css. Because of that
     * mismatch, the page's accent colors/glow always stayed
     * on the default (root) theme no matter what the actual
     * fetched condition was — so every searched location,
     * including different postal areas under the same
     * pincode, visually looked the same regardless of
     * whether that specific area was clear, rainy, cloudy,
     * etc. Since `weather.condition.type` already comes
     * from the specific location/area that was just
     * fetched, simply emitting the correctly-named class
     * makes the visual theme track that exact area's real
     * current condition.
     * =====================================================
     */

    const weatherTheme =
        useMemo(() => {

            const type =
                weather?.condition?.type;


            if (!type) {

                return "weather-theme-default";

            }


            return `weather-theme-${type}`;

        }, [
            weather?.condition?.type
        ]);


    /*
     * =====================================================
     * RAIN EFFECT STATE
     * =====================================================
     */

    const rainState =
        useMemo(() => {

            const type =
                weather?.condition?.type;

            const active =
                type === "rain" ||
                type === "drizzle" ||
                type === "showers" ||
                type === "storm";

            return {

                active,

                intense:
                    type === "showers" ||
                    type === "storm",

                storm:
                    type === "storm"

            };

        }, [
            weather?.condition?.type
        ]);


    /*
     * =====================================================
     * RENDER
     * =====================================================
     */

    return (

        <main
            className={`weather-app ${weatherTheme}`}
        >

            {/* =================================================
                RAIN EFFECT
                Mounted ONCE, as the very first child of the
                app root, before everything else — so it
                stays a full-page background layer and never
                nests inside a card/section.
            ================================================= */}

            <RainEffect
                active={rainState.active}
                intense={rainState.intense}
                storm={rainState.storm}
            />


            {/* =================================================
                ATMOSPHERE
            ================================================= */}

            <div
                className="atmosphere"
                aria-hidden="true"
            >

                <div
                    className="atmosphere-glow"
                />

                <div
                    className="
                        atmosphere-orb
                        atmosphere-orb-one
                    "
                />

                <div
                    className="
                        atmosphere-orb
                        atmosphere-orb-two
                    "
                />

            </div>


            {/* =================================================
                MAIN CONTAINER
            ================================================= */}

            <div className="weather-container">


                {/* =================================================
                    HEADER
                ================================================= */}

                <header className="weather-header">

                    <div className="live-badge">

                        <span />

                        LIVE WEATHER

                    </div>


                    <h1>

                        Weather

                        <span>
                            Dashboard
                        </span>

                    </h1>


                    <p>
                        Real-time weather intelligence
                        for any location around the world.
                    </p>

                </header>


                {/* =================================================
                    SEARCH
                ================================================= */}

                <WeatherSearch
                    onSearch={handleSearch}
                    onClear={handleClear}
                    loading={loading}
                />


                {/* =================================================
                    PINCODE AREA PICKER

                    Shown when a searched pincode maps to
                    more than one postal area AND the user is
                    currently looking at the picker (either
                    because they just searched, or because
                    they clicked "Back" from the weather view
                    below). Nothing is auto-selected — the
                    user must pick.
                ================================================= */}

                {pincodeAreas &&
                    showAreaPicker &&
                    !loading && (

                    <section
                        className="pincode-picker-card"
                        role="region"
                        aria-label="Select a postal area"
                    >

                        <div className="pincode-picker-heading">

                            <span className="eyebrow">
                                PINCODE {pincodeAreas.pincode}
                            </span>

                            <h2>
                                Select your area
                            </h2>

                            <p>
                                This pincode covers multiple
                                post office areas. Choose the
                                one closest to you for accurate
                                local weather.
                            </p>

                        </div>


                        <div className="pincode-office-grid">

                            {pincodeAreas.offices.map(
                                (office, index) => (

                                    <button
                                        key={
                                            `${office.Name}-${index}`
                                        }
                                        type="button"
                                        className="pincode-office-button"
                                        onClick={
                                            () =>
                                                handleSelectPincodeArea(
                                                    office
                                                )
                                        }
                                    >

                                        <span className="pincode-office-name">

                                            {
                                                office.displayName ||
                                                office.Name
                                            }

                                        </span>


                                        <span className="pincode-office-meta">

                                            {
                                                [
                                                    office.District,
                                                    office.State
                                                ]
                                                    .filter(Boolean)
                                                    .join(", ")
                                            }

                                        </span>


                                        {office.BranchType && (

                                            <span className="pincode-office-badge">

                                                {office.BranchType}

                                            </span>

                                        )}

                                    </button>

                                )
                            )}

                        </div>


                        <button
                            type="button"
                            className="map-larger-link"
                            onClick={handleCancelPincodeAreas}
                        >

                            Cancel and use current location

                        </button>

                    </section>

                )}


                {/* =================================================
                    ERROR
                ================================================= */}

                {error && !loading && (

                    <section
                        className="error-card"
                        role="alert"
                        aria-live="polite"
                    >

                        <div
                            className="error-icon"
                            aria-hidden="true"
                        >
                            !
                        </div>


                        <div>

                            <strong>
                                Weather unavailable
                            </strong>

                            <p>
                                {error}
                            </p>

                        </div>

                    </section>

                )}


                {/* =================================================
                    LOADING
                ================================================= */}

                {loading && (

                    <section
                        className="loading-card"
                        role="status"
                        aria-live="polite"
                    >

                        <div
                            className="loading-spinner"
                            aria-hidden="true"
                        />


                        <div>

                            <strong>
                                Getting live conditions
                            </strong>

                            <p>
                                Connecting to the weather service…
                            </p>

                        </div>

                    </section>

                )}


                {/* =================================================
                    BACK TO AREA PICKER

                    Only appears when the weather currently on
                    screen came from a pincode that had more
                    than one postal area — lets the user
                    reopen that same list and pick a different
                    area, without retyping the pincode.
                ================================================= */}

                {weather &&
                    !loading &&
                    !error &&
                    !showAreaPicker &&
                    pincodeAreas &&
                    pincodeAreas.offices.length > 1 && (

                    <button
                        type="button"
                        className="pincode-back-button"
                        onClick={handleBackToAreaPicker}
                    >

                        <span aria-hidden="true">
                            ←
                        </span>

                        <span>
                            Change area (PIN {pincodeAreas.pincode})
                        </span>

                    </button>

                )}


                {/* =================================================
                    WEATHER DASHBOARD
                ================================================= */}

                {weather &&
                    !loading &&
                    !error &&
                    !showAreaPicker && (

                    <WeatherCard
                        weather={weather}
                    />

                )}


                {/* =================================================
                    EMPTY / WELCOME STATE
                    Only shown if there's truly nothing to
                    show yet (e.g. geolocation still pending
                    on a very first render tick).
                ================================================= */}

                {!weather &&
                    !loading &&
                    !error &&
                    !showAreaPicker && (

                    <section className="welcome-card">

                        <div
                            className="welcome-icon"
                            aria-hidden="true"
                        >
                            ☀
                        </div>


                        <span className="eyebrow">
                            WEATHER INTELLIGENCE
                        </span>


                        <h2>
                            Check the weather anywhere
                        </h2>


                        <p>
                            Search by city, pincode, or
                            "lat, lon" to see current
                            conditions, an 8-day forecast,
                            wind, humidity, visibility,
                            UV index and precipitation.
                        </p>

                    </section>

                )}


                {/* =================================================
                    FOOTER
                ================================================= */}

                <footer className="weather-footer">

                    <span>
                        Weather Dashboard
                    </span>

                    <span aria-hidden="true">
                        •
                    </span>

                    <span>
                        Powered by Open-Meteo
                    </span>

                </footer>

            </div>

        </main>

    );

}


export default App;