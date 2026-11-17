import { useCallback, useState } from "react";

/*
 * useState that persists to localStorage. Every storage access
 * is wrapped: private windows / blocked storage just fall back
 * to plain in-memory state.
 */
export default function useStoredState(key, initialValue) {

    const [value, setValue] = useState(() => {

        try {

            const raw = window.localStorage.getItem(key);

            return raw === null
                ? initialValue
                : JSON.parse(raw);

        } catch {

            return initialValue;

        }

    });

    const setAndStore = useCallback(
        (next) => {

            setValue((previous) => {

                const resolved =
                    typeof next === "function"
                        ? next(previous)
                        : next;

                try {

                    window.localStorage.setItem(
                        key,
                        JSON.stringify(resolved)
                    );

                } catch {
                    // storage unavailable — keep in memory only
                }

                return resolved;

            });

        },
        [key]
    );

    return [value, setAndStore];

}
