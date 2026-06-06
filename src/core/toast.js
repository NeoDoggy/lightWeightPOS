export const Toast = {
    init: () => {
        if (!document.getElementById('toast-container')) {
            const container = document.createElement('div');
            container.id = 'toast-container';
            document.body.appendChild(container);
        }
    },

    show: (message, type = 'success', duration = 3000) => {
        Toast.init();
        const container = document.getElementById('toast-container');
        
        const toast = document.createElement('div');
        toast.className = `sys-toast ${type}`;
        
        // Pick the right FontAwesome icon based on the alert type
        let icon = 'fa-circle-info';
        if (type === 'success') icon = 'fa-circle-check';
        if (type === 'error') icon = 'fa-circle-xmark';
        if (type === 'warning') icon = 'fa-triangle-exclamation';

        toast.innerHTML = `
            <i class="fa-solid ${icon}" style="font-size: 1.2rem;"></i> 
            <span>${message}</span>
        `;
        
        container.appendChild(toast);

        // Force browser to register the initial state before animating
        requestAnimationFrame(() => requestAnimationFrame(() => {
            toast.classList.add('active');
        }));

        // Automatically animate out and remove from DOM
        setTimeout(() => {
            toast.classList.remove('active');
            setTimeout(() => toast.remove(), 300); // Waits for the CSS slide-out to finish
        }, duration);
    }
};