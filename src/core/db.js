const DB_NAME = 'lightweighted_pos';
const DB_VERSION = 1;
let dbInstance = null;

export const DB = {
    init: () => {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(DB_NAME, DB_VERSION);

            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                console.log(`[IndexedDB] Upgrading schema to v${DB_VERSION}`);

                if (!db.objectStoreNames.contains('events')) db.createObjectStore('events', { keyPath: 'id' });
                if (!db.objectStoreNames.contains('products')) {
                    const products = db.createObjectStore('products', { keyPath: 'id' });
                    products.createIndex('event_id', 'event_id', { unique: false });
                }
                if (!db.objectStoreNames.contains('product_sets')) {
                    const sets = db.createObjectStore('product_sets', { keyPath: 'id' });
                    sets.createIndex('event_id', 'event_id', { unique: false });
                }
                if (!db.objectStoreNames.contains('orders')) {
                    const orders = db.createObjectStore('orders', { keyPath: 'id' });
                    orders.createIndex('event_id', 'event_id', { unique: false });
                }
                if (!db.objectStoreNames.contains('system_logs')) db.createObjectStore('system_logs', { keyPath: 'id' });
            };

            request.onsuccess = (event) => {
                dbInstance = event.target.result;
                console.log('[IndexedDB] Initialized successfully');
                resolve(true);
            };

            request.onerror = (event) => {
                console.error('[IndexedDB] Initialization failed', event.target.error);
                reject(event.target.error);
            };
        });
    },

    execute: (storeName, mode, operation, payload = null) => {
        return new Promise((resolve, reject) => {
            if (!dbInstance) return reject(new Error('Database not initialized'));

            const transaction = dbInstance.transaction(storeName, mode);
            const store = transaction.objectStore(storeName);
            let request;

            switch (operation) {
                case 'getAll': request = store.getAll(); break;
                case 'get': request = store.get(payload); break;
                case 'put': request = store.put(payload); break;
                case 'add': request = store.add(payload); break;
                case 'delete': request = store.delete(payload); break;
                case 'clear': request = store.clear(); break;
                default: return reject(new Error('Unknown operation'));
            }

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }
};