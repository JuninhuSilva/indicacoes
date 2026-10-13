// Armazenamento local em IndexedDB.
// Camada isolada: para sincronizar com a nuvem no futuro, só este ficheiro muda.
import { DB } from './config.js';

let dbPromise;

function abrir() {
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open(DB.nome, DB.versao);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(DB.store)) db.createObjectStore(DB.store, { keyPath: 'id' });
      };
      req.onsuccess = () => {
        const db = req.result;
        db.onversionchange = () => { db.close(); dbPromise = null; };
        resolve(db);
      };
      req.onerror = () => reject(req.error);
    });
  }
  return dbPromise;
}

function pedido(modo, fn) {
  return abrir().then((db) => new Promise((resolve, reject) => {
    const t = db.transaction(DB.store, modo);
    const r = fn(t.objectStore(DB.store));
    t.oncomplete = () => resolve(r ? r.result : undefined);
    t.onerror = () => reject(t.error);
  }));
}

export async function todos() {
  const lista = (await pedido('readonly', (s) => s.getAll())) || [];
  return lista.sort((a, b) => b.dataIndicacao.localeCompare(a.dataIndicacao));
}

export const obter = (id) => pedido('readonly', (s) => s.get(id));
export const guardar = (item) => pedido('readwrite', (s) => s.put(item)).then(() => item);
export const apagar = (id) => pedido('readwrite', (s) => s.delete(id));

// Lê, altera e grava na mesma transação (evita pisar alterações feitas pelo service worker).
export async function atualizar(id, alterar) {
  const db = await abrir();
  return new Promise((resolve, reject) => {
    const t = db.transaction(DB.store, 'readwrite');
    const s = t.objectStore(DB.store);
    let item;
    const r = s.get(id);
    r.onsuccess = () => {
      item = r.result;
      if (!item) return;
      alterar(item);
      item.atualizado = new Date().toISOString();
      s.put(item);
    };
    t.oncomplete = () => (item ? resolve(item) : reject(new Error('Indicação não encontrada')));
    t.onerror = () => reject(t.error);
  });
}

export function novoId() {
  return crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2);
}
