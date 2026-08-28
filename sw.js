const CACHE_NAME='fireexec-pro-v7.10.7';
const ASSETS=['./','./index.html','./manifest.json','./favicon.png','./icon-192.png','./icon-512.png','./icon-maskable-512.png','./license-manager.js'];

self.addEventListener('install',event=>{
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache=>cache.addAll(ASSETS).catch(()=>{}))
      .then(()=>self.skipWaiting())
  );
});

self.addEventListener('activate',event=>{
  event.waitUntil(
    caches.keys()
      .then(keys=>Promise.all(keys.filter(k=>k.startsWith('fireexec-pro-')&&k!==CACHE_NAME).map(k=>caches.delete(k))))
      .then(()=>self.clients.claim())
  );
});

self.addEventListener('fetch',event=>{
  const req=event.request;
  if(req.method!=='GET') return;
  const url=new URL(req.url);
  const isHtml=req.mode==='navigate'
    || url.pathname.endsWith('/')
    || url.pathname.endsWith('/index.html')
    || (req.headers.get('accept')||'').includes('text/html');

  if(isHtml){
    event.respondWith(
      fetch(req,{cache:'no-store'})
        .then(resp=>{
          if(resp && resp.ok){
            const copy=resp.clone();
            caches.open(CACHE_NAME).then(c=>c.put(req,copy)).catch(()=>{});
          }
          return resp;
        })
        .catch(()=>caches.match(req).then(r=>r||caches.match('./index.html')))
    );
    return;
  }

  event.respondWith(
    caches.match(req).then(cached=>{
      if(cached) return cached;
      return fetch(req).then(resp=>{
        if(resp && resp.ok && url.origin===self.location.origin){
          const copy=resp.clone();
          caches.open(CACHE_NAME).then(c=>c.put(req,copy)).catch(()=>{});
        }
        return resp;
      });
    })
  );
});
