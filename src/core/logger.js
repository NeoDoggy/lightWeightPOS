import { DB } from './db.js';

const generateUUID = () => {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
};

export const Logger = {
    levels: { INFO: 'INFO', WARN: 'WARN', ERROR: 'ERROR', AUDIT: 'AUDIT' },
    
    log: (level, message, metadata = {}) => {
        const entry = {
            id: generateUUID(),
            timestamp: new Date().toISOString(),
            level,
            message,
            metadata
        };
        
        console.log(`[${entry.timestamp}] [${level}] ${message}`, metadata);
        
        // Asynchronously save to IndexedDB so it shows on the Dashboard
        // try {
        //     DB.execute('system_logs', 'readwrite', 'add', entry).catch(() => {});
        // } catch (e) {
        //     // Fails silently if DB isn't fully mounted yet
        // }
        
        return entry;
    },
    
    info: (msg, meta) => Logger.log(Logger.levels.INFO, msg, meta),
    audit: (msg, meta) => Logger.log(Logger.levels.AUDIT, msg, meta),
    error: (msg, meta) => Logger.log(Logger.levels.ERROR, msg, meta)
};