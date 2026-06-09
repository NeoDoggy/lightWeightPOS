import { Store } from '../core/store.js';
import { DB } from '../core/db.js';
import { i18n } from '../core/i18n.js';
import { Dialog } from '../core/dialog.js';
import { Toast } from '../core/toast.js';

export const initProductGrid = async (containerId) => {
    let sortableInstance = null;
    const container = document.getElementById(containerId);
    if (!container) return;

    let isEditMode = false;
    let editingId = null;
    let currentEventId = Store.get('current_event_id');
    let events = [];
    let products = [];
    let sets = [];

    const seedData = async () => {
        events = await DB.execute('events', 'readonly', 'getAll');
        if (events.length === 0) {
            const defaultEvent = { id: `evt_${Date.now()}`, name: i18n.t('event_default_name'), timestamp: new Date().toISOString() };
            await DB.execute('events', 'readwrite', 'add', defaultEvent);
            events.push(defaultEvent);
        }
        if (!currentEventId) {
            currentEventId = events[0].id;
            Store.set('current_event_id', currentEventId);
        }
    };

    const loadData = async () => {
        const allProducts = await DB.execute('products', 'readonly', 'getAll');
        const allSets = await DB.execute('product_sets', 'readonly', 'getAll');
        products = allProducts
            .filter(p => p.event_id === currentEventId)
            .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
            
        sets = allSets
            .filter(s => s.event_id === currentEventId)
            .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
    };

    const initSortable = () => {
        const grid = document.getElementById('grid-items');
        if (!grid) return;

        if (sortableInstance) {
            sortableInstance.destroy();
        }

        sortableInstance = new Sortable(grid, {
            disabled: !isEditMode, 
            animation: 150,        
            filter: '.add-card, .set-card', 
            preventOnFilter: false,
            ghostClass: 'sortable-ghost',  
            
            onEnd: async (evt) => {
                const itemCards = grid.querySelectorAll('.product-card:not(.add-card):not(.set-card)');
                for (let index = 0; index < itemCards.length; index++) {
                    const card = itemCards[index];
                    const id = card.getAttribute('data-id');
                    const type = card.getAttribute('data-type');
                    const storeName = type === 'set' ? 'product_sets' : 'products';
                    const item = await DB.execute(storeName, 'readonly', 'get', id);
                    if (item) {
                        item.sort_order = index;
                        await DB.execute(storeName, 'readwrite', 'put', item);
                    }
                }  
                await loadData();
            }
        });
    };

    const render = () => {
        container.innerHTML = `
            <div class="workspace-header">
                <select class="event-selector" id="event-select">
                    ${events.map(e => `<option value="${e.id}" ${e.id === currentEventId ? 'selected' : ''}>${e.name}</option>`).join('')}
                </select>
                <div id="grid-edit-id" class="toggle-container">
                    <span>${i18n.t('edit_toggle_label')}</span>
                    <div class="ios-toggle ${isEditMode ? 'active' : ''}" id="edit-toggle"></div>
                </div>
            </div>
            
            <div class="products-container" id="grid-items">
                ${products.map(p => {
                    const isSoldOut = p.stock_quantity <= 0;
                    return `
                        <div class="product-card" data-type="product" data-id="${p.id}" data-name="${p.name}" data-price="${p.price}" style="${isSoldOut ? 'opacity: 0.5;' : ''}">
                            <div class="delete-badge"><i class="fa-solid fa-xmark"></i></div>
                            <div class="product-name">${p.name}</div>
                            <div style="font-size:0.75rem; color:${isSoldOut ? 'var(--accent-red)' : 'var(--text-muted)'}; margin-top:0.2rem;">
                                ${isSoldOut ? `${i18n.t('product_card_soldout')}` : `${i18n.t('product_card_stock')}: ${p.stock_quantity}`}
                            </div>
                            <div class="product-price">$${p.price}</div>
                        </div>
                    `;
                }).join('')}
                
                ${sets.map(s => `
                    <div class="product-card" data-type="set" data-id="${s.id}">
                        <div class="delete-badge"><i class="fa-solid fa-xmark"></i></div>
                        <div>
                            <div class="set-indicator">${i18n.t('set_car_label')}</div>
                            <div class="product-name">${s.name}</div>
                        </div>
                        <div class="product-price">$${s.bundle_price}</div>
                    </div>
                `).join('')}

                ${isEditMode ? `
                    <div class="product-card add-card" id="btn-add-product" title="Add Product"><i class="fa-solid fa-plus"></i></div>
                    <div class="product-card set-card" id="btn-add-set" title="Add Set"><i class="fa-solid fa-layer-group"></i></div>
                ` : ''}
            </div>

            <div class="modal-overlay" id="modal-item">
                <div class="modal-card">
                    <div class="modal-header">
                        <span>${i18n.t('add_item_title')}</span>
                        <button class="btn-close" onclick="document.getElementById('modal-item').classList.remove('active')"><i class="fa-solid fa-xmark"></i></button>
                    </div>
                    <div class="form-group">
                        <label class="form-label">${i18n.t('add_item_name_title')}</label>
                        <input type="text" id="input-item-name" class="form-input" placeholder="${i18n.t('add_item_name_placeholder')}">
                    </div>
                    <div style="display: flex; gap: 1rem;">
                        <div class="form-group" style="flex: 1;">
                            <label class="form-label">${i18n.t('add_item_price_title')}</label>
                            <input type="number" id="input-item-price" class="form-input" placeholder="0">
                        </div>
                        <div class="form-group" style="flex: 1;">
                            <label class="form-label">${i18n.t('add_item_stock_title')}</label>
                            <input type="number" id="input-item-quant" class="form-input" value="100">
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button class="btn-cancel" onclick="document.getElementById('modal-item').classList.remove('active')">${i18n.t('add_item_cancle_button')}</button>
                        <button class="btn-save" id="save-item-btn">${i18n.t('add_item_button')}</button>
                    </div>
                </div>
            </div>

            <div class="modal-overlay" id="modal-set">
                <div class="modal-card">
                    <div class="modal-header">
                        <span>${i18n.t('add_set_title')}</span>
                        <button class="btn-close" onclick="document.getElementById('modal-set').classList.remove('active')"><i class="fa-solid fa-xmark"></i></button>
                    </div>
                    <div class="form-group">
                        <label class="form-label">${i18n.t('add_set_name_title')}</label>
                        <input type="text" id="input-set-name" class="form-input" placeholder="${i18n.t('add_set_name_placeholder')}">
                    </div>
                    <div class="form-group">
                        <label class="form-label">${i18n.t('add_set_price_title')}</label>
                        <input type="number" id="input-set-price" class="form-input" placeholder="0">
                    </div>
                    
                    <div class="form-group">
                        <label class="form-label" style="display: flex; justify-content: space-between;">
                            <span>${i18n.t('add_set_included_items_title')}</span>
                            <span id="btn-add-set-row" style="color: var(--accent-blue); cursor: pointer;"><i class="fa-solid fa-plus"></i> ${i18n.t('add_set_items_title')}</span>
                        </label>
                        <div id="set-items-container">
                            </div>
                    </div>

                    <div class="modal-footer">
                        <button class="btn-cancel" onclick="document.getElementById('modal-set').classList.remove('active')">${i18n.t('add_set_cancle_button')}</button>
                        <button class="btn-save" id="save-set-btn">${i18n.t('add_set_button')}</button>
                    </div>
                </div>
            </div>
        `;
        
        container.classList.toggle('edit-mode', isEditMode);
        bindEvents();
        initSortable();
    };

    const getSetRowHTML = (selectedId = '', quant = 1) => {
        return `
            <div class="set-item-row">
                <select class="form-select set-item-select" style="flex: 2;">
                    <option value="" disabled ${!selectedId ? 'selected' : ''}>${i18n.t('add_set_select_item_placeholder')}</option>
                    ${products.map(p => `<option value="${p.id}" ${p.id === selectedId ? 'selected' : ''}>${p.name} ($${p.price})</option>`).join('')}
                </select>
                <input type="number" class="form-input set-item-quant" style="flex: 1;" placeholder="Qty" min="1" value="${quant}">
                <button class="btn-remove-row"><i class="fa-solid fa-trash"></i></button>
            </div>
        `;
    };

    const bindEvents = () => {
        document.getElementById('event-select').addEventListener('change', async (e) => {
            currentEventId = e.target.value;
            Store.set('current_event_id', currentEventId);
            Store.set('active_cart', []);
            await loadData();
            render();
        });

        document.getElementById('edit-toggle').addEventListener('click', () => {
            isEditMode = !isEditMode;
            render();
        });

        
        container.querySelectorAll('.product-card').forEach(card => {
            if (card.classList.contains('add-card')) return;

            card.addEventListener('click', async (e) => {
                const id = card.getAttribute('data-id');
                const type = card.getAttribute('data-type');
                
                if (isEditMode) {
                    if (e.target.closest('.delete-badge')) {
                        const isConfirmed = await Dialog.warn(i18n.t('dialog_del_item_msg'), i18n.t('dialog_del_item_title'), false, true);
                        if (isConfirmed) {
                            const storeName = type === 'set' ? 'product_sets' : 'products';
                            await DB.execute(storeName, 'readwrite', 'delete', id);
                            await loadData();
                            render();
                        }
                        return;
                    }

                    editingId = id;
                    
                    if (type === 'product') {
                        const item = products.find(p => p.id === id);
                        Store.set('sidebar_collapsed', true);
                        document.getElementById('input-item-name').value = item.name;
                        document.getElementById('input-item-price').value = item.price;
                        document.getElementById('input-item-quant').value = item.stock_quantity;
                        document.querySelector('#modal-item .modal-header span').innerText = i18n.t('add_item_edit_title');
                        document.getElementById('modal-item').classList.add('active');
                    } else if (type === 'set') {
                        const set = sets.find(s => s.id === id);
                        Store.set('sidebar_collapsed', true);
                        document.getElementById('input-set-name').value = set.name;
                        document.getElementById('input-set-price').value = set.bundle_price;
                        
                        const setContainer = document.getElementById('set-items-container');
                        setContainer.innerHTML = '';
                        set.included_items.forEach(req => {
                            setContainer.insertAdjacentHTML('beforeend', getSetRowHTML(req.id, req.quant));
                        });
                        
                        document.querySelector('#modal-set .modal-header span').innerText = i18n.t('add_set_edit_title');
                        document.getElementById('modal-set').classList.add('active');
                    }
                } else {
                    if (type === 'set'){
                        await Dialog.alert(i18n.t('dialog_alert_set_desc'), i18n.t('dialog_note'));
                        return;
                    }
                    
                    const product = products.find(p => p.id === id);
                    if (product.stock_quantity <= 0) {
                        await Dialog.alert(i18n.t('dialog_alert_soldout_desc'), i18n.t('dialog_alert_soldout_title'));
                        return;
                    }

                    const name = card.getAttribute('data-name');
                    const price = parseInt(card.getAttribute('data-price'), 10);
                    
                    const currentCart = Store.get('active_cart') || [];
                    const existingIndex = currentCart.findIndex(item => item.id === id);

                    if (existingIndex > -1) {
                        if (currentCart[existingIndex].quantity >= product.stock_quantity) {
                            await Dialog.alert(i18n.t('dialog_alert_not_enought_desc'), i18n.t('dialog_alert_soldout_title'));
                            return;
                        }
                        currentCart[existingIndex].quantity += 1;
                    } else {
                        currentCart.push({ id, name, price, quantity: 1 });
                    }
                    Store.set('active_cart', [...currentCart]);
                }
            });
        });

        
        if (document.getElementById('btn-add-product')) {
            document.getElementById('btn-add-product').addEventListener('click', () => {
                editingId = null;
                Store.set('sidebar_collapsed', true);
                document.getElementById('input-item-name').value = '';
                document.getElementById('input-item-price').value = '';
                document.getElementById('input-item-quant').value = '100';
                document.querySelector('#modal-item .modal-header span').innerText = i18n.t('add_item_title');
                document.getElementById('modal-item').classList.add('active');
            });
        }

        if (document.getElementById('btn-add-set')) {
            document.getElementById('btn-add-set').addEventListener('click', async () => {
                if(products.length === 0){
                    await Dialog.alert(i18n.t('dialog_no_item_no_set'), i18n.t('dialog_note'));
                    return;
                }
                editingId = null;
                Store.set('sidebar_collapsed', true);
                document.getElementById('input-set-name').value = '';
                document.getElementById('input-set-price').value = '';
                document.getElementById('set-items-container').innerHTML = getSetRowHTML();
                document.querySelector('#modal-set .modal-header span').innerText = i18n.t('add_set_title');
                document.getElementById('modal-set').classList.add('active');
            });
        }

        
        const setContainer = document.getElementById('set-items-container');
        if (setContainer) {
            document.getElementById('btn-add-set-row').addEventListener('click', () => {
                setContainer.insertAdjacentHTML('beforeend', getSetRowHTML());
            });
            setContainer.addEventListener('click', (e) => {
                if (e.target.closest('.btn-remove-row')) {
                    e.target.closest('.set-item-row').remove();
                }
            });
        }

        
        const saveItemBtn = document.getElementById('save-item-btn');
        if (saveItemBtn) {
            saveItemBtn.addEventListener('click', async () => {
                const name = document.getElementById('input-item-name').value;
                const price = parseInt(document.getElementById('input-item-price').value, 10);
                const quant = parseInt(document.getElementById('input-item-quant').value, 10);
                
                if (!name || isNaN(price) || isNaN(quant)){
                    await Dialog.alert(i18n.t('dialog_fill_correct'), i18n.t('dialog_alert'));
                    return;
                }

                const payload = {
                    id: editingId || `p_${Date.now()}`, 
                    event_id: currentEventId, 
                    name, 
                    price, 
                    stock_quantity: quant
                };

                await DB.execute('products', 'readwrite', editingId ? 'put' : 'add', payload);
                
                editingId = null;

                document.getElementById('modal-item').classList.remove('active');
                await loadData();
                render();
                Toast.show(editingId ? i18n.t('update_item_title') : i18n.t('create_item_title'), 'success');
            });
        }

        const saveSetBtn = document.getElementById('save-set-btn');
        if (saveSetBtn) {
            saveSetBtn.addEventListener('click', async () => {
                const name = document.getElementById('input-set-name').value;
                const price = parseInt(document.getElementById('input-set-price').value, 10);
                if (!name || isNaN(price)){
                    await Dialog.alert(i18n.t('dialog_set_correct'), i18n.t('dialog_alert'));
                    return;
                }

                let included_items = [];
                let valid = true;
                document.querySelectorAll('.set-item-row').forEach(row => {
                    const select = row.querySelector('.set-item-select');
                    const qty = row.querySelector('.set-item-quant');
                    if(select.value && qty.value > 0) {
                        included_items.push({ id: select.value, quant: parseInt(qty.value, 10) });
                    } else { valid = false; }
                });

                if(!valid || included_items.length === 0){
                    await Dialog.alert(i18n.t('dialog_item_invalid'), i18n.t('dialog_alert'));
                    return;
                }

                const payload = {
                    id: editingId || `s_${Date.now()}`, 
                    event_id: currentEventId, 
                    name, 
                    bundle_price: price, 
                    included_items
                };

                await DB.execute('product_sets', 'readwrite', editingId ? 'put' : 'add', payload);
                
                document.getElementById('modal-set').classList.remove('active');
                await loadData();
                render();
            });
        }

        Store.subscribe('force_grid_refresh', async () => {
            await loadData();
            render();
        });
    };

    await seedData();
    await loadData();
    render();
};