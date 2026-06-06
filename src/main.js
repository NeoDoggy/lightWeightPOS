import { initSidebar } from './components/Sidebar.js';
import { Store } from './core/store.js';
import { Logger } from './core/logger.js';
import { i18n } from './core/i18n.js';
import { DB } from './core/db.js';
import { initProductGrid } from './components/ProductGrid.js';
import { initCart } from './components/Cart.js';
import { initDashboard } from './components/Dashboard.js';
import { initSettings } from './components/Settings.js';
import { Onboarding } from './components/Onboarding.js';

const renderViewport = (view) => {
    const viewLayer = document.getElementById('view-layer');
    viewLayer.style.opacity = '0';

    viewLayer.style.overflowY = view === 'selling' ? 'hidden' : 'auto';
    
    setTimeout(() => {
        if (view === 'selling') {
            viewLayer.innerHTML = `
                <div class="selling-workspace" style="animation: fade-in var(--transition-speed-normal) var(--easing-standard) forwards;">
                    <div class="grid-section" id="grid-mount-point"></div>
                    <div class="cart-section" id="cart-mount-point"></div>
                </div>
            `;
            initProductGrid('grid-mount-point');
            initCart('cart-mount-point');
        } else if (view === 'dashboard') {
            // Removed inline scroll styles
            viewLayer.innerHTML = `<div id="dashboard-mount" style="padding-bottom: 120px; animation: fade-in var(--transition-speed-normal) var(--easing-standard) forwards;"></div>`;
            initDashboard('dashboard-mount');
        } else if (view === 'settings') {
            // Removed inline scroll styles
            viewLayer.innerHTML = `<div id="settings-mount" style="padding-bottom: 120px; animation: fade-in var(--transition-speed-normal) var(--easing-standard) forwards;"></div>`;
            initSettings('settings-mount');
        }
        viewLayer.style.opacity = '1';
    }, 150);
};

const init = async() => {
    Logger.audit('Application Boot Sequence Initiated');

    try {
        await DB.init();
    } catch (e) {
        document.body.innerHTML = `<h1 style="color:red; padding: 2rem;">Critical Error: Storage Init Failed</h1>`;
        return;
    }

    initSidebar('sidebar-container');
    
    // Inject required animation for viewport
    const style = document.createElement('style');
    style.textContent = `@keyframes fade-in { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }`;
    document.head.appendChild(style);

    // Subscribe to view changes
    Store.subscribe('active_view', (newView, oldView) => {
        Logger.info(`View transitioned from ${oldView} to ${newView}`);
        renderViewport(newView);
    });

    // Initial render
    renderViewport(Store.get('active_view'));

    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('../service-worker.js')
                .catch(err => Logger.error('Service Worker Registration Failed', err));
        });
    }

    if (!localStorage.getItem('has_completed_tour')) {
        Onboarding.promptTour();
    }
};

document.addEventListener('DOMContentLoaded', init);