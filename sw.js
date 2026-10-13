// Service worker: funciona offline e mostra as notificações dos lembretes.
// Ao publicar uma versão nova, muda VERSAO para limpar a cache antiga.
const VERSAO = 'v4';
const CACHE = `indicacoes-${VERSAO}`;
const FICHEIROS = [
  './', './index.html', './css/app.css', './manifest.webmanifest',
  './js/app.js', './js/config.js', './js/store.js', './js/calculos.js', './js/views.js',
  './js/ui.js', './js/lembretes.js', './js/exportar.js', './js/vendedor.js',
  './icons/icon-192.png', './icons/icon-512.png', './icons/badge-96.png',
];

// Manter igual a js/config.js
const DB_NOME = 'controlo-indicacoes';
const DB_VERSAO = 1;
const STORE = 'indicacoes';
const PLANOS = { '4P': ['4P', 180], '3P': ['3P', 120], '1P2P': ['1P/2P', 80] };
const ABERTOS = ['indicado', 'negociacao'];
const HORA_INSTALACAO = 9; // manter igual a js/config.js

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(FICHEIROS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    const nomes = await caches.keys();
    await Promise.all(nomes.filter((n) => n.startsWith('indicacoes-') && n !== CACHE).map((n) => caches.delete(n)));
    await self.clients.claim();
  })());
});

// Mostra logo o que está em cache e atualiza em segundo plano.
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  const proprio = url.origin === self.location.origin;
  const fontes = /fonts\.(googleapis|gstatic)\.com$/.test(url.hostname);
  if (!proprio && !fontes) return;

  e.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const chave = req.mode === 'navigate' ? './index.html' : req;
    const emCache = await cache.match(chave, { ignoreSearch: req.mode === 'navigate' });
    const daRede = fetch(req).then((res) => {
      if (res.ok || res.type === 'opaque') cache.put(chave, res.clone());
      return res;
    }).catch(() => emCache);
    if (emCache) { e.waitUntil(daRede); return emCache; }
    return daRede;
  })());
});

// ---------- Lembretes ----------
function abrirDB() {
  return new Promise((resolve, reject) => {
    const r = indexedDB.open(DB_NOME, DB_VERSAO);
    r.onupgradeneeded = () => {
      if (!r.result.objectStoreNames.contains(STORE)) r.result.createObjectStore(STORE, { keyPath: 'id' });
    };
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
  });
}

async function verificarLembretes() {
  const db = await abrirDB();
  const lista = await new Promise((resolve, reject) => {
    const r = db.transaction(STORE).objectStore(STORE).getAll();
    r.onsuccess = () => resolve(r.result || []);
    r.onerror = () => reject(r.error);
  });
  const agora = Date.now();
  const hh = String(HORA_INSTALACAO).padStart(2, '0');
  // Lembretes para contactar o cliente
  const contactos = lista.filter((i) => i.lembrete && !i.lembrete.feito && !i.lembrete.notificado
    && ABERTOS.includes(i.status) && new Date(i.lembrete.quando).getTime() <= agora);
  // Dia da instalação (às HORA_INSTALACAO)
  const instalacoes = lista.filter((i) => i.status === 'fechado' && i.instalacao?.data && !i.instalacao.notificado
    && new Date(`${i.instalacao.data}T${hh}:00`).getTime() <= agora);

  const mostrados = [];
  const avisar = async (i, tipo, titulo, corpo) => {
    try {
      await self.registration.showNotification(titulo, {
        body: corpo, tag: `${tipo}-${i.id}`, data: { id: i.id },
        icon: 'icons/icon-192.png', badge: 'icons/badge-96.png',
        requireInteraction: true, vibrate: [200, 100, 200],
      });
      mostrados.push([i.id, tipo]);
    } catch { /* sem permissão: tenta de novo mais tarde */ }
  };
  for (const i of contactos) {
    const [plano, valor] = PLANOS[i.plano] || [i.plano, 0];
    await avisar(i, 'lembrete', `Contactar ${i.nome}`,
      `Plano ${plano} (${valor} €)${i.telefone ? `. Contacto: ${i.telefone}` : ''}. Toca para abrir.`);
  }
  for (const i of instalacoes) {
    const [plano, valor] = PLANOS[i.plano] || [i.plano, 0];
    await avisar(i, 'instalacao', `Instalação hoje: ${i.nome}`,
      `Plano ${plano}. Comissão de ${valor} € a receber com esta instalação.`);
  }

  if (mostrados.length) {
    await new Promise((resolve, reject) => {
      const t = db.transaction(STORE, 'readwrite');
      const s = t.objectStore(STORE);
      for (const [id, tipo] of mostrados) {
        const g = s.get(id);
        g.onsuccess = () => {
          const x = g.result;
          if (tipo === 'lembrete' && x?.lembrete && !x.lembrete.feito) { x.lembrete.notificado = true; s.put(x); }
          if (tipo === 'instalacao' && x?.instalacao) { x.instalacao.notificado = true; s.put(x); }
        };
      }
      t.oncomplete = resolve;
      t.onerror = () => reject(t.error);
    });
    const janelas = await self.clients.matchAll({ type: 'window' });
    janelas.forEach((c) => c.postMessage({ tipo: 'atualizado' }));
  }
  db.close();
}

self.addEventListener('message', (e) => {
  if (e.data?.tipo === 'verificar') e.waitUntil(verificarLembretes());
});

// Android/Chrome com a app instalada: o sistema acorda o service worker periodicamente.
self.addEventListener('periodicsync', (e) => {
  if (e.tag === 'lembretes') e.waitUntil(verificarLembretes());
});

self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  const id = e.notification.data?.id || '';
  e.waitUntil((async () => {
    const janelas = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const c of janelas) {
      if ('focus' in c) { await c.focus(); c.postMessage({ tipo: 'abrir', id }); return; }
    }
    await self.clients.openWindow(new URL(`./#/i/${id}`, self.registration.scope).href);
  })());
});
