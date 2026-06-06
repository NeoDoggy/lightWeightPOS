import { DB } from './db.js';
import { Logger } from './logger.js';

export const DataExchange = {
    exportToJSON: async () => {
        try {
            Logger.audit('Starting complete database export');
            const stores = ['events', 'products', 'product_sets', 'orders', 'system_logs'];
            const exportData = {};

            for (const store of stores) {
                exportData[store] = await DB.execute(store, 'readonly', 'getAll');
            }

            const dataStr = JSON.stringify(exportData, null, 2);
            const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
            
            const exportFileDefaultName = `lw_pos_backup_${new Date().toISOString().split('T')[0]}.json`;
            
            const linkElement = document.createElement('a');
            linkElement.setAttribute('href', dataUri);
            linkElement.setAttribute('download', exportFileDefaultName);
            linkElement.click();
            
            Logger.info('Database export successful');
        } catch (error) {
            Logger.error('Database export failed', error);
        }
    },

    importFromJSON: async (file) => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            
            reader.onload = async (e) => {
                try {
                    Logger.audit('Starting database import overlay');
                    const importedData = JSON.parse(e.target.result);
                    const stores = Object.keys(importedData);

                    for (const store of stores) {
                        const items = importedData[store];
                        if (Array.isArray(items)) {
                            // Clear existing to avoid ID collisions, or loop and PUT to overlay
                            await DB.execute(store, 'readwrite', 'clear');
                            for (const item of items) {
                                await DB.execute(store, 'readwrite', 'put', item);
                            }
                        }
                    }
                    Logger.info('Database import overlay complete');
                    resolve(true);
                } catch (error) {
                    Logger.error('Database import overlay failed', error);
                    reject(error);
                }
            };
            
            reader.onerror = (error) => reject(error);
            reader.readAsText(file);
        });
    }
};