import { DB } from '../core/db.js';
import { Logger } from '../core/logger.js';
import { i18n } from '../core/i18n.js';
import { Toast } from '../core/toast.js';
import { Dialog } from '../core/dialog.js';

let bestSellersChartInstance = null;
let earningsChartInstance = null;
let orderTimeChartInstance = null;

export const initDashboard = async (containerId) => {
    const container = document.getElementById(containerId);
    if (!container) return;

    let selectedEventId = 'all';

    const renderDashboard = async () => {
        try {
            if (bestSellersChartInstance) bestSellersChartInstance.destroy();
            if (earningsChartInstance) earningsChartInstance.destroy();
            if (orderTimeChartInstance) orderTimeChartInstance.destroy();

            const allOrders = await DB.execute('orders', 'readonly', 'getAll');
            const events = await DB.execute('events', 'readonly', 'getAll');
            const products = await DB.execute('products', 'readonly', 'getAll');
            
            const eventMap = {};
            events.forEach(e => { eventMap[e.id] = e.name; });

            const productMap = {};
            products.forEach(p => { productMap[p.id] = p.name; });

            let filteredOrders = allOrders;
            if (selectedEventId !== 'all') {
                filteredOrders = allOrders.filter(o => o.event_id === selectedEventId);
            }

            const sortedOrders = filteredOrders.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
            
            const today = new Date().toDateString();
            const todayOrders = sortedOrders.filter(o => new Date(o.timestamp).toDateString() === today);
            const todayRevenue = todayOrders.reduce((sum, o) => sum + o.total_amount, 0);

            const itemStats = {};
            const timeStatsMap = {};
            
            filteredOrders.forEach(order => {
                const orderDate = new Date(order.timestamp);
                const timeString = orderDate.getHours().toString().padStart(2, '0') + ':' + orderDate.getMinutes().toString().padStart(2, '0');
                
                timeStatsMap[timeString] = (timeStatsMap[timeString] || 0) + 1;

                order.serialized_items_array.forEach(item => {
                    if (!itemStats[item.id]) {
                        itemStats[item.id] = {
                            id: item.id,
                            recordedName: item.name,
                            quantity: 0,
                            earnings: 0
                        };
                    }
                    itemStats[item.id].quantity += item.quantity;
                    
                    const itemTotal = (Number(item.price) * item.quantity) || Number(item.total) || 0;
                    itemStats[item.id].earnings += itemTotal;
                });
            });

            const aggregatedData = Object.values(itemStats).map(stat => ({
                displayName: productMap[stat.id] || stat.recordedName,
                quantity: stat.quantity,
                earnings: stat.earnings
            }));

            const sortedByQuantity = [...aggregatedData].sort((a, b) => b.quantity - a.quantity);
            const sortedByEarnings = [...aggregatedData].sort((a, b) => b.earnings - a.earnings);

            const sortedByTime = Object.keys(timeStatsMap)
                .sort((a, b) => a.localeCompare(b))
                .map(time => ({
                    time: time,
                    count: timeStatsMap[time]
                }));

            const emptyPlaceholder = `<div style="color: var(--text-muted); font-size: 0.9rem; font-family: var(--font-body);">${i18n.t('dashboard_trans_his_none_placeholder') || 'No data available'}</div>`;

            container.innerHTML = `
                <div style="padding: 1.5rem; max-width: 1400px; margin: 0 auto;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem;">
                        <h2 style="font-family: var(--font-display); margin: 0;">${i18n.t('dashboard_title')}</h2>
                        
                        <select class="event-selector" id="dashboard-event-select">
                            <option value="all" ${selectedEventId === 'all' ? 'selected' : ''}>${i18n.t('dashboard_event_choose_placeholder')}</option>
                            ${events.map(e => `<option value="${e.id}" ${e.id === selectedEventId ? 'selected' : ''}>${e.name}</option>`).join('')}
                        </select>
                    </div>
                    
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

                    <div id="dashboard-charts-id" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 1rem; margin-bottom: 2rem;">
                        <div style="background: var(--bg-surface); padding: 1.5rem; border: 1px solid var(--border-structural); border-radius: 4px; display: flex; flex-direction: column;">
                            <h4 style="margin-top: 0; margin-bottom: 1rem; color: var(--text-secondary); text-align: center; font-family: var(--font-display); font-weight: 500;">${i18n.t('dashboard_best_selling_title')}</h4>
                            <div style="position: relative; width: 100%; flex: 1; display: flex; align-items: center; justify-content: center; min-height: 200px;">
                                ${sortedByQuantity.length > 0 ? `<canvas id="bestSellersChart"></canvas>` : emptyPlaceholder}
                            </div>
                        </div>
                        <div style="background: var(--bg-surface); padding: 1.5rem; border: 1px solid var(--border-structural); border-radius: 4px; display: flex; flex-direction: column;">
                            <h4 style="margin-top: 0; margin-bottom: 1rem; color: var(--text-secondary); text-align: center; font-family: var(--font-display); font-weight: 500;">${i18n.t('dashboard_total_earn_title')}</h4>
                            <div style="position: relative; width: 100%; flex: 1; display: flex; align-items: center; justify-content: center; min-height: 200px;">
                                ${sortedByEarnings.length > 0 ? `<canvas id="earningsChart"></canvas>` : emptyPlaceholder}
                            </div>
                        </div>
                        <div style="background: var(--bg-surface); padding: 1.5rem; border: 1px solid var(--border-structural); border-radius: 4px; display: flex; flex-direction: column;">
                            <h4 style="margin-top: 0; margin-bottom: 1rem; color: var(--text-secondary); text-align: center; font-family: var(--font-display); font-weight: 500;">${i18n.t('dashboard_orders_line_title')}</h4>
                            <div style="position: relative; width: 100%; flex: 1; display: flex; align-items: center; justify-content: center; min-height: 200px;">
                                ${sortedByTime.length > 0 ? `<canvas id="orderTimeChart"></canvas>` : emptyPlaceholder}
                            </div>
                        </div>
                    </div>

                    <h3 style="font-family: var(--font-display); border-bottom: 1px solid var(--border-structural); padding-bottom: 0.5rem;">${i18n.t('dashboard_trans_his_title')}</h3>
                    <div id="dashboard-order-his-id" style="background: var(--bg-surface); border: 1px solid var(--border-structural); border-radius: 4px; overflow: hidden;">
                    ${sortedOrders.length === 0 ? `<div style="padding: 1rem; color: var(--text-muted);">${i18n.t('dashboard_trans_his_none_placeholder')}</div>` : ''}
                        ${sortedOrders.map(order => {
                            const eventName = eventMap[order.event_id] || 'Deleted Event';
                            const timeString = new Date(order.timestamp).toLocaleString();
                            const itemsString = order.serialized_items_array.map(i => `${productMap[i.id] || i.name} (x${i.quantity})`).join(', ');

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
            renderCharts(sortedByQuantity, sortedByEarnings, sortedByTime);

        } catch (error) {
            Logger.error('Dashboard rendering failed', error);
            container.innerHTML = `<div style="color: var(--accent-red); padding: 2rem;">Failed to load sales data.</div>`;
        }
    };

    const renderCharts = (quantityData, earningsData, timeData) => {
        if (typeof Chart === 'undefined') return;

        Chart.defaults.color = '#ADADAD';
        Chart.defaults.font.family = "'Inter', 'Chiron GoRound TC', 'Noto Sans JP', sans-serif";

        const ctxBar = document.getElementById('bestSellersChart');
        if (ctxBar && quantityData.length > 0) {
            bestSellersChartInstance = new Chart(ctxBar, {
                type: 'bar',
                data: {
                    labels: quantityData.map(d => d.displayName),
                    datasets: [{
                        label: 'Items Sold',
                        data: quantityData.map(d => d.quantity),
                        backgroundColor: '#1D9BF0',
                        borderRadius: 4
                    }]
                },
                options: {
                    responsive: true,
                    aspectRatio: 2,
                    scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } },
                    plugins: {
                        legend: { display: false }
                    }
                }
            });
        }

        const ctxPie = document.getElementById('earningsChart');
        if (ctxPie && earningsData.length > 0) {
            earningsChartInstance = new Chart(ctxPie, {
                type: 'doughnut',
                data: {
                    labels: earningsData.map(d => d.displayName),
                    datasets: [{
                        data: earningsData.map(d => d.earnings),
                        backgroundColor: ['#00BA7C', '#1D9BF0', '#7856FF', '#FF7A00', '#FF4060', '#FD9E16'], 
                        borderWidth: 0
                    }]
                },
                options: {
                    responsive: true,
                    aspectRatio: 2,
                    plugins: {
                        legend: { position: 'right' }
                    }
                }
            });
        }

        const ctxLine = document.getElementById('orderTimeChart');
        if (ctxLine && timeData.length > 0) {
            orderTimeChartInstance = new Chart(ctxLine, {
                type: 'line',
                data: {
                    labels: timeData.map(d => d.time),
                    datasets: [{
                        label: 'Order Count',
                        data: timeData.map(d => d.count),
                        borderColor: '#FF7A00',
                        backgroundColor: 'rgba(255, 122, 0, 0.1)',
                        borderWidth: 2,
                        fill: true,
                        tension: 0.3,
                        pointBackgroundColor: '#FF7A00'
                    }]
                },
                options: {
                    responsive: true,
                    aspectRatio: 2,
                    scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } },
                    plugins: {
                        legend: { display: false }
                    }
                }
            });
        }
    };

    const bindEvents = () => {
        const containerEl = document.getElementById(containerId);
        
        const eventSelect = containerEl.querySelector('#dashboard-event-select');
        if (eventSelect) {
            eventSelect.addEventListener('change', (e) => {
                selectedEventId = e.target.value;
                renderDashboard();
            });
        }

        containerEl.querySelectorAll('.btn-delete-log').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const orderId = e.currentTarget.getAttribute('data-id');
                const isConfirmed = await Dialog.warn(i18n.t('dashboard_del_his_msg'), i18n.t('dashboard_del_his_title'), false, true);
                if (isConfirmed) {
                    await DB.execute('orders', 'readwrite', 'delete', orderId);
                    Toast.show(i18n.t('dashboard_del_his_toast'), 'success');
                    renderDashboard();
                }
            });
        });
    };

    renderDashboard();
};