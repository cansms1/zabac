// ZABAC — hizmet betiği: uygulamayı internetsiz çalıştırır, paylaşılan dosyaları karşılar
const ONBELLEK = 'zabac-v2';
const PAYLASIM = 'zabac-paylasim';
const DOSYALAR = ['./', './index.html', './manifest.webmanifest', './ikon-192.png', './ikon-512.png', './pdf.min.js', './pdf.worker.min.js', './xlsx.full.min.js'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(ONBELLEK).then((c) => c.addAll(DOSYALAR)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((adlar) => Promise.all(adlar.filter((a) => a !== ONBELLEK && a !== PAYLASIM).map((a) => caches.delete(a)))).then(() => self.clients.claim()));
});

// Android'de "Paylaş → ZABAC": gelen dosyalar geçici olarak saklanır, uygulama açılınca okur
async function paylasimiAl(istek) {
  try {
    const form = await istek.formData();
    const c = await caches.open(PAYLASIM);
    let i = 0;
    for (const d of form.getAll('dosya')) {
      if (!(d instanceof File)) continue;
      await c.put('./paylasilan/' + Date.now() + '-' + (i++), new Response(d, { headers: { 'Content-Type': d.type || 'application/octet-stream', 'X-Dosya-Adi': encodeURIComponent(d.name || 'dosya') } }));
    }
  } catch (e) { /* okunamadıysa uygulama boş açılır */ }
  return Response.redirect('./?paylasim=1', 303);
}

self.addEventListener('fetch', (e) => {
  const istek = e.request;
  const adres = new URL(istek.url);
  if (adres.origin !== self.location.origin) return;
  if (istek.method === 'POST' && adres.pathname.endsWith('/paylas')) { e.respondWith(paylasimiAl(istek)); return; }
  if (istek.method !== 'GET') return;
  // Önce internet (yeni sürüm hemen gelsin), yoksa saklanan kopya
  e.respondWith(
    fetch(istek).then((yanit) => {
      if (yanit.ok) { const kopya = yanit.clone(); caches.open(ONBELLEK).then((c) => c.put(istek, kopya)); }
      return yanit;
    }).catch(() => caches.match(istek, { ignoreSearch: true }).then((y) => y || caches.match('./index.html')))
  );
});
