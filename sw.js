const CACHE_PREFIX = "my-pos";
const SHELL_CACHE = `${CACHE_PREFIX}-shell-v6`;
const APP_ICONS = [
    "icons/apple-touch-icon.png",
    "icons/favicon-16.png",
    "icons/favicon-32.png",
    "icons/icon-192.png",
    "icons/icon-512.png",
    "icons/icon-maskable-512.png"
];

function isSameOriginAsset(url) {
    return url.origin === self.location.origin;
}

async function precacheAppShell() {
    const cache = await caches.open(SHELL_CACHE);
    const appUrl = new URL("./", self.registration.scope);
    const pageResponse = await fetch(appUrl);
    if (!pageResponse.ok) {
        throw new Error(`No se pudo precargar la app: ${pageResponse.status}`);
    }

    await cache.put(appUrl, pageResponse.clone());
    const html = await pageResponse.text();
    const assets = new Set([
        new URL("manifest.webmanifest", appUrl).href,
        ...APP_ICONS.map((path) => new URL(path, appUrl).href)
    ]);

    for (const match of html.matchAll(/(?:src|href)=["']([^"']+)["']/g)) {
        const url = new URL(match[1], appUrl);
        if (isSameOriginAsset(url)) assets.add(url.href);
    }

    const pendingAssets = [...assets];
    while (pendingAssets.length > 0) {
        const assetUrl = pendingAssets.pop();
        const url = new URL(assetUrl);
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`No se pudo precargar el recurso ${url.href}: ${response.status}`);
        }
        await cache.put(url, response.clone());

        if (url.pathname.endsWith(".css")) {
            const stylesheet = await response.text();
            for (const match of stylesheet.matchAll(/url\((?:["']?)([^)"']+)(?:["']?)\)/g)) {
                const resource = new URL(match[1], url);
                if (isSameOriginAsset(resource) && !assets.has(resource.href)) {
                    assets.add(resource.href);
                    pendingAssets.push(resource.href);
                }
            }
        }
    }
}

self.addEventListener("install", (event) => {
    event.waitUntil((async () => {
        await precacheAppShell();
        await self.skipWaiting();
    })());
});

self.addEventListener("activate", (event) => {
    event.waitUntil((async () => {
        const cacheNames = await caches.keys();
        await Promise.all(cacheNames
            .filter((name) => name.startsWith(`${CACHE_PREFIX}-`) && name !== SHELL_CACHE)
            .map((name) => caches.delete(name)));
        await self.clients.claim();
    })());
});

self.addEventListener("fetch", (event) => {
    const request = event.request;
    if (request.method !== "GET") return;

    const url = new URL(request.url);
    if (!isSameOriginAsset(url)) return;

    event.respondWith((async () => {
        const cache = await caches.open(SHELL_CACHE);

        if (request.mode === "navigate") {
            try {
                return await fetch(request);
            } catch {
                const appUrl = new URL("./", self.registration.scope);
                const cachedApp = await cache.match(appUrl);
                if (cachedApp) return cachedApp;
                throw new Error("La aplicación no está disponible en caché.");
            }
        }

        const isAppAsset = ["script", "style", "image", "font", "manifest"].includes(request.destination)
            || url.pathname.endsWith("/manifest.webmanifest");
        if (!isAppAsset) return fetch(request);

        const cachedResponse = await cache.match(request);
        if (cachedResponse) return cachedResponse;

        const response = await fetch(request);
        if (response.ok) await cache.put(request, response.clone());
        return response;
    })());
});
