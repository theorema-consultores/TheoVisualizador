const STORE = 'transfers';
const MAX_AGE_MS = 60 * 60 * 1000;

function requestResult(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export function createTransferStore(databaseApi = indexedDB, { databaseName = 'theo-visualizador', now = () => Date.now() } = {}) {
  const database = new Promise((resolve, reject) => {
    const request = databaseApi.open(databaseName, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(STORE, { keyPath: 'id' });
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  const run = async (mode, callback) => {
    const db = await database;
    const transaction = db.transaction(STORE, mode);
    const result = await callback(transaction.objectStore(STORE));
    await new Promise((resolve, reject) => {
      transaction.oncomplete = resolve;
      transaction.onerror = () => reject(transaction.error);
      transaction.onabort = () => reject(transaction.error);
    });
    return result;
  };
  return {
    async put(bytes) {
      const id = globalThis.crypto?.randomUUID?.() ?? `${now()}-${Math.random()}`;
      await run('readwrite', store => requestResult(store.put({ id, bytes, createdAt: now() })));
      return id;
    },
    async take(id) {
      return run('readwrite', async store => {
        const record = await requestResult(store.get(id));
        if (record) await requestResult(store.delete(id));
        return record ? new Uint8Array(record.bytes) : null;
      });
    },
    async cleanup(time = now()) {
      return run('readwrite', async store => {
        const records = await requestResult(store.getAll());
        await Promise.all(records.filter(record => time - record.createdAt > MAX_AGE_MS).map(record => requestResult(store.delete(record.id))));
      });
    }
  };
}
