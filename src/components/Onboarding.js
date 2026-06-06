import { i18n } from '../core/i18n.js';
import { Store } from '../core/store.js';

export const Onboarding = {
    steps: [
        { target: '#sidebar-container', titleKey: 'tour_step1_title', descKey: 'tour_step1_desc', position: 'right' },
        { target: '.grid-section', titleKey: 'tour_step2_title', descKey: 'tour_step2_desc', position: 'right' },
        { target: '.cart-section', titleKey: 'tour_step3_title', descKey: 'tour_step3_desc', position: 'left' },
        { target: '[data-view="settings"]', titleKey: 'tour_step4_title', descKey: 'tour_step4_desc', position: 'right' }
    ],
    
    currentStep: 0,
    isActive: false,

    init: () => {
        if (!document.getElementById('tour-container')) {
            const container = document.createElement('div');
            container.id = 'tour-container';
            container.innerHTML = `
                <div id="tour-highlight"></div>
                <div class="tour-tooltip" id="tour-tooltip">
                    <div class="tour-header" id="tour-title"></div>
                    <div class="tour-body" id="tour-desc"></div>
                    <div class="tour-controls">
                        <button class="tour-btn-skip" id="tour-btn-skip"></button>
                        <button class="tour-btn-next" id="tour-btn-next"></button>
                    </div>
                </div>
            `;
            document.body.appendChild(container);

            const welcomeModal = document.createElement('div');
            welcomeModal.className = 'modal-overlay';
            welcomeModal.id = 'tour-welcome-modal';
            welcomeModal.style.zIndex = '10002';
            welcomeModal.innerHTML = `
                <div class="modal-card" style="text-align: center;">
                    <h2 style="font-family: var(--font-display); margin-top: 0; color: var(--accent-blue);">${i18n.t('tour_welcome_title')}</h2>
                    <p style="color: var(--text-secondary); margin-bottom: 2rem; line-height: 1.5;">${i18n.t('tour_welcome_desc')}</p>
                    <div style="display: flex; justify-content: center; gap: 1rem;">
                        <button class="btn-cancel" id="btn-welcome-skip">${i18n.t('tour_welcome_skip')}</button>
                        <button class="btn-save" id="btn-welcome-start">${i18n.t('tour_welcome_start')}</button>
                    </div>
                </div>
            `;
            document.body.appendChild(welcomeModal);

            document.getElementById('tour-btn-skip').addEventListener('click', Onboarding.end);
            document.getElementById('tour-btn-next').addEventListener('click', Onboarding.next);
            
            document.getElementById('btn-welcome-skip').addEventListener('click', () => {
                document.getElementById('tour-welcome-modal').classList.remove('active');
                Onboarding.end(); 
            });
            document.getElementById('btn-welcome-start').addEventListener('click', () => {
                document.getElementById('tour-welcome-modal').classList.remove('active');
                Onboarding.start();
            });
        }
    },

    promptTour: () => {
        Onboarding.init();
        document.getElementById('tour-welcome-modal').classList.add('active');
    },

    start: () => {
        if (Onboarding.isActive) return;
        Store.set('active_view', 'selling');
        Onboarding.isActive = true;
        Onboarding.currentStep = 0;
        Onboarding.init();

        // document.getElementById('tour-container').classList.add('active');
        // Onboarding.renderStep();
        
        setTimeout(() => {
            // document.getElementById('tour-container').classList.add('active');
            Onboarding.renderStep();
        }, 250);
    },

    end: () => {
        Onboarding.isActive = false;
        document.getElementById('tour-container').classList.remove('active');
        localStorage.setItem('has_completed_tour', 'true');
        
        // Mobile Cleanup: Ensure cart drawer closes when tour finishes
        const cart = document.querySelector('.cart-section');
        if (cart) cart.classList.remove('mobile-open');
    },

    next: () => {
        Onboarding.currentStep++;
        if (Onboarding.currentStep >= Onboarding.steps.length) {
            Onboarding.end();
        } else {
            Onboarding.renderStep();
        }
    },

    renderStep: () => {
        const step = Onboarding.steps[Onboarding.currentStep];
        const sidebar = document.querySelector('#sidebar-container');
        const cart = document.querySelector('.cart-section');
        
        // POPULATE TEXT IMMEDIATELY (Move this out of executeDraw to the top)
        document.getElementById('tour-title').innerText = i18n.t(step.titleKey);
        document.getElementById('tour-desc').innerText = i18n.t(step.descKey);
        document.getElementById('tour-btn-skip').innerText = i18n.t('tour_skip');
        
        const isLast = Onboarding.currentStep === Onboarding.steps.length - 1;
        document.getElementById('tour-btn-next').innerText = isLast ? i18n.t('tour_finish') : i18n.t('tour_next');

        let waitForAnimation = false;
        let animatedElement = null;

        // Mobile Cart Drawer Management
        if (cart) {
            if (step.target === '.cart-section' && window.innerWidth <= 1024) {
                cart.classList.add('mobile-open');
                waitForAnimation = true;
                animatedElement = cart;
            } else {
                cart.classList.remove('mobile-open');
            }
        }

        // PC Sidebar Management
        if (step.target === '#sidebar-container' && Store.get('sidebar_collapsed')) {
            Store.set('sidebar_collapsed', false);
            if (!waitForAnimation) {
                waitForAnimation = true;
                animatedElement = sidebar;
            }
        } else if (Onboarding.currentStep === 1 && !Store.get('sidebar_collapsed')) {
            Store.set('sidebar_collapsed', true);
            if (!waitForAnimation) {
                waitForAnimation = true;
                animatedElement = sidebar;
            }
        }

        const executeDraw = () => {
            const targetEl = document.querySelector(step.target);
            if (!targetEl) return Onboarding.next();

            const rect = targetEl.getBoundingClientRect();
            const highlight = document.getElementById('tour-highlight');
            
            highlight.style.top = `${rect.top - 8}px`;
            highlight.style.left = `${rect.left - 8}px`;
            highlight.style.width = `${rect.width + 16}px`;
            highlight.style.height = `${rect.height + 16}px`;

            const tooltip = document.getElementById('tour-tooltip');
            
            // Reset base styles
            tooltip.style.transform = 'none';
            tooltip.style.bottom = 'auto';

            // Smart Positioning Engine
            if (window.innerWidth <= 1024) {
                tooltip.style.left = '50%';
                tooltip.style.transform = 'translateX(-50%)';
                
                if (rect.top > window.innerHeight / 2) {
                    tooltip.style.top = '40px'; 
                } else {
                    tooltip.style.top = 'auto';
                    tooltip.style.bottom = '120px';
                }
            } else {
                if (step.position === 'right') {
                    tooltip.style.top = `${Math.max(20, rect.top)}px`;
                    tooltip.style.left = `${rect.right + 24}px`;
                } else if (step.position === 'left') {
                    tooltip.style.top = `${Math.max(20, rect.top)}px`;
                    tooltip.style.left = `${rect.left - tooltip.offsetWidth - 24}px`;
                }
            }

            // SHOW CONTAINER (Only after text is injected and coordinates are set)
            document.getElementById('tour-container').classList.add('active');
        };

        // Wait for sliding animations to finish before drawing the spotlight
        if (waitForAnimation && animatedElement) {
            const handler = (e) => {
                if (e.propertyName === 'width' || e.propertyName === 'transform') {
                    animatedElement.removeEventListener('transitionend', handler);
                    executeDraw();
                }
            };
            animatedElement.addEventListener('transitionend', handler);
            
            setTimeout(() => {
                animatedElement.removeEventListener('transitionend', handler);
                executeDraw();
            }, 250);
        } else {
            requestAnimationFrame(() => requestAnimationFrame(executeDraw));
        }
    }
};