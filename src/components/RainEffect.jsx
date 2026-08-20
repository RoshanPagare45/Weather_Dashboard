import { useMemo } from "react";

/*
 * ==================================================
 * RAIN EFFECT
 *
 * Lightweight background-only rain overlay.
 *
 * IMPORTANT:
 * - Render this ONCE as the first child of .weather-app.
 * - It stays fixed to the viewport.
 * - It is placed behind all dashboard content.
 * - It never receives pointer events.
 * - Rain intensity is intentionally toned down.
 * ==================================================
 */

function createRainDrops(count) {

    return Array.from(
        { length: count },
        (_, index) => {

            const left =
                Math.random() * 100;

            const duration =
                0.5 + Math.random() * 0.6;

            const delay =
                Math.random() * 3;

            const length =
                55 + Math.random() * 70;

            // Darker + more visible rain drops
            const opacity =
                0.30 + Math.random() * 0.30;

            const drift =
                (Math.random() - 0.5) * 45;

            return {
                id: index,
                left,
                duration,
                delay,
                length,
                opacity,
                drift
            };

        }
    );

}


function RainEffect({
    active,
    intense = false,
    storm = false
}) {

    /*
     * Reduced from 65 / 110.
     *
     * Normal rain:
     * 45 drops
     *
     * Heavy rain:
     * 75 drops
     */
    const dropCount =
        intense ? 75 : 45;

    const drops = useMemo(
        () => createRainDrops(dropCount),
        [dropCount]
    );

    if (!active) {

        return null;

    }

    return (

        <div
            className={
                `rain-effect${
                    storm ? " rain-effect-storm" : ""
                }`
            }
            aria-hidden="true"
        >

            {drops.map(
                (drop) => (

                    <span
                        key={drop.id}
                        className="rain-drop"
                        style={{
                            left: `${drop.left}%`,
                            height: `${drop.length}px`,
                            opacity: drop.opacity,
                            animationDuration: `${drop.duration}s`,
                            animationDelay: `${drop.delay}s`,
                            "--drift": `${drop.drift}px`
                        }}
                    />

                )
            )}

            <div className="rain-mist" />

        </div>

    );

}


export default RainEffect;