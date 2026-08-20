/*
 * ==================================================
 * WEATHER MAP
 *
 * No mapping library — this embeds OpenStreetMap's
 * own free map viewer directly via an <iframe>,
 * the same embed OSM's own "Export" tab generates.
 * Free, no API key, nothing to load or initialize.
 * ==================================================
 */


/*
 * Builds a bounding box around the city so the
 * embed opens at roughly a city-level zoom instead
 * of the whole world.
 */

function buildBoundingBox(
    latitude,
    longitude,
    spanDegrees = 0.15
) {

    const left =
        longitude - spanDegrees;

    const right =
        longitude + spanDegrees;

    const bottom =
        latitude - spanDegrees;

    const top =
        latitude + spanDegrees;

    return `${left},${bottom},${right},${top}`;

}


function WeatherMap({
    latitude,
    longitude,
    city,
    country
}) {

    if (
        latitude === undefined ||
        longitude === undefined
    ) {

        return null;

    }

    const bbox =
        buildBoundingBox(
            latitude,
            longitude
        );

    const marker =
        `${latitude},${longitude}`;

    const embedUrl =
        `https://www.openstreetmap.org/export/embed.html` +
        `?bbox=${encodeURIComponent(bbox)}` +
        `&layer=mapnik` +
        `&marker=${encodeURIComponent(marker)}`;

    const largerMapUrl =
        `https://www.openstreetmap.org/?mlat=${latitude}` +
        `&mlon=${longitude}` +
        `#map=12/${latitude}/${longitude}`;


    return (

        <section className="map-section">

            <div className="section-heading">

                <div>

                    <span className="eyebrow">
                        LOCATION
                    </span>

                    <h2>
                        On the map
                    </h2>

                </div>

                <span className="forecast-location">

                    {city}, {country}

                </span>

            </div>


            <div className="map-frame">

                <iframe
                    className="map-container"
                    title={`Map of ${city}`}
                    src={embedUrl}
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                />

            </div>


            <a
                className="map-larger-link"
                href={largerMapUrl}
                target="_blank"
                rel="noopener noreferrer"
            >

                View larger map on OpenStreetMap ↗

            </a>

        </section>

    );

}


export default WeatherMap;