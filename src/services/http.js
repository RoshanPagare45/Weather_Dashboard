/* HTTP helpers: timeout, retry, cache. */

const REQUEST_TIMEOUT_MS = 10000;

const CACHE_TTL_MS = 10 * 60 * 1000;

const responseCache = new Map();

/*
 * fetch() with a hard timeout and an offline check. A
 * caller-supplied AbortSignal still works: its abort is
 * rethrown as a normal AbortError (callers rely on that),
 * while OUR timeout becomes a readable Error.
 */
export async function timedFetch(
    url,
    { signal, timeout = REQUEST_TIMEOUT_MS, ...options } = {}
) {

    if (
        typeof navigator !== "undefined" &&
        navigator.onLine === false
    ) {

        throw new Error(
            "You appear to be offline. Check your internet connection and try again."
        );

    }

    const timeoutSignal =
        AbortSignal.timeout(timeout);

    const combined =
        signal
            ? AbortSignal.any([signal, timeoutSignal])
            : timeoutSignal;

    try {

        return await fetch(
            url,
            { ...options, signal: combined }
        );

    } catch (error) {

        if (
            timeoutSignal.aborted &&
            !signal?.aborted
        ) {

            throw new Error(
                "The service took too long to respond. Please try again."
            );

        }

        throw error;

    }

}

export async function fetchJson(url, signal, options = {}) {

    const isCacheable =
        !options.method ||
        options.method === "GET";

    if (isCacheable) {

        const hit = responseCache.get(url);

        if (
            hit &&
            Date.now() - hit.time < CACHE_TTL_MS
        ) {

            return hit.data;

        }

    }

    let response = null;

    // One automatic retry for network errors / 5xx.
    for (let attempt = 0; attempt < 2; attempt++) {

        try {

            response =
                await timedFetch(
                    url,
                    {
                        signal,
                        ...options
                    }
                );

            if (
                response.status >= 500 &&
                attempt === 0
            ) {

                continue;

            }

            break;

        } catch (networkError) {

            if (
                signal?.aborted ||
                networkError?.name === "AbortError" ||
                attempt === 1 ||
                !(networkError instanceof TypeError)
            ) {

                throw networkError;

            }

        }

    }

    let data = null;

    try {

        data =
            await response.json();

    } catch {

        throw new Error(
            "Invalid response received from weather service."
        );

    }

    if (!response.ok) {

        throw new Error(
            data?.reason ||
            data?.Message ||
            "Service returned an error."
        );

    }

    if (isCacheable) {

        responseCache.set(
            url,
            { data, time: Date.now() }
        );

    }

    return data;

}

/*
 * Reload support: lets the UI force fresh data.
 */
export function clearWeatherCache() {

    responseCache.clear();

}

