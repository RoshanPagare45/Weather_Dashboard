import {
    useEffect,
    useId,
    useRef,
    useState
} from "react";


const GEOCODING_API =
    "https://geocoding-api.open-meteo.com/v1/search";


/*
 * ==================================================
 * DETECT QUERY TYPE
 * ==================================================
 *
 * A single input can be a city name, a "lat, lon" pair,
 * or a numeric pincode/postal code. This inspects the
 * raw text and returns a tagged payload so App.jsx can
 * route to the right lookup without re-parsing.
 * ==================================================
 */

const COORDINATE_PATTERN =
    /^\s*(-?\d{1,3}(?:\.\d+)?)\s*°?\s*([NnSs])?\s*[,\s]\s*(-?\d{1,3}(?:\.\d+)?)\s*°?\s*([EeWw])?\s*$/;

const PINCODE_PATTERN =
    /^\d{3,10}$/;


function detectQueryType(rawValue) {

    const value =
        rawValue.trim();


    const coordinateMatch =
        value.match(COORDINATE_PATTERN);

    if (coordinateMatch) {

        let latitude =
            Number(coordinateMatch[1]);

        let longitude =
            Number(coordinateMatch[3]);

        const latDirection =
            coordinateMatch[2]?.toUpperCase();

        const lonDirection =
            coordinateMatch[4]?.toUpperCase();

        // Apply N/S/E/W direction letters if present,
        // e.g. "19.076 S" flips a positive number negative.
        if (latDirection === "S") {

            latitude = -Math.abs(latitude);

        } else if (latDirection === "N") {

            latitude = Math.abs(latitude);

        }

        if (lonDirection === "W") {

            longitude = -Math.abs(longitude);

        } else if (lonDirection === "E") {

            longitude = Math.abs(longitude);

        }

        if (
            latitude >= -90 &&
            latitude <= 90 &&
            longitude >= -180 &&
            longitude <= 180
        ) {

            return {
                type: "coords",
                latitude,
                longitude,
                name: "Pinned location"
            };

        }

    }


    if (PINCODE_PATTERN.test(value)) {

        return {
            type: "pincode",
            code: value
        };

    }


    return {
        type: "name",
        value
    };

}


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

    // Ids that tie the input to its suggestion list (ARIA combobox).
    const listboxId = useId();

    const optionId = (index) =>
        `${listboxId}-option-${index}`;


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


        // Don't fetch city suggestions for coordinate
        // or pincode-style input — there's nothing to
        // autocomplete for those.
        const detected =
            detectQueryType(value);

        if (detected.type !== "name") {

            setSuggestions([]);

            setShowSuggestions(false);


            if (
                abortControllerRef.current
            ) {

                abortControllerRef.current.abort();

                abortControllerRef.current =
                    null;

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
        onSearch({
            type: "location",
            ...location
        });

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


        // Detect whether this is a city name, a
        // "lat, lon" pair, or a pincode, and send a
        // tagged payload so App.jsx can route it to
        // the right lookup.
        onSearch(
            detectQueryType(trimmedCity)
        );

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
                        City name, pincode, or "lat, lon"
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
                                placeholder="City, pincode, or lat, lon"
                                role="combobox"
                                aria-label="Search location by city, pincode, or coordinates"
                                aria-autocomplete="list"
                                aria-haspopup="listbox"
                                aria-controls={listboxId}
                                aria-expanded={
                                    showSuggestions &&
                                    suggestions.length > 0
                                }
                                aria-activedescendant={
                                    showSuggestions &&
                                    activeIndex >= 0
                                        ? optionId(activeIndex)
                                        : undefined
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
                                id={listboxId}
                                className="weather-city-suggestions"
                                role="listbox"
                                aria-label="Matching cities"
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
                                        id={optionId(index)}
                                        type="button"
                                        role="option"
                                        tabIndex={-1}
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

                    {/* Announces suggestion results to screen readers */}
                    <div
                        className="visually-hidden"
                        role="status"
                        aria-live="polite"
                    >
                        {showSuggestions && suggestions.length > 0
                            ? `${suggestions.length} suggestion${
                                  suggestions.length === 1 ? "" : "s"
                              } available. Use the up and down arrow keys to choose.`
                            : ""}
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
                                <span
                                    className="button-spinner"
                                    aria-hidden="true"
                                />
                                Searching
                            </>

                        ) : (

                            <>
                                Search
                                <span aria-hidden="true">→</span>
                            </>

                        )}

                    </button>

                </form>

            </div>

        </section>

    );

}


export default WeatherSearch;