
self.addEventListener('install', (e)=>{
  e.waitUntil(caches.open('sunsar-v2').then(c=> c.addAll(['./','./index.html','./style.css','./script.js','./app-enhancements.js','./manifest.json'])));
});
self.addEventListener('fetch', (e)=>{
  e.respondWith(caches.match(e.request).then(r=> r || fetch(e.request)));
});
