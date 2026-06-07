import { DB } from '../core/db.js';
import { Logger } from '../core/logger.js';
import { DataExchange } from '../core/dataExchange.js';
import { Store } from '../core/store.js';
import { Onboarding } from './Onboarding.js';
import { i18n } from '../core/i18n.js';

export const initSettings = async (containerId) => {
    const container = document.getElementById(containerId);
    if (!container) return;

    let events = [];

    const loadEvents = async () => {
        events = await DB.execute('events', 'readonly', 'getAll');
    };

    const render = () => {
        container.innerHTML = `
            <div style="padding: 1.5rem; max-width: 800px; margin: 0 auto;">
                <h2 style="font-family: var(--font-display); margin-top: 0;">${i18n.t('settings_title')}</h2>
                
                <div style="background: var(--bg-surface); padding: 1.5rem; border: 1px solid var(--border-structural); border-radius: 4px; margin-bottom: 1.5rem;">
                    <h3 style="margin-top: 0; font-family: var(--font-display);">${i18n.t('settings_event_mgmt_title')}</h3>
                    
                    <div style="display: flex; gap: 1rem; margin-bottom: 1.5rem;">
                        <input type="text" id="new-event-name" placeholder="${i18n.t('settings_event_name_placeholder')}" style="flex: 1; padding: 0.75rem; background: var(--bg-base); border: 1px solid var(--border-structural); color: white; border-radius: 4px;">
                        <button id="btn-add-event" style="padding: 0.75rem 1.5rem; background: var(--accent-green); border: none; color: white; border-radius: 4px; cursor: pointer; font-weight: 600;">${i18n.t('settings_event_create_event_button')}</button>
                    </div>

                    <div style="border: 1px solid var(--border-structural); border-radius: 4px; overflow: hidden;">
                        ${events.map(e => `
                            <div style="display: flex; justify-content: space-between; align-items: center; padding: 1rem; border-bottom: 1px solid var(--border-structural); background: var(--bg-base);">
                                <span style="font-weight: 500;">${e.name}</span>
                                <div style="display: flex; gap: 0.5rem;">
                                    <button class="btn-del-event" data-id="${e.id}" style="padding: 0.5rem 1rem; background: transparent; border: 1px solid var(--accent-red); color: var(--accent-red); border-radius: 4px; cursor: pointer;">${i18n.t('settings_event_delete_button')}</button>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>

                <div style="background: var(--bg-surface); padding: 1.5rem; border: 1px solid var(--border-structural); border-radius: 4px; margin-bottom: 1.5rem;">
                    <h3 style="margin-top: 0; font-family: var(--font-display);">${i18n.t('settings_data_sync_title')}</h3>
                    <p style="color: var(--text-muted); font-size: 0.9rem; margin-bottom: 1.5rem;">${i18n.t('settings_data_sync_desc')}</p>
                    <div style="display: flex; gap: 1rem;">
                        <button id="btn-export" style="padding: 0.75rem 1.5rem; background: var(--border-component); border: 1px solid var(--border-accent); color: white; border-radius: 4px; cursor: pointer;"><i class="fa-solid fa-download"></i> ${i18n.t('settings_export_button')}</button>
                        <button id="btn-import-trigger" style="padding: 0.75rem 1.5rem; background: var(--border-component); border: 1px solid var(--border-accent); color: white; border-radius: 4px; cursor: pointer;"><i class="fa-solid fa-upload"></i> ${i18n.t('settings_import_button')}</button>
                        <input type="file" id="file-import" accept=".json" style="display: none;">
                    </div>
                </div>

                <div style="background: var(--bg-surface); padding: 1.5rem; border: 1px solid var(--border-structural); border-radius: 4px; margin-bottom: 1.5rem;">
                    <h3 style="margin-top: 0; font-family: var(--font-display);">${i18n.t('settings_language_title')}</h3>
                    
                    <select id="lang-selector" class="form-select" style="max-width: 200px; cursor: pointer;">
                        <option value="en" ${i18n.getCurrentLocale() === 'en' ? 'selected' : ''}>English</option>
                        <option value="zh-TW" ${i18n.getCurrentLocale() === 'zh-TW' ? 'selected' : ''}>繁體中文</option>
                    </select>
                </div>

                <div style="background: var(--bg-surface); padding: 1.5rem; border: 1px solid var(--border-structural); border-radius: 4px;">
                    <h3 style="margin-top: 0; font-family: var(--font-display);">${i18n.t('settings_tutorial_title')}</h3>
                    <button id="btn-replay-tour" style="padding: 0.75rem 1.5rem; background: var(--border-component); border: 1px solid var(--border-accent); color: white; border-radius: 4px; cursor: pointer;"><i class="fa-solid fa-circle-play"></i> ${i18n.t('settings_replay_tour_button')}</button>
                </div>
            </div>
        `;

        bindEvents();
    };

    const bindEvents = () => {
        // Event Management Binding
        document.getElementById('btn-add-event').addEventListener('click', async () => {
            const name = document.getElementById('new-event-name').value;
            if (!name) return alert('Event name cannot be empty.');

            const newEvent = { id: `evt_${Date.now()}`, name, timestamp: new Date().toISOString() };
            await DB.execute('events', 'readwrite', 'add', newEvent);
            Logger.audit('New event created', newEvent);
            
            await loadEvents();
            render();
            
            if (!Store.get('current_event_id')) {
                Store.set('current_event_id', newEvent.id);
            }
        });

        document.querySelectorAll('.btn-del-event').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const id = e.target.getAttribute('data-id');
                
                if (confirm('Warning: This will PERMANENTLY delete this event AND scrub all its associated items, sets, and past orders from the database. Proceed?')) {
                    
                    // Cascade Delete: Products
                    const products = await DB.execute('products', 'readonly', 'getAll');
                    for (const p of products.filter(p => p.event_id === id)) {
                        await DB.execute('products', 'readwrite', 'delete', p.id);
                    }
                    
                    // Cascade Delete: Sets
                    const sets = await DB.execute('product_sets', 'readonly', 'getAll');
                    for (const s of sets.filter(s => s.event_id === id)) {
                        await DB.execute('product_sets', 'readwrite', 'delete', s.id);
                    }

                    // Cascade Delete: Orders
                    const orders = await DB.execute('orders', 'readonly', 'getAll');
                    for (const o of orders.filter(o => o.event_id === id)) {
                        await DB.execute('orders', 'readwrite', 'delete', o.id);
                    }

                    // Finally, Delete the Event itself
                    await DB.execute('events', 'readwrite', 'delete', id);
                    Logger.audit(`Event scrubbed and cascaded: ${id}`);
                    
                    if (Store.get('current_event_id') === id) {
                        Store.set('current_event_id', null);
                        Store.set('active_cart', []);
                    }
                    
                    await loadEvents();
                    render();
                }
            });
        });

        // Data Exchange Binding
        document.getElementById('btn-export').addEventListener('click', () => DataExchange.exportToJSON());
        
        const fileInput = document.getElementById('file-import');
        document.getElementById('btn-import-trigger').addEventListener('click', () => fileInput.click());
        
        fileInput.addEventListener('change', async (e) => {
            if (e.target.files.length > 0) {
                try {
                    await DataExchange.importFromJSON(e.target.files[0]);
                    alert('Data imported successfully! Reloading...');
                    window.location.reload();
                } catch (err) { alert('Import failed. Check console.'); }
            }
        });

        // Onboarding Binding
        document.getElementById('btn-replay-tour').addEventListener('click', () => {
            Onboarding.promptTour();
        });

        // Language Selector Binding
        const langSelector = document.getElementById('lang-selector');
        if (langSelector) {
            langSelector.addEventListener('change', (e) => {
                const newLang = e.target.value;
                i18n.setLocale(newLang);
                window.location.reload();
            });
        }
    };

    await loadEvents();
    render();
};