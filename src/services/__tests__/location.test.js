import { describe, it, expect, vi, afterEach } from "vitest";
import {
    geolocationMessage,
    locateCurrentPosition,
    lookupByIp
} from "../location.js";

afterEach(() => {
    vi.unstubAllGlobals();
});

const okIp = (lat, lon) =>
    Promise.resolve({
        json: () => Promise.resolve({ latitude: lat, longitude: lon })
    });

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

describe("geolocationMessage", () => {
    it("has a distinct message per error code", () => {
        const messages = [0, 1, 2, 3, 99].map((code) =>
            geolocationMessage({ code })
        );
        expect(new Set(messages).size).toBe(5);
    });
});

describe("lookupByIp", () => {
    it("falls back to the second service when the first fails", async () => {
        const fetchMock = vi
            .fn()
            .mockRejectedValueOnce(new Error("rate limited"))
            .mockImplementationOnce(() => okIp(18.5, 73.8));
        vi.stubGlobal("fetch", fetchMock);

        await expect(lookupByIp()).resolves.toEqual({
            latitude: 18.5,
            longitude: 73.8
        });
    });

    it("rejects when every service fails", async () => {
        vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("x")));
        await expect(lookupByIp()).rejects.toBeTruthy();
    });
});

describe("locateCurrentPosition", () => {
    it("reports the IP estimate first, then the precise position", async () => {
        let succeed;
        vi.stubGlobal("navigator", {
            geolocation: {
                getCurrentPosition: (ok) => {
                    succeed = ok;
                }
            }
        });
        vi.stubGlobal("fetch", vi.fn(() => okIp(1, 2)));

        const onPosition = vi.fn();
        const onFailure = vi.fn();
        locateCurrentPosition({ onPosition, onFailure });

        await flush();
        expect(onPosition).toHaveBeenCalledWith({
            latitude: 1,
            longitude: 2,
            precise: false
        });

        succeed({ coords: { latitude: 3, longitude: 4 } });
        expect(onPosition).toHaveBeenLastCalledWith({
            latitude: 3,
            longitude: 4,
            precise: true
        });
        expect(onFailure).not.toHaveBeenCalled();
    });

    it("fails immediately when permission is denied", async () => {
        vi.stubGlobal("navigator", {
            geolocation: {
                getCurrentPosition: (_ok, fail) => fail({ code: 1 })
            }
        });
        vi.stubGlobal("fetch", vi.fn(() => okIp(1, 2)));

        const onPosition = vi.fn();
        const onFailure = vi.fn();
        locateCurrentPosition({ onPosition, onFailure });

        await flush();
        expect(onFailure).toHaveBeenCalledWith({ code: 1 });
        expect(onPosition).not.toHaveBeenCalled();
    });

    it("fails only when both geolocation and IP lookups fail", async () => {
        vi.stubGlobal("navigator", {
            geolocation: {
                getCurrentPosition: (_ok, fail) => fail({ code: 3 })
            }
        });
        vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("x")));

        const onFailure = vi.fn();
        locateCurrentPosition({ onPosition: vi.fn(), onFailure });

        await flush();
        await flush();
        expect(onFailure).toHaveBeenCalledTimes(1);
        expect(onFailure).toHaveBeenCalledWith({ code: 3 });
    });
});
