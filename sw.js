const CACHE_NAME="fire-executive-pro-offline-final-v1";
const CORE=["./","./index.html","./manifest.json","./assets/js/three.min.js","./assets/fonts/local-fonts.css","./assets/fonts/Vazirmatn-Regular.woff2","./assets/fonts/Vazirmatn-Medium.woff2","./assets/fonts/Vazirmatn-Bold.woff2","./assets/fonts/Vazirmatn-ExtraBold.woff2"];
self.addEventListener("install",e=>{e.waitUntil(caches.open(CACHE_NAME).then(c=>c.addAll(CORE)));self.skipWaiting()});
self.addEventListener("activate",e=>{e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE_NAME).map(k=>caches.delete(k)))).then(()=>self.clients.claim()))});
self.addEventListener("fetch",e=>{if(e.request.method!=="GET")return;e.respondWith(caches.match(e.request).then(x=>x||fetch(e.request).then(r=>{if(new URL(e.request.url).origin===location.origin){const q=r.clone();caches.open(CACHE_NAME).then(c=>c.put(e.request,q))}return r}).catch(()=>caches.match("./index.html"))) )});
