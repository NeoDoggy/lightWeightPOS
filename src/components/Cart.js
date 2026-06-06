import { Store } from '../core/store.js';
import { DB } from '../core/db.js';
import { Logger } from '../core/logger.js';
import { Dialog } from '../core/dialog.js';
import { Toast } from '../core/toast.js';

export const initCart = async (containerId) => {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    let availableSets = [];

    // Inject the Floating Action Button for mobile
    let fab = document.getElementById('mobile-cart-fab');
    if (!fab) {
        container.insertAdjacentHTML('afterend', '<div class="mobile-cart-fab" id="mobile-cart-fab"></div>');
        fab = document.getElementById('mobile-cart-fab');
        fab.addEventListener('click', () => {
            container.classList.add('mobile-open');
        });
    }

    const loadSets = async () => {
        const eventId = Store.get('current_event_id');
        if (!eventId) return;
        const allSets = await DB.execute('product_sets', 'readonly', 'getAll');
        availableSets = allSets.filter(s => s.event_id === eventId);
    };

    const render = async (cartItems) => {
        await loadSets();

        // Update the FAB Badge Notification dynamically
        const totalQty = cartItems.reduce((sum, item) => sum + item.quantity, 0);
        fab.innerHTML = `
            <i class="fa-solid fa-shopping-cart"></i>
            ${totalQty > 0 ? `<span class="badge">${totalQty}</span>` : ''}
        `;

        // Set Detection Algorithm
        let itemPool = {};
        cartItems.forEach(item => { itemPool[item.id] = item.quantity; });
        let appliedSets = [];
        let setTotal = 0;

        availableSets.forEach(set => {
            let canFormSet = true;
            while(canFormSet) {
                let matched = true;
                for(let req of set.included_items) {
                    if(!itemPool[req.id] || itemPool[req.id] < req.quant) { matched = false; break; }
                }
                if(matched) {
                    for(let req of set.included_items) { itemPool[req.id] -= req.quant; }
                    appliedSets.push(set);
                    setTotal += set.bundle_price;
                } else {
                    canFormSet = false;
                }
            }
        });

        let remainderTotal = 0;
        Object.keys(itemPool).forEach(id => {
            if (itemPool[id] > 0) {
                let originalItem = cartItems.find(i => i.id === id);
                if(originalItem) remainderTotal += (originalItem.price * itemPool[id]);
            }
        });

        const finalTotal = setTotal + remainderTotal;

        container.innerHTML = `
            <div class="cart-header" style="display: flex; justify-content: space-between; align-items: center;">
                <span>Active Order</span>
                <div style="display: flex; align-items: center; gap: 1rem;">
                    ${cartItems.length > 0 ? `<button id="btn-clear-cart" style="background: transparent; border: none; color: var(--accent-red); cursor: pointer; font-size: 0.85rem; display: flex; align-items: center; gap: 0.3rem;"><i class="fa-solid fa-trash-can"></i> Clear</button>` : ''}
                    <button class="btn-close-cart" id="btn-close-cart"><i class="fa-solid fa-chevron-right"></i></button>
                </div>
            </div>
            <div class="cart-items-list">
                ${cartItems.length === 0 ? '<div style="color:var(--text-muted); text-align:center; padding-top:2rem;">Cart Empty</div>' : ''}
                ${cartItems.map(item => `
                    <div class="cart-item-row">
                        <div>
                            <div>${item.name}</div>
                            <div style="color:var(--text-muted); font-family:var(--font-mono); font-size:0.8rem;">$${item.price} x ${item.quantity}</div>
                        </div>
                        <div class="cart-item-controls">
                            <button class="cart-btn dec-btn" data-id="${item.id}">-</button>
                            <span style="font-family:var(--font-mono); min-width:20px; text-align:center;">${item.quantity}</span>
                            <button class="cart-btn inc-btn" data-id="${item.id}">+</button>
                        </div>
                    </div>
                `).join('')}

                ${appliedSets.length > 0 ? `
                    <div style="margin-top: 1rem; padding: 0.75rem; background: rgba(120, 86, 255, 0.1); border: 1px solid var(--accent-purple); border-radius: 4px;">
                        <div style="color: var(--accent-purple); font-size: 0.8rem; font-weight: bold; margin-bottom: 0.5rem;">Auto-Applied Sets</div>
                        ${appliedSets.map(s => `
                            <div style="display: flex; justify-content: space-between; font-size: 0.85rem;">
                                <span>${s.name}</span>
                                <span style="font-family: var(--font-mono); color: var(--accent-green);">$${s.bundle_price}</span>
                            </div>
                        `).join('')}
                    </div>
                ` : ''}
            </div>
            <div class="cart-footer">
                <div class="total-row">
                    <span>Total</span>
                    <span style="color:var(--accent-yellow);">$${finalTotal}</span>
                </div>
                <button class="checkout-submit-btn" ${cartItems.length === 0 ? 'disabled style="opacity:0.5; cursor:not-allowed;"' : ''}>
                    Complete Transaction
                </button>
            </div>
        `;
        
        bindEvents(cartItems, finalTotal);
    };

    const bindEvents = (cartItems, calculatedTotal) => {
        // Close Mobile Drawer
        const closeBtn = container.querySelector('#btn-close-cart');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => { container.classList.remove('mobile-open'); });
        }

        const clearBtn = container.querySelector('#btn-clear-cart');
        if (clearBtn) {
            clearBtn.addEventListener('click', async () => {
                // Replaced native confirm
                const isConfirmed = await Dialog.confirm('Are you sure you want to clear all items from the current order?', 'Clear Order');
                if (isConfirmed) {
                    Store.set('active_cart', []);
                }
            });
        }

        container.querySelectorAll('.inc-btn').forEach(btn => {
            btn.addEventListener('click', async () => {
                const id = btn.getAttribute('data-id');
                const target = cartItems.find(item => item.id === id);
                if (target) { 
                    const dbItem = await DB.execute('products', 'readonly', 'get', id);
                    if (dbItem && target.quantity >= dbItem.stock_quantity) {
                        return alert('Maximum stock reached!');
                    }
                    target.quantity += 1; 
                    Store.set('active_cart', [...cartItems]); 
                }
            });
        });

        container.querySelectorAll('.dec-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const id = btn.getAttribute('data-id');
                const targetIndex = cartItems.findIndex(item => item.id === id);
                if (targetIndex > -1) {
                    cartItems[targetIndex].quantity -= 1;
                    if (cartItems[targetIndex].quantity <= 0) { cartItems.splice(targetIndex, 1); }
                    Store.set('active_cart', [...cartItems]);
                }
            });
        });

        const submitBtn = container.querySelector('.checkout-submit-btn');
        if (submitBtn && cartItems.length > 0) {
            submitBtn.addEventListener('click', async () => {
                
                let stockError = false;
                let errorMessages = [];
                let correctedCart = [...cartItems];

                for (let i = 0; i < correctedCart.length; i++) {
                    const item = correctedCart[i];
                    const dbItem = await DB.execute('products', 'readonly', 'get', item.id);
                    
                    if (!dbItem) {
                        stockError = true;
                        errorMessages.push(`- ${item.name} was removed from the system.`);
                        correctedCart[i].quantity = 0;
                    } else if (item.quantity > dbItem.stock_quantity) {
                        stockError = true;
                        errorMessages.push(`- ${item.name} (Requested: ${item.quantity}, Available: ${dbItem.stock_quantity})`);
                        correctedCart[i].quantity = dbItem.stock_quantity;
                    }
                }
                if (stockError) {
                    const finalCart = correctedCart.filter(item => item.quantity > 0);
                    Store.set('active_cart', finalCart);
                    
                    await Dialog.alert(
                        `Transaction halted due to background stock changes:\n\n${errorMessages.join('\n')}\n\nYour cart has been automatically adjusted.`, 
                        'Inventory Error'
                    );
                    return;
                }

                const orderData = {
                    id: `ord_${Date.now()}`,
                    event_id: Store.get('current_event_id'),
                    timestamp: new Date().toISOString(),
                    serialized_items_array: cartItems,
                    total_amount: calculatedTotal,
                    settlement_type: 'CASH'
                };
                await DB.execute('orders', 'readwrite', 'add', orderData);

                await Promise.all(cartItems.map(async (item) => {
                    const dbItem = await DB.execute('products', 'readonly', 'get', item.id);
                    if (dbItem) {
                        dbItem.stock_quantity -= item.quantity;
                        await DB.execute('products', 'readwrite', 'put', dbItem);
                    }
                }));
                
                Store.set('active_cart', []);
                Store.set('force_grid_refresh', Date.now());

                Toast.show('Transaction completed successfully!', 'success');
                
                // Hide drawer after successful mobile checkout
                container.classList.remove('mobile-open'); 
                
                const originalText = submitBtn.innerText;
                submitBtn.innerText = "Success!";
                submitBtn.style.backgroundColor = "var(--accent-blue)";
                setTimeout(() => {
                    submitBtn.innerText = originalText;
                    submitBtn.style.backgroundColor = "var(--accent-green)";
                }, 1000);
            });
        }
    };

    Store.subscribe('active_cart', (newCart) => { render(newCart); });
    Store.subscribe('current_event_id', () => { render(Store.get('active_cart') || []); });

    render(Store.get('active_cart') || []);
};