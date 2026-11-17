import { useCallback } from "react";

import {
    geolocationMessage,
    locateCurrentPosition
} from "../services/location";

/*
 * Returns a function that loads weather for the user's current
 * location (browser geolocation + IP fallback, see
 * services/location.js). Used on first load, when the search is
 * cleared, and by the "Try again" button.
 */
export default function useCurrentLocation({
    handleSearch,
    setLoading,
    setError,
    setWeather
}) {

    return useCallback(() => {

        setLoading(true);
        setError("");

        locateCurrentPosition({

            onPosition: ({ latitude, longitude }) => {

                handleSearch({
                    type: "coords",
                    latitude,
                    longitude,
                    name: "Current Location"
                });

            },

            onFailure: (error) => {

                setLoading(false);
                setWeather(null);
                setError(geolocationMessage(error));

            }

        });

    }, [handleSearch, setLoading, setError, setWeather]);

}
