// Service worker — 15 Pontos
// Troque a VERSAO sempre que publicar mudanças no app, para os celulares pegarem a nova versão.
const VERSAO = "v6";
const CACHE = "15pontos-" + VERSAO;
const BASICO = ["./", "./index.html", "./manifest.json", "./icon-192.png", "./icon-512.png", "./volante.js"];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(BASICO)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((ks) => Promise.all(ks.filter((k) => k.startsWith("15pontos-") && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Rede primeiro; se estiver sem internet, usa a cópia guardada.
async function redePrimeiro(req) {
  const cache = await caches.open(CACHE);
  try {
    // Paginas e dados: sempre confere se ha versao nova (ignora o cache do navegador).
    const resp = await fetch(req, { cache: "no-cache" });
    if (resp.ok) cache.put(req, resp.clone());
    return resp;
  } catch (err) {
    const salvo = await cache.match(req, { ignoreSearch: true });
    if (salvo) return salvo;
    if (req.mode === "navigate") return cache.match("./index.html");
    throw err;
  }
}

// Cache primeiro (bibliotecas do Firebase, que têm versão fixa na URL).
async function cachePrimeiro(req) {
  const cache = await caches.open(CACHE);
  const salvo = await cache.match(req);
  if (salvo) return salvo;
  const resp = await fetch(req);
  if (resp.ok) cache.put(req, resp.clone());
  return resp;
}

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin === self.location.origin) { e.respondWith(redePrimeiro(req)); return; }
  if (url.hostname === "www.gstatic.com" && url.pathname.startsWith("/firebasejs/")) { e.respondWith(cachePrimeiro(req)); return; }
  // Firestore, login, WhatsApp etc.: não mexe.
});
