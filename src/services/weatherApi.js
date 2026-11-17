/*
 * Public API surface of the weather service. The implementation
 * lives in focused modules:
 *
 *   http.js       timeouts, retry, response cache
 *   forecast.js   Open-Meteo forecast + history
 *   geocoding.js  city search, reverse geocoding, by-coordinates
 *   pincode.js    Indian pincode / post-office lookup
 */

export { clearWeatherCache } from "./http.js";

export {
    searchCities,
    getWeatherByCity,
    getWeatherByCoordinates
} from "./geocoding.js";

export {
    getPincodeAreas,
    getWeatherForPincodeArea
} from "./pincode.js";
