import {
    useCallback,
    useMemo,
    useRef,
    useState
} from "react";

import WeatherSearch from "./components/WeatherSearch";
import WeatherCard from "./components/WeatherCard";
import RainEffect from "./components/RainEffect";

import {
    getWeatherByCity,
    getWeatherByCoordinates
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
     * `citySearchOrLocation` is one of:
     *
     *   - a STRING: the user typed a name and pressed
     *     Enter / the Search button. There's no exact
     *     location yet, so this falls back to a
     *     name-based geocoding lookup (getWeatherByCity),
     *     which can still be ambiguous for cities that
     *     share a name across countries.
     *
     *   - an OBJECT: the user picked an exact suggestion
     *     from the autocomplete dropdown. It already has
     *     the correct latitude/longitude/country, so this
     *     goes straight to getWeatherByCoordinates and
     *     skips re-geocoding entirely — this is what fixes
     *     picking "Kochi, India" from the list sometimes
     *     resolving to "Kochi, China": previously only the
     *     plain name was passed along, so it was searched
     *     from scratch a second time with no way to know
     *     which city was actually meant.
     * =====================================================
     */

    const handleSearch = useCallback(
        async (citySearchOrLocation) => {

            const isLocationObject =
                citySearchOrLocation &&
                typeof citySearchOrLocation === "object";


            const cleanCity =
                !isLocationObject &&
                typeof citySearchOrLocation === "string"
                    ? citySearchOrLocation.trim()
                    : "";


            /*
             * Ignore empty typed searches. (An object
             * always represents a real, already-picked
             * location, so it's never "empty" in this
             * sense.)
             */

            if (
                !isLocationObject &&
                !cleanCity
            ) {
                return;
            }


            /*
             * Cancel the previous request.
             */

            if (weatherControllerRef.current) {

                weatherControllerRef.current.abort();

            }


            /*
             * Create a controller for this request.
             */

            const controller =
                new AbortController();

            weatherControllerRef.current =
                controller;


            setLoading(true);
            setError("");


            try {

                const weatherData =
                    isLocationObject
                        ? await getWeatherByCoordinates(
                            citySearchOrLocation,
                            controller.signal
                        )
                        : await getWeatherByCity(
                            cleanCity,
                            controller.signal
                        );


                /*
                 * The request may have been cancelled
                 * while the API request was running.
                 *
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


                /*
                 * Validate that we received something
                 * usable before displaying it.
                 */

                if (!weatherData) {

                    throw new Error(
                        "No weather information was returned."
                    );

                }


                setWeather(weatherData);

            } catch (requestError) {

                /*
                 * Abort errors are expected and should
                 * not be shown to the user.
                 */

                if (
                    requestError?.name ===
                    "AbortError"
                ) {

                    return;

                }


                /*
                 * Ignore errors from stale requests.
                 */

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

                /*
                 * Only the currently active request
                 * is allowed to stop the loading state.
                 */

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
     * CLEAR WEATHER
     * =====================================================
     */

    const handleClear =
        useCallback(() => {

            /*
             * Cancel any active request.
             */

            if (weatherControllerRef.current) {

                weatherControllerRef.current.abort();

                weatherControllerRef.current =
                    null;

            }


            /*
             * Reset application state.
             */

            setWeather(null);
            setLoading(false);
            setError("");

        }, []);


    /*
     * =====================================================
     * WEATHER THEME
     * =====================================================
     *
     * Converts the weather condition type into
     * the corresponding application theme class.
     *
     * Example:
     *
     * clear
     * ↓
     * app-clear
     */

    const weatherTheme =
        useMemo(() => {

            const type =
                weather?.condition?.type;


            if (!type) {

                return "app-default";

            }


            return `app-${type}`;

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
                    WEATHER DASHBOARD
                ================================================= */}

                {weather &&
                    !loading &&
                    !error && (

                    <WeatherCard
                        weather={weather}
                    />

                )}


                {/* =================================================
                    EMPTY / WELCOME STATE
                ================================================= */}

                {!weather &&
                    !loading &&
                    !error && (

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
                            Search for a city to see current
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