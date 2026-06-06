import { i18n } from '../core/i18n.js';
import { Store } from '../core/store.js';

export const initSidebar = (containerId) => {
    const container = document.getElementById(containerId);
    if (!container) return;

    // Apply initial collapsed state immediately to prevent layout shift
    // if (Store.get('sidebar_collapsed')) {
    //     container.classList.add('collapsed');
    // }

    const render = () => {
        container.innerHTML = `
            <div class="sidebar-brand" style="padding: 1.5rem; display: flex; align-items: center; color: var(--accent-blue);">
                <span class="nav-icon"><i class="fa-solid fa-store"></i></span>
                <span class="nav-text" style="font-family: var(--font-display); font-weight: 700; white-space: nowrap;">${i18n.t('app_title')}</span>
            </div>
            <div class="nav-item active" data-view="selling">
                <span class="nav-icon"><i class="fa-solid fa-cash-register"></i></span>
                <span class="nav-text">${i18n.t('nav_selling')}</span>
            </div>
            <div class="nav-item" data-view="dashboard">
                <span class="nav-icon"><i class="fa-solid fa-chart-pie"></i></span>
                <span class="nav-text">${i18n.t('nav_dashboard')}</span>
            </div>
            <div class="nav-item" data-view="settings">
                <span class="nav-icon"><i class="fa-solid fa-sliders"></i></span>
                <span class="nav-text">${i18n.t('nav_settings')}</span>
            </div>
            <div class="nav-item" id="sidebar-toggle">
                <span class="nav-icon"><i class="fa-solid fa-bars"></i></span>
                <span class="nav-text">${i18n.t('nav_collapse')}</span>
            </div>
        `;
    };

    const bindEvents = () => {
        const toggleBtn = container.querySelector('#sidebar-toggle');
        toggleBtn.addEventListener('click', () => {
            // Toggle the global state instead of a local variable
            const currentState = Store.get('sidebar_collapsed');
            Store.set('sidebar_collapsed', !currentState);
        });

        const navItems = container.querySelectorAll('.nav-item[data-view]');
        navItems.forEach(item => {
            item.addEventListener('click', (e) => {
                const targetView = e.currentTarget.getAttribute('data-view');
                navItems.forEach(nav => nav.classList.remove('active'));
                e.currentTarget.classList.add('active');
                Store.set('active_view', targetView);
            });
        });
    };

    // Listen for external commands (like from the Onboarding script)
    Store.subscribe('sidebar_collapsed', (isCollapsed) => {
        container.classList.toggle('collapsed', isCollapsed);
    });

    render();
    bindEvents();
};