const CACHE_PREFIX = "my-pos";
const SHELL_CACHE = `${CACHE_PREFIX}-shell-v2`;
const RUNTIME_CACHE = `${CACHE_PREFIX}-runtime-v1`;
const PRECACHE_URLS = [
    "./",
    "./index.html",
    "./manifest.webmanifest",
    "./css/style.css",
    "./css/imagen/logo.jpg",
    "./css/imagen/dolar-favicon.jpg",
    "./css/icons/gear-solid.png",
    "./css/icons/bell-solid.png",
    "./css/icons/bell-regular.png",
    "./css/icons/apple-touch-icon.png",
    "./css/icons/pwa-192.png",
    "./css/icons/pwa-512.png",
    "./css/icons/pwa-512-maskable.png",
    "./js/app.js",
    "./js/state.js",
    "./js/firebase.js",
    "./js/caja.js",
    "./js/ventas.js",
    "./js/creditos.js",
    "./js/reportes.js"
];
const EXTERNAL_ASSETS = [
    "https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css",
    "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js",
    "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js"
];

function isSupportedExternalAsset(url) {
    return url.hostname === "cdnjs.cloudflare.com" ||
        url.hostname === "www.gstatic.com";
}

async function cacheRemoteModule(url, cache, visited) {
    if (visited.has(url)) return;
    visited.add(url);

    const response = await fetch(url, { mode: "cors" });
    if (!response.ok) {
        throw new Error(`No se pudo precargar el módulo ${url}: ${response.status}`);
    }

    await cache.put(url, response.clone());
    const source = await response.text();
    const imports = source.matchAll(/\b(?:import|export)\s*(?:[^'"]*?\s*from\s*)?["']([^"']+)["']/g);

    for (const match of imports) {
        const dependency = new URL(match[1], url);
        if (dependency.protocol === "https:" && isSupportedExternalAsset(dependency)) {
            await cacheRemoteModule(dependency.href, cache, visited);
        }
    }
}

async function cacheRemoteStylesheet(url, cache) {
    const response = await fetch(url, { mode: "cors" });
    if (!response.ok) {
        throw new Error(`No se pudo precargar la hoja de estilos ${url}: ${response.status}`);
    }

    await cache.put(url, response.clone());
    const stylesheet = await response.text();
    const resources = stylesheet.matchAll(/url\((?:["']?)([^)"']+)(?:["']?)\)/g);

    for (const match of resources) {
        const resource = new URL(match[1], url);
        if (resource.protocol === "https:" && isSupportedExternalAsset(resource)) {
            try {
                const assetResponse = await fetch(resource.href, { mode: "cors" });
                if (assetResponse.ok || assetResponse.type === "opaque") {
                    await cache.put(resource.href, assetResponse);
                }
            } catch (error) {
                console.warn(`No se pudo precargar el recurso visual ${resource.href}:`, error);
            }
        }
    }
}

self.addEventListener("install", event => {
    event.waitUntil((async () => {
        const shellCache = await caches.open(SHELL_CACHE);
        await shellCache.addAll(PRECACHE_URLS);

        const runtimeCache = await caches.open(RUNTIME_CACHE);
        const visitedModules = new Set();
        for (const asset of EXTERNAL_ASSETS) {
            try {
                if (asset.endsWith(".css")) {
                    await cacheRemoteStylesheet(asset, runtimeCache);
                } else {
                    await cacheRemoteModule(asset, runtimeCache, visitedModules);
                }
            } catch (error) {
                console.warn("No se pudo precargar un recurso externo; se intentará al abrir la app:", error);
            }
        }

        await self.skipWaiting();
    })());
});

self.addEventListener("activate", event => {
    event.waitUntil((async () => {
        const cacheNames = await caches.keys();
        await Promise.all(cacheNames
            .filter(name => name.startsWith(`${CACHE_PREFIX}-`) &&
                name !== SHELL_CACHE && name !== RUNTIME_CACHE)
            .map(name => caches.delete(name)));
        await self.clients.claim();
    })());
});

self.addEventListener("fetch", event => {
    const request = event.request;
    if (request.method !== "GET") return;

    const url = new URL(request.url);
    if (url.origin !== self.location.origin && !isSupportedExternalAsset(url)) return;

    event.respondWith((async () => {
        const cache = await caches.open(
            url.origin === self.location.origin ? SHELL_CACHE : RUNTIME_CACHE
        );
        const cachedResponse = await cache.match(request);

        if (cachedResponse) return cachedResponse;

        try {
            const response = await fetch(request);
            if (response.ok || response.type === "opaque") {
                await cache.put(request, response.clone());
            }
            return response;
        } catch (error) {
            if (request.mode === "navigate") {
                const offlinePage = await cache.match("./index.html");
                if (offlinePage) return offlinePage;
            }
            throw error;
        }
    })());
});
