import { DB } from '../core/db.js';
import { Logger } from '../core/logger.js';
import { i18n } from '../core/i18n.js';

export const initDashboard = async (containerId) => {
    const container = document.getElementById(containerId);
    if (!container) return;

    const renderDashboard = async () => {
        try {
            const orders = await DB.execute('orders', 'readonly', 'getAll');
            const events = await DB.execute('events', 'readonly', 'getAll');
            
            // Map event IDs to names for quick UI lookup
            const eventMap = {};
            events.forEach(e => { eventMap[e.id] = e.name; });

            // Sort newest to oldest
            const sortedOrders = orders.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
            
            // Calculate Today's Metrics
            const today = new Date().toDateString();
            const todayOrders = sortedOrders.filter(o => new Date(o.timestamp).toDateString() === today);
            const todayRevenue = todayOrders.reduce((sum, o) => sum + o.total_amount, 0);

            container.innerHTML = `
                <div style="padding: 1.5rem; max-width: 1200px; margin: 0 auto;">
                    <h2 style="font-family: var(--font-display); margin-top: 0;">${i18n.t('dashboard_title')}</h2>
                    
                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 1rem; margin-bottom: 2rem;">
                        <div id="dashboard-todays-total-id" style="background: var(--bg-surface); padding: 1.5rem; border: 1px solid var(--border-structural); border-radius: 4px;">
                            <div style="color: var(--text-muted); font-size: 0.9rem;">${i18n.t('dashboard_rev_title')}</div>
                            <div style="font-family: var(--font-mono); font-size: 1.8rem; color: var(--accent-green); margin-top: 0.5rem;">$${todayRevenue}</div>
                        </div>
                        <div id="dashboard-todays-order-id" style="background: var(--bg-surface); padding: 1.5rem; border: 1px solid var(--border-structural); border-radius: 4px;">
                            <div style="color: var(--text-muted); font-size: 0.9rem;">${i18n.t('dashboard_trans_count_title')}</div>
                            <div style="font-family: var(--font-mono); font-size: 1.8rem; color: var(--accent-blue); margin-top: 0.5rem;">${todayOrders.length}</div>
                        </div>
                    </div>

                    <h3 style="font-family: var(--font-display); border-bottom: 1px solid var(--border-structural); padding-bottom: 0.5rem;">${i18n.t('dashboard_trans_his_title')}</h3>
                    <div id="dashboard-order-his-id" style="background: var(--bg-surface); border: 1px solid var(--border-structural); border-radius: 4px; overflow: hidden;">
                    ${sortedOrders.length === 0 ? `<div style="padding: 1rem; color: var(--text-muted);">${i18n.t('dashboard_trans_his_none_placeholder')}</div>` : ''}
                        ${sortedOrders.map(order => {
                            const eventName = eventMap[order.event_id] || 'Deleted Event';
                            const timeString = new Date(order.timestamp).toLocaleString();
                            const itemsString = order.serialized_items_array.map(i => `${i.name} (x${i.quantity})`).join(', ');

                            return `
                                <div style="padding: 1rem; border-bottom: 1px solid var(--border-structural); display: flex; flex-direction: column; gap: 0.5rem;">
                                    <div style="display: flex; justify-content: space-between; align-items: center;">
                                        <div style="font-weight: 600; color: var(--accent-purple); font-size: 0.85rem;">[${eventName}]</div>
                                        <div style="font-family: var(--font-mono); color: var(--text-muted); font-size: 0.85rem;">${timeString}</div>
                                    </div>
                                    <div style="display: flex; justify-content: space-between; align-items: flex-end;">
                                        <div style="color: var(--text-secondary); font-size: 0.9rem; flex: 1; padding-right: 1rem;">
                                            ${itemsString}
                                        </div>
                                        <div style="display: flex; align-items: center; gap: 1rem;">
                                            <div style="font-family: var(--font-mono); font-size: 1.1rem; color: var(--accent-green); font-weight: bold;">
                                                $${order.total_amount}
                                            </div>
                                            <button class="btn-delete-log" data-id="${order.id}" style="background: transparent; border: 1px solid var(--accent-red); color: var(--accent-red); padding: 0.25rem 0.75rem; border-radius: 4px; cursor: pointer; font-size: 0.8rem;">
                                                <i class="fa-solid fa-trash"></i>
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            `;
                        }).join('')}
                    </div>
                </div>
            `;

            bindEvents();
        } catch (error) {
            Logger.error('Dashboard rendering failed', error);
            container.innerHTML = `<div style="color: var(--accent-red); padding: 2rem;">Failed to load sales data.</div>`;
        }
    };

    const bindEvents = () => {
        const containerEl = document.getElementById(containerId);
        containerEl.querySelectorAll('.btn-delete-log').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const orderId = e.currentTarget.getAttribute('data-id');
                if (confirm('Delete this transaction log? (Note: This will not restore inventory stock)')) {
                    await DB.execute('orders', 'readwrite', 'delete', orderId);
                    // Re-render the dashboard immediately
                    renderDashboard();
                }
            });
        });
    };

    renderDashboard();
};