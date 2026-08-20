import WeatherMap from "./WeatherMap";
import RainEffect from "./RainEffect";


function formatTime(value) {

    if (!value) {
        return "—";
    }

    const date =
        new Date(value);

    return date.toLocaleTimeString(
        "en-IN",
        {
            hour: "numeric",
            minute: "2-digit"
        }
    );

}


function formatVisibility(meters) {

    if (
        meters === undefined ||
        meters === null
    ) {
        return "—";
    }

    return `${(
        meters / 1000
    ).toFixed(1)} km`;

}


function formatDirection(degrees) {

    if (
        degrees === undefined ||
        degrees === null
    ) {
        return "—";
    }

    const directions = [
        "N",
        "NE",
        "E",
        "SE",
        "S",
        "SW",
        "W",
        "NW"
    ];

    const index =
        Math.round(degrees / 45) % 8;

    return directions[index];

}


function WeatherCard({ weather }) {

    if (!weather) {
        return null;
    }

    const current =
        weather.current;

    const units =
        weather.currentUnits;

    const forecast =
        weather.forecast || [];

    const historical =
        weather.historical || [];

    const condition =
        weather.condition || {
            type: "cloudy",
            label: "Cloudy",
            icon: "☁️"
        };

    const today =
        forecast[0];

    const tomorrow =
        forecast[1];


    /*
     * ==================================================
     * WEATHER THEME
     *
     * The class is controlled by the API weather condition.
     *
     * Examples:
     * clear
     * partly-cloudy
     * cloudy
     * fog
     * rain
     * drizzle
     * showers
     * storm
     * snow
     * ==================================================
     */

    const weatherTheme =
        condition.type || "cloudy";


    /*
     * ==================================================
     * IS IT RAINING?
     *
     * Covers every "wet" condition type returned by
     * getWeatherCondition() in weatherApi.js — the
     * rain overlay only renders for these.
     * ==================================================
     */

    const isRaining = [
        "rain",
        "drizzle",
        "showers",
        "storm"
    ].includes(weatherTheme);


    return (

        <div
            className={
                `weather-dashboard weather-theme-${weatherTheme}`
            }
        >


            {/* =================================================
                WEATHER ATMOSPHERE
            ================================================= */}

            <div
                className="weather-theme-atmosphere"
                aria-hidden="true"
            >

                <div className="theme-glow theme-glow-one" />

                <div className="theme-glow theme-glow-two" />

                <div className="theme-glow theme-glow-three" />

            </div>


            {/* =================================================
                RAIN OVERLAY
                Only rendered for rain / drizzle / showers / storm
            ================================================= */}

            <RainEffect
                active={isRaining}
                intense={
                    weatherTheme === "storm" ||
                    weatherTheme === "showers"
                }
                storm={weatherTheme === "storm"}
            />


            {/* =========================================
                MAIN WEATHER
            ========================================== */}

            <section className="dashboard-main-card">

                <div className="main-card-top">

                    <div>

                        <div className="location-pill">

                            <span>
                                ⌖
                            </span>

                            {weather.city},{" "}
                            {weather.country}

                        </div>

                        <p className="eyebrow">
                            CURRENT CONDITIONS
                        </p>

                    </div>


                    <div className="live-pill">

                        <span />

                        Live

                    </div>

                </div>


                <div className="main-weather-content">

                    <div className="temperature-block">

                        <div className="condition-label">

                            <span>
                                {condition.icon}
                            </span>

                            {condition.label}

                        </div>


                        <div className="big-temperature">

                            {Math.round(
                                current.temperature_2m
                            )}

                            <span>
                                {units.temperature_2m}
                            </span>

                        </div>


                        <p className="feels-like">

                            Feels like{" "}

                            {Math.round(
                                current.apparent_temperature
                            )}

                            {units.apparent_temperature}

                        </p>

                    </div>


                    <div className="weather-visual">

                        <div className="weather-orb">

                            <span>
                                {condition.icon}
                            </span>

                        </div>

                        <div className="weather-visual-label">

                            {weather.city}

                        </div>

                    </div>

                </div>


                <div className="temperature-range">

                    <div>

                        <span>
                            High
                        </span>

                        <strong>

                            {Math.round(
                                today?.maxTemperature ??
                                current.temperature_2m
                            )}°

                        </strong>

                    </div>


                    <div>

                        <span>
                            Low
                        </span>

                        <strong>

                            {Math.round(
                                today?.minTemperature ??
                                current.temperature_2m
                            )}°

                        </strong>

                    </div>


                    <div>

                        <span>
                            Rain
                        </span>

                        <strong>
                            {today?.precipitationProbability ?? 0}%
                        </strong>

                    </div>

                </div>

            </section>



            {/* =========================================
                HIGHLIGHTS
            ========================================== */}

            <section className="highlights-section">

                <div className="section-heading">

                    <div>

                        <span className="eyebrow">
                            WEATHER DATA
                        </span>

                        <h2>
                            Today's highlights
                        </h2>

                    </div>

                </div>


                <div className="highlights-grid">


                    <div className="highlight-card">

                        <span className="highlight-icon">
                            💧
                        </span>

                        <div>

                            <span>
                                Humidity
                            </span>

                            <strong>

                                {current.relative_humidity_2m}
                                {units.relative_humidity_2m}

                            </strong>

                        </div>

                    </div>


                    <div className="highlight-card">

                        <span className="highlight-icon">
                            💨
                        </span>

                        <div>

                            <span>
                                Wind
                            </span>

                            <strong>

                                {current.wind_speed_10m}
                                {" "}
                                {units.wind_speed_10m}

                            </strong>

                        </div>

                    </div>


                    <div className="highlight-card">

                        <span className="highlight-icon">
                            ☀
                        </span>

                        <div>

                            <span>
                                UV Index
                            </span>

                            <strong>
                                {today?.uvIndex ?? "—"}
                            </strong>

                        </div>

                    </div>


                    <div className="highlight-card">

                        <span className="highlight-icon">
                            ☁
                        </span>

                        <div>

                            <span>
                                Cloud cover
                            </span>

                            <strong>
                                {current.cloud_cover ?? "—"}%
                            </strong>

                        </div>

                    </div>


                    <div className="highlight-card">

                        <span className="highlight-icon">
                            👁
                        </span>

                        <div>

                            <span>
                                Visibility
                            </span>

                            <strong>

                                {formatVisibility(
                                    current.visibility
                                )}

                            </strong>

                        </div>

                    </div>


                    <div className="highlight-card">

                        <span className="highlight-icon">
                            🧭
                        </span>

                        <div>

                            <span>
                                Wind direction
                            </span>

                            <strong>

                                {formatDirection(
                                    current.wind_direction_10m
                                )}

                            </strong>

                        </div>

                    </div>

                </div>

            </section>



            {/* =========================================
                MAP
            ========================================== */}

            <WeatherMap
                latitude={weather.latitude}
                longitude={weather.longitude}
                city={weather.city}
                country={weather.country}
            />



            {/* =========================================
                LAST 8 DAYS
            ========================================== */}

            <section className="forecast-section historical-section">

                <div className="section-heading">

                    <div>

                        <span className="eyebrow">
                            HISTORY
                        </span>

                        <h2>
                            Last 8 days
                        </h2>

                    </div>

                    <span className="forecast-location">
                        {weather.timezoneAbbreviation}
                    </span>

                </div>


                {historical.length > 0 ? (

                    <div className="forecast-grid historical-grid">

                        {historical.map(
                            (day) => (

                                <article
                                    className="forecast-card historical-card"
                                    key={day.date}
                                >

                                    <div className="forecast-day">

                                        {day.day}

                                    </div>


                                    <div className="historical-date">

                                        {new Date(
                                            `${day.date}T12:00:00`
                                        ).toLocaleDateString(
                                            "en-IN",
                                            {
                                                day: "numeric",
                                                month: "short"
                                            }
                                        )}

                                    </div>


                                    <div className="forecast-icon">

                                        {day.icon}

                                    </div>


                                    <div className="forecast-condition">

                                        {day.condition}

                                    </div>


                                    <div className="forecast-temperature">

                                        <strong>

                                            {day.maxTemperature !== null
                                                ? Math.round(
                                                    day.maxTemperature
                                                )
                                                : "—"
                                            }°

                                        </strong>


                                        <span>

                                            {day.minTemperature !== null
                                                ? Math.round(
                                                    day.minTemperature
                                                )
                                                : "—"
                                            }°

                                        </span>

                                    </div>


                                    <div className="historical-precipitation">

                                        <span>
                                            💧
                                        </span>

                                        {day.precipitation !== null
                                            ? `${day.precipitation} mm`
                                            : "—"
                                        }

                                    </div>


                                    <div className="historical-wind">

                                        💨{" "}

                                        {day.windSpeed !== null
                                            ? `${Math.round(day.windSpeed)} km/h`
                                            : "—"
                                        }

                                    </div>

                                </article>

                            )
                        )}

                    </div>

                ) : (

                    <div className="historical-empty">

                        Historical weather data is unavailable
                        for this location.

                    </div>

                )}

            </section>



            {/* =========================================
                8 DAY FORECAST
            ========================================== */}

            <section className="forecast-section">

                <div className="section-heading">

                    <div>

                        <span className="eyebrow">
                            OUTLOOK
                        </span>

                        <h2>
                            8-day forecast
                        </h2>

                    </div>

                    <span className="forecast-location">
                        {weather.timezoneAbbreviation}
                    </span>

                </div>


                <div className="forecast-grid">

                    {forecast.map(
                        (day) => (

                            <article
                                className={
                                    `forecast-card ${
                                        day === today
                                            ? "forecast-card-active"
                                            : ""
                                    }`
                                }
                                key={day.date}
                            >

                                <div className="forecast-day">

                                    {day.day}

                                </div>


                                <div className="forecast-icon">

                                    {day.icon}

                                </div>


                                <div className="forecast-condition">

                                    {day.condition}

                                </div>


                                <div className="forecast-temperature">

                                    <strong>

                                        {Math.round(
                                            day.maxTemperature
                                        )}°

                                    </strong>

                                    <span>

                                        {Math.round(
                                            day.minTemperature
                                        )}°

                                    </span>

                                </div>


                                <div className="forecast-rain">

                                    <span>
                                        💧
                                    </span>

                                    {day.precipitationProbability}%

                                </div>

                            </article>

                        )
                    )}

                </div>

            </section>



            {/* =========================================
                ADDITIONAL INFORMATION
            ========================================== */}

            <section className="additional-section">

                <div className="section-heading">

                    <div>

                        <span className="eyebrow">
                            DETAILS
                        </span>

                        <h2>
                            Additional information
                        </h2>

                    </div>

                </div>


                <div className="additional-grid">


                    <div className="info-card">

                        <span>
                            Sunrise
                        </span>

                        <strong>

                            {formatTime(
                                today?.sunrise
                            )}

                        </strong>

                    </div>


                    <div className="info-card">

                        <span>
                            Sunset
                        </span>

                        <strong>

                            {formatTime(
                                today?.sunset
                            )}

                        </strong>

                    </div>


                    <div className="info-card">

                        <span>
                            Precipitation
                        </span>

                        <strong>

                            {current.precipitation}
                            {" "}
                            {units.precipitation}

                        </strong>

                    </div>


                    <div className="info-card">

                        <span>
                            Pressure
                        </span>

                        <strong>

                            {current.pressure_msl}
                            {" "}
                            {units.pressure_msl}

                        </strong>

                    </div>


                    <div className="info-card">

                        <span>
                            Wind gusts
                        </span>

                        <strong>

                            {current.wind_gusts_10m}
                            {" "}
                            {units.wind_gusts_10m}

                        </strong>

                    </div>


                    <div className="info-card">

                        <span>
                            Coordinates
                        </span>

                        <strong>

                            {weather.latitude.toFixed(2)},
                            {" "}
                            {weather.longitude.toFixed(2)}

                        </strong>

                    </div>

                </div>

            </section>



            {/* =========================================
                TOMORROW
            ========================================== */}

            {tomorrow && (

                <section className="tomorrow-card">

                    <div className="tomorrow-icon">

                        {tomorrow.icon}

                    </div>


                    <div className="tomorrow-content">

                        <span>
                            Tomorrow
                        </span>

                        <strong>
                            {tomorrow.condition}
                        </strong>

                        <p>

                            High{" "}
                            {Math.round(
                                tomorrow.maxTemperature
                            )}°

                            {" · "}

                            Low{" "}
                            {Math.round(
                                tomorrow.minTemperature
                            )}°

                            {" · "}

                            {tomorrow.precipitationProbability}%

                            {" "}chance of rain

                        </p>

                    </div>


                    <div className="tomorrow-temperature">

                        {Math.round(
                            tomorrow.maxTemperature
                        )}°

                    </div>

                </section>

            )}

        </div>

    );

}


export default WeatherCard;