import {
    useEffect,
    useRef,
    useState
} from "react";


const GEOCODING_API =
    "https://geocoding-api.open-meteo.com/v1/search";


function WeatherSearch({
    onSearch,
    onClear,
    loading = false
}) {

    // =====================================================
    // STATE
    // =====================================================

    const [city, setCity] =
        useState("");

    const [suggestions, setSuggestions] =
        useState([]);

    const [showSuggestions, setShowSuggestions] =
        useState(false);

    const [activeIndex, setActiveIndex] =
        useState(-1);

    const [searchingCities, setSearchingCities] =
        useState(false);


    // =====================================================
    // REFS
    // =====================================================

    const searchWrapperRef =
        useRef(null);

    const debounceTimerRef =
        useRef(null);

    const abortControllerRef =
        useRef(null);


    // =====================================================
    // FETCH CITY SUGGESTIONS
    // =====================================================

    const fetchCitySuggestions = async (value) => {

        const trimmedValue =
            value.trim();


        if (
            trimmedValue.length === 0
        ) {

            setSuggestions([]);

            setShowSuggestions(false);

            setActiveIndex(-1);

            return;

        }


        // Cancel previous request
        if (abortControllerRef.current) {

            abortControllerRef.current.abort();

        }


        const controller =
            new AbortController();

        abortControllerRef.current =
            controller;


        setSearchingCities(true);


        try {

            const url =
                `${GEOCODING_API}?` +
                `name=${encodeURIComponent(trimmedValue)}` +
                `&count=10` +
                `&language=en` +
                `&format=json`;


            const response =
                await fetch(
                    url,
                    {
                        signal:
                            controller.signal
                    }
                );


            if (!response.ok) {

                throw new Error(
                    "Unable to search cities."
                );

            }


            const data =
                await response.json();


            // Ignore old requests
            if (
                controller.signal.aborted
            ) {

                return;

            }


            const results =
                Array.isArray(data.results)
                    ? data.results
                    : [];


            setSuggestions(results);

            setActiveIndex(-1);

            setShowSuggestions(
                results.length > 0
            );

        } catch (error) {

            if (
                error?.name ===
                "AbortError"
            ) {

                return;

            }


            setSuggestions([]);

            setShowSuggestions(false);

        } finally {

            if (
                !controller.signal.aborted
            ) {

                setSearchingCities(false);

            }

        }

    };


    // =====================================================
    // INPUT CHANGE
    // =====================================================

    const handleInputChange = (event) => {

        const value =
            event.target.value;


        setCity(value);

        setShowSuggestions(true);

        setActiveIndex(-1);


        // Clear previous debounce
        if (
            debounceTimerRef.current
        ) {

            clearTimeout(
                debounceTimerRef.current
            );

        }


        // Empty input
        if (
            !value.trim()
        ) {

            setSuggestions([]);

            setShowSuggestions(false);


            // Cancel pending autocomplete request
            if (
                abortControllerRef.current
            ) {

                abortControllerRef.current.abort();

                abortControllerRef.current =
                    null;

            }


            // Tell App.jsx that search was cleared
            if (onClear) {

                onClear();

            }

            return;

        }


        // Wait briefly before requesting API
        debounceTimerRef.current =
            setTimeout(() => {

                fetchCitySuggestions(value);

            }, 250);

    };


    // =====================================================
    // SELECT CITY
    // =====================================================
    //
    // IMPORTANT: when a suggestion is picked, we already
    // have its EXACT latitude/longitude/country from the
    // geocoding response. We pass that whole object up to
    // onSearch instead of just the city name string, so
    // App.jsx can fetch weather directly for those exact
    // coordinates rather than re-searching by name (which
    // is what previously caused picking "Kochi, India" to
    // sometimes load "Kochi, China" instead — a second,
    // separate name-only lookup with no way to know which
    // city was actually intended).
    // =====================================================

    const handleCitySelect = (location) => {

        if (!location) {

            return;

        }


        const selectedCity =
            location.name || "";


        setCity(selectedCity);


        // Close autocomplete
        setSuggestions([]);

        setShowSuggestions(false);

        setActiveIndex(-1);


        // Cancel pending city search
        if (
            abortControllerRef.current
        ) {

            abortControllerRef.current.abort();

            abortControllerRef.current =
                null;

        }


        // Cancel debounce
        if (
            debounceTimerRef.current
        ) {

            clearTimeout(
                debounceTimerRef.current
            );

            debounceTimerRef.current =
                null;

        }


        // Search immediately using the EXACT
        // location the user picked, not just its name.
        onSearch(location);

    };


    // =====================================================
    // FORM SUBMIT
    // =====================================================
    //
    // A manually typed + submitted search has no exact
    // coordinates attached, so this still sends a plain
    // string. App.jsx / weatherApi.js will fall back to
    // a name-based geocoding lookup for this path, which
    // can still be ambiguous for cities that share a name
    // across countries — picking a suggestion is the
    // reliable way to avoid that.
    // =====================================================

    const handleSubmit = (event) => {

        event.preventDefault();


        const trimmedCity =
            city.trim();


        if (
            !trimmedCity ||
            loading
        ) {

            return;

        }


        // Close suggestions
        setSuggestions([]);

        setShowSuggestions(false);

        setActiveIndex(-1);


        // Cancel autocomplete request
        if (
            abortControllerRef.current
        ) {

            abortControllerRef.current.abort();

            abortControllerRef.current =
                null;

        }


        // Cancel debounce
        if (
            debounceTimerRef.current
        ) {

            clearTimeout(
                debounceTimerRef.current
            );

            debounceTimerRef.current =
                null;

        }


        onSearch(trimmedCity);

    };


    // =====================================================
    // CLEAR SEARCH
    // =====================================================

    const handleClear = () => {

        setCity("");

        setSuggestions([]);

        setShowSuggestions(false);

        setActiveIndex(-1);


        // Cancel autocomplete request
        if (
            abortControllerRef.current
        ) {

            abortControllerRef.current.abort();

            abortControllerRef.current =
                null;

        }


        // Cancel pending debounce
        if (
            debounceTimerRef.current
        ) {

            clearTimeout(
                debounceTimerRef.current
            );

            debounceTimerRef.current =
                null;

        }


        // Tell App.jsx to clear weather
        if (onClear) {

            onClear();

        }

    };


    // =====================================================
    // KEYBOARD NAVIGATION
    // =====================================================

    const handleKeyDown = (event) => {

        if (
            !showSuggestions ||
            suggestions.length === 0
        ) {

            if (
                event.key === "Escape"
            ) {

                setShowSuggestions(false);

                setActiveIndex(-1);

            }

            return;

        }


        // Arrow down
        if (
            event.key === "ArrowDown"
        ) {

            event.preventDefault();


            setActiveIndex(
                (previousIndex) => {

                    if (
                        previousIndex >=
                        suggestions.length - 1
                    ) {

                        return 0;

                    }


                    return previousIndex + 1;

                }
            );

        }


        // Arrow up
        else if (
            event.key === "ArrowUp"
        ) {

            event.preventDefault();


            setActiveIndex(
                (previousIndex) => {

                    if (
                        previousIndex <= 0
                    ) {

                        return (
                            suggestions.length - 1
                        );

                    }


                    return previousIndex - 1;

                }
            );

        }


        // Enter
        else if (
            event.key === "Enter" &&
            activeIndex >= 0
        ) {

            event.preventDefault();


            const selectedLocation =
                suggestions[activeIndex];


            handleCitySelect(
                selectedLocation
            );

        }


        // Escape
        else if (
            event.key === "Escape"
        ) {

            event.preventDefault();

            setShowSuggestions(false);

            setActiveIndex(-1);

        }

    };


    // =====================================================
    // CLOSE WHEN CLICKING OUTSIDE
    // =====================================================

    useEffect(() => {

        const handleOutsideClick =
            (event) => {

                if (
                    searchWrapperRef.current &&
                    !searchWrapperRef.current.contains(
                        event.target
                    )
                ) {

                    setShowSuggestions(false);

                    setActiveIndex(-1);

                }

            };


        document.addEventListener(
            "mousedown",
            handleOutsideClick
        );


        return () => {

            document.removeEventListener(
                "mousedown",
                handleOutsideClick
            );

        };

    }, []);


    // =====================================================
    // CLEANUP
    // =====================================================

    useEffect(() => {

        return () => {

            if (
                debounceTimerRef.current
            ) {

                clearTimeout(
                    debounceTimerRef.current
                );

            }


            if (
                abortControllerRef.current
            ) {

                abortControllerRef.current.abort();

            }

        };

    }, []);


    // =====================================================
    // DISPLAY LOCATION
    // =====================================================

    const getLocationDetails = (
        location
    ) => {

        const parts = [];


        if (
            location.admin1
        ) {

            parts.push(
                location.admin1
            );

        }


        if (
            location.country
        ) {

            parts.push(
                location.country
            );

        }


        return parts.join(" • ");

    };


    // =====================================================
    // RENDER
    // =====================================================

    return (

        <section className="search-panel">

            {/* =================================================
                SEARCH HEADING
            ================================================= */}

            <div className="search-heading">

                <div className="search-icon">
                    ◎
                </div>


                <div>

                    <h2>
                        Search location
                    </h2>


                    <p>
                        Enter a city to view live weather data
                    </p>

                </div>

            </div>


            {/* =================================================
                SEARCH WRAPPER
            ================================================= */}

            <div
                ref={searchWrapperRef}
                className="weather-search-wrapper"
            >

                <form
                    className="weather-search-form"
                    onSubmit={handleSubmit}
                >

                    {/* =========================================
                        INPUT COLUMN
                    ========================================= */}

                    <div className="weather-search-input-column">

                        <div className="weather-search-input-wrap">

                            {/* Search icon */}

                            <span
                                className="weather-search-input-icon"
                                aria-hidden="true"
                            >
                                ⌖
                            </span>


                            {/* Input */}

                            <input
                                type="text"
                                value={city}
                                onChange={
                                    handleInputChange
                                }
                                onKeyDown={
                                    handleKeyDown
                                }
                                onFocus={() => {

                                    if (
                                        suggestions.length > 0 &&
                                        city.trim()
                                    ) {

                                        setShowSuggestions(
                                            true
                                        );

                                    }

                                }}
                                placeholder="Enter city name"
                                aria-label="City name"
                                aria-autocomplete="list"
                                aria-expanded={
                                    showSuggestions
                                }
                                autoComplete="off"
                                spellCheck="false"
                                disabled={loading}
                            />


                            {/* Loading indicator */}

                            {searchingCities && (

                                <div
                                    className="weather-search-loader"
                                    aria-hidden="true"
                                >

                                    <span />

                                </div>

                            )}


                            {/* Clear button */}

                            {city && !loading && (

                                <button
                                    type="button"
                                    className="clear-search"
                                    onClick={
                                        handleClear
                                    }
                                    aria-label="Clear search"
                                >
                                    ×
                                </button>

                            )}

                        </div>


                        {/* =====================================
                            AUTOCOMPLETE DROPDOWN
                        ====================================== */}

                        {showSuggestions &&
                            suggestions.length > 0 && (

                            <div
                                className="weather-city-suggestions"
                                role="listbox"
                            >

                                <div className="weather-suggestions-label">

                                    Matching cities

                                </div>


                                {suggestions.map(
                                    (
                                        location,
                                        index
                                    ) => (

                                    <button
                                        key={
                                            `${location.id}-${location.latitude}-${location.longitude}`
                                        }
                                        type="button"
                                        role="option"
                                        aria-selected={
                                            activeIndex ===
                                            index
                                        }
                                        className={
                                            `weather-city-suggestion ${
                                                activeIndex === index
                                                    ? "is-active"
                                                    : ""
                                            }`
                                        }
                                        onMouseDown={(
                                            event
                                        ) => {

                                            event.preventDefault();

                                        }}
                                        onClick={() =>
                                            handleCitySelect(
                                                location
                                            )
                                        }
                                        onMouseEnter={() =>
                                            setActiveIndex(
                                                index
                                            )
                                        }
                                    >

                                        {/* City icon */}

                                        <span
                                            className="weather-city-icon"
                                            aria-hidden="true"
                                        >
                                            ⌖
                                        </span>


                                        {/* City information */}

                                        <span className="weather-city-text">

                                            <strong>
                                                {
                                                    location.name
                                                }
                                            </strong>


                                            <small>
                                                {
                                                    getLocationDetails(
                                                        location
                                                    )
                                                }
                                            </small>

                                        </span>


                                        {/* Arrow */}

                                        <span
                                            className="weather-city-arrow"
                                            aria-hidden="true"
                                        >
                                            →
                                        </span>

                                    </button>

                                )
                                )}

                            </div>

                        )}

                    </div>


                    {/* =================================================
                        SEARCH BUTTON
                    ================================================= */}

                    <button
                        type="submit"
                        className="weather-search-button"
                        disabled={
                            loading ||
                            !city.trim()
                        }
                    >

                        {loading ? (

                            <>
                                <span className="button-spinner" />
                                Searching
                            </>

                        ) : (

                            <>
                                Search
                                <span>→</span>
                            </>

                        )}

                    </button>

                </form>

            </div>

        </section>

    );

}


export default WeatherSearch;