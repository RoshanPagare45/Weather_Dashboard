/*
 * Current-location lookup.
 *
 * The browser's geolocation and an IP-based lookup run IN
 * PARALLEL. The fast (approximate) IP result is reported first;
 * if the precise browser position arrives later it is reported
 * too, so the caller can replace the estimate.
 */

const IP_SERVICES = [
    "https://ipapi.co/json/",
    "https://ipwho.is/"
];

const GEO_OPTIONS = {
    enableHighAccuracy: false,
    timeout: 6000,
    maximumAge: 600000
};

/** Approximate position from the IP address (first valid answer wins). */
export async function lookupByIp(timeoutMs = 4000) {

    const attempts = IP_SERVICES.map(async (url) => {

        const response = await fetch(
            url,
            { signal: AbortSignal.timeout(timeoutMs) }
        );

        const body = await response.json();

        if (
            typeof body.latitude !== "number" ||
            typeof body.longitude !== "number"
        ) {

            throw new Error("No coordinates in response");

        }

        return {
            latitude: body.latitude,
            longitude: body.longitude
        };

    });

    return Promise.any(attempts);

}

/** Human-readable message for a GeolocationPositionError-like object. */
export function geolocationMessage(error) {

    switch (error?.code) {

        case 0:
            return "Geolocation is not available in this browser. Please search for a city, pincode, or coordinates instead.";

        case 1:
            return "Location permission is blocked. Allow location access for this site in your browser settings (lock icon in the address bar), then reload, or search for a city instead.";

        case 2:
            return "Your device could not determine its location. Turn on Windows Location Services / Wi-Fi, or search for a city instead.";

        case 3:
            return "Finding your location timed out. Please try again, or search for a city instead.";

        default:
            return "We could not access your location. Please search for a city, pincode, or coordinates instead.";

    }

}

/**
 * onPosition({ latitude, longitude, precise }) may be called twice
 * (IP estimate, then precise). onFailure(error) is called once, only
 * if no position could be found at all.
 */
export function locateCurrentPosition({ onPosition, onFailure }) {

    let precise = false;
    let ipShown = false;
    let finished = false;
    let geoError = null;
    let geoDone = false;
    let ipDone = false;

    const maybeFail = () => {

        if (
            !finished &&
            geoDone &&
            ipDone &&
            !precise &&
            !ipShown
        ) {

            finished = true;

            onFailure(geoError);

        }

    };

    const supported =
        typeof navigator !== "undefined" &&
        !!navigator.geolocation;

    if (supported) {

        navigator.geolocation.getCurrentPosition(

            (position) => {

                precise = true;
                geoDone = true;

                onPosition({
                    latitude: position.coords.latitude,
                    longitude: position.coords.longitude,
                    precise: true
                });

            },

            (error) => {

                geoDone = true;
                geoError = error;

                // Permission denied: no point waiting for the IP lookup.
                if (error?.code === 1 && !ipShown) {

                    finished = true;

                    onFailure(error);

                    return;

                }

                maybeFail();

            },

            GEO_OPTIONS

        );

    } else {

        geoDone = true;
        geoError = { code: 0 };

    }

    lookupByIp()
        .then((coords) => {

            if (
                !precise &&
                !finished &&
                geoError?.code !== 1
            ) {

                ipShown = true;

                onPosition({ ...coords, precise: false });

            }

        })
        .catch(() => {
            // IP lookup failed; the browser lookup may still succeed.
        })
        .finally(() => {

            ipDone = true;

            maybeFail();

        });

}
