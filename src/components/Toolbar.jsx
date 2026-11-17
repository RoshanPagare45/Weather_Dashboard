/*
 * Single-row toolbar under the search bar:
 *   °C / °F toggle · Refresh · Save place · saved places
 */

const sameSpot = (a, b) =>
    Math.abs(a.latitude - b.latitude) < 0.01 &&
    Math.abs(a.longitude - b.longitude) < 0.01;

function Toolbar({
    unit,
    onUnitChange,
    onRefresh,
    refreshing,
    current,
    favourites,
    onToggleFavourite,
    onSelect
}) {

    const isFavourite =
        !!current &&
        favourites.some((f) => sameSpot(f, current));

    return (

        <div
            className="toolbar"
            role="toolbar"
            aria-label="Dashboard options"
        >

            <div
                className="unit-toggle"
                role="group"
                aria-label="Temperature unit"
            >

                {["C", "F"].map((u) => (

                    <button
                        key={u}
                        type="button"
                        className={
                            unit === u
                                ? "unit-button active"
                                : "unit-button"
                        }
                        aria-pressed={unit === u}
                        onClick={() => onUnitChange(u)}
                    >
                        °{u}
                    </button>

                ))}

            </div>

            <button
                type="button"
                className="toolbar-button"
                onClick={onRefresh}
                disabled={refreshing}
            >
                ↻ Refresh
            </button>

            {current && (

                <button
                    type="button"
                    className="toolbar-button"
                    aria-pressed={isFavourite}
                    onClick={() => onToggleFavourite(current)}
                >
                    {isFavourite ? "★ Saved" : "☆ Save place"}
                </button>

            )}

            {favourites.map((place) => (

                <button
                    key={`f-${place.latitude}-${place.longitude}`}
                    type="button"
                    className="place-chip favourite"
                    onClick={() => onSelect(place)}
                >
                    ★ {place.name}
                </button>

            ))}

        </div>

    );

}

export default Toolbar;
