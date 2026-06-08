import { i18n } from "./i18n.js";

export const Dialog = {
    create: (title, message, isConfirm = false) => {
        return new Promise((resolve) => {
            const overlay = document.createElement('div');
            overlay.className = 'sys-dialog-overlay';
            overlay.innerHTML = `
                <div class="sys-dialog-card">
                    <div class="sys-dialog-title">${title}</div>
                    <div class="sys-dialog-msg">${message}</div>
                    <div class="sys-dialog-actions">
                        ${isConfirm ? `<button class="btn-cancel" id="sys-dialog-cancel">${i18n.t('dialog_cancel_button')}</button>` : ''}
                        <button class="btn-save" id="sys-dialog-ok">${i18n.t('dialog_confirm_button')}</button>
                    </div>
                </div>
            `;
            document.body.appendChild(overlay);

            // Force reflow so the CSS animation triggers smoothly
            requestAnimationFrame(() => requestAnimationFrame(() => {
                overlay.classList.add('active');
            }));

            const close = (result) => {
                overlay.classList.remove('active');
                // Wait for animation to finish before removing from DOM
                setTimeout(() => {
                    overlay.remove();
                    resolve(result);
                }, 300); 
            };

            overlay.querySelector('#sys-dialog-ok').addEventListener('click', () => close(true));
            if (isConfirm) {
                overlay.querySelector('#sys-dialog-cancel').addEventListener('click', () => close(false));
            }
        });
    },
    
    alert: (message, title = 'Attention') => Dialog.create(title, message, false),
    confirm: (message, title = 'Confirm Action') => Dialog.create(title, message, true)
};