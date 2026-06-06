const state = {
    active_view: 'selling',
    current_event_id: null,
    active_cart: [],
    sidebar_collapsed: true
};

const listeners = new Map();

export const Store = {
    get: (key) => state[key],
    
    set: (key, value) => {
        const previous = state[key];
        if (previous === value) return;
        
        state[key] = value;
        if (listeners.has(key)) {
            listeners.get(key).forEach(callback => callback(value, previous));
        }
    },
    
    subscribe: (key, callback) => {
        if (!listeners.has(key)) {
            listeners.set(key, new Set());
        }
        listeners.get(key).add(callback);
        
        return () => listeners.get(key).delete(callback);
    }
};