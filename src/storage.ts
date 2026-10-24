import { StorageBackend, LibraryData } from './types';

declare global {
  interface Window {
    Capacitor?: any;
    jsmediatags?: any;
    __tagsFailed?: boolean;
  }
}

const DB_NAME = 'waves-db';
const STORE_AUDIO = 'audio';
const STORE_META = 'meta';
const FS_DIR = 'DATA';
const LIBRARY_FILE = 'waves-library.json';

function openIDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (!('indexedDB' in window)) {
      return reject(new Error('IndexedDB not supported'));
    }
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = (e: any) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(STORE_AUDIO)) db.createObjectStore(STORE_AUDIO);
      if (!db.objectStoreNames.contains(STORE_META)) db.createObjectStore(STORE_META);
    };
    req.onsuccess = (e: any) => resolve(e.target.result);
    req.onerror = (e: any) => reject(e.target.error);
  });
}

function idbPut(store: string, key: any, value: any): Promise<void> {
  return openIDB().then(
    (db) =>
      new Promise((resolve, reject) => {
        const tx = db.transaction(store, 'readwrite');
        tx.objectStore(store).put(value, key);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      })
  );
}

function idbGet(store: string, key: any): Promise<any> {
  return openIDB().then(
    (db) =>
      new Promise((resolve, reject) => {
        const tx = db.transaction(store, 'readonly');
        const req = tx.objectStore(store).get(key);
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      })
  );
}

function idbDelete(store: string, key: any): Promise<void> {
  return openIDB().then(
    (db) =>
      new Promise((resolve, reject) => {
        const tx = db.transaction(store, 'readwrite');
        tx.objectStore(store).delete(key);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      })
  );
}

export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(',')[1] || '');
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function bytesToBase64(bytes: number[] | Uint8Array): string {
  const CHUNK = 0x8000;
  const parts: string[] = [];
  const len = bytes.length;
  for (let i = 0; i < len; i += CHUNK) {
    const slice = Array.from(bytes.slice(i, i + CHUNK));
    parts.push(String.fromCharCode.apply(null, slice));
  }
  return window.btoa(parts.join(''));
}

const capacitorBackend: StorageBackend = {
  mode: 'capacitor',
  saveAudio: async (id, file) => {
    const CAP = window.Capacitor;
    const ext = (file.name.split('.').pop() || 'mp3').toLowerCase().replace(/[^a-z0-9]/g, '') || 'mp3';
    const path = `songs/${id}.${ext}`;
    const base64 = await fileToBase64(file);
    await CAP.Plugins.Filesystem.writeFile({ path, data: base64, directory: FS_DIR, recursive: true });
    const uriRes = await CAP.Plugins.Filesystem.getUri({ path, directory: FS_DIR });
    return { ref: path, url: CAP.convertFileSrc(uriRes.uri) };
  },
  resolveUrl: async (ref) => {
    if (!ref) return null;
    const CAP = window.Capacitor;
    const uriRes = await CAP.Plugins.Filesystem.getUri({ path: String(ref), directory: FS_DIR });
    return CAP.convertFileSrc(uriRes.uri);
  },
  deleteAudio: async (ref) => {
    if (!ref) return;
    try {
      await window.Capacitor.Plugins.Filesystem.deleteFile({ path: String(ref), directory: FS_DIR });
    } catch (e) {
      // ignore
    }
  },
  saveMeta: async (data: LibraryData) => {
    await window.Capacitor.Plugins.Filesystem.writeFile({
      path: LIBRARY_FILE,
      data: JSON.stringify(data),
      directory: FS_DIR,
      encoding: 'utf8',
    });
  },
  loadMeta: async () => {
    try {
      const res = await window.Capacitor.Plugins.Filesystem.readFile({
        path: LIBRARY_FILE,
        directory: FS_DIR,
        encoding: 'utf8',
      });
      return JSON.parse(res.data);
    } catch (e) {
      return null;
    }
  },
};

const idbBackend: StorageBackend = {
  mode: 'indexeddb',
  saveAudio: async (id, file) => {
    await idbPut(STORE_AUDIO, id, file);
    return { ref: id, url: URL.createObjectURL(file) };
  },
  resolveUrl: async (ref) => {
    if (ref == null) return null;
    const blob = await idbGet(STORE_AUDIO, ref);
    return blob ? URL.createObjectURL(blob) : null;
  },
  deleteAudio: async (ref) => {
    if (ref == null) return;
    try {
      await idbDelete(STORE_AUDIO, ref);
    } catch (e) {
      // ignore
    }
  },
  saveMeta: async (data: LibraryData) => {
    await idbPut(STORE_META, 'library', data);
  },
  loadMeta: async () => {
    try {
      return (await idbGet(STORE_META, 'library')) || null;
    } catch (e) {
      return null;
    }
  },
};

const memoryBackend: StorageBackend = {
  mode: 'memory',
  saveAudio: async (_id, file) => {
    return { ref: null, url: URL.createObjectURL(file) };
  },
  resolveUrl: async () => null,
  deleteAudio: async (_ref, url) => {
    if (url) {
      try {
        URL.revokeObjectURL(url);
      } catch (e) {
        // ignore
      }
    }
  },
  saveMeta: async () => {},
  loadMeta: async () => null,
};

export async function detectStorage(): Promise<StorageBackend> {
  const CAP = window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.Filesystem ? window.Capacitor : null;
  if (CAP) return capacitorBackend;
  if ('indexedDB' in window) {
    try {
      await openIDB();
      return idbBackend;
    } catch (e) {
      // fallback
    }
  }
  return memoryBackend;
}
