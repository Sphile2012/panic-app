import '../strings/groupB.js';
import { store } from '../state.js';
import { t } from '../i18n.js';

type Step = { heading: string; body: string; options: { label: string; next: string }[] };

const BACK = { label: 'common.back', next: 'start' };

function steps(): Record<string, Step> {
    return {
        start: {
            heading: 'b.comp.start.h',
            body: 'b.comp.start.b',
            options: [
                { label: 'b.comp.opt.now', next: 'emergency' },
                { label: 'b.comp.opt.medical', next: 'medical' },
                { label: 'b.comp.opt.legal', next: 'legal' },
                { label: 'b.comp.opt.emotional', next: 'emotional' },
                { label: 'b.comp.opt.shelter', next: 'shelter' },
                { label: 'b.comp.opt.friend', next: 'bystander' },
                { label: 'b.comp.opt.plan', next: 'safetyplan' },
                { label: 'b.comp.opt.digital', next: 'digital' },
            ],
        },
        emergency: {
            heading: 'b.comp.emergency.h',
            body: 'b.comp.emergency.b',
            options: [
                { label: 'b.comp.opt.saps', next: 'call:10111' },
                { label: 'b.comp.opt.gbv', next: 'call:0800428428' },
                { label: 'b.comp.opt.gbvfree', next: 'call:*120*7867#' },
                BACK,
            ],
        },
        medical: {
            heading: 'b.comp.medical.h',
            body: 'b.comp.medical.b',
            options: [
                { label: 'b.comp.opt.thuth', next: 'open:https://www.npa.gov.za/content/thuthuzela-care-centres' },
                { label: 'b.comp.opt.gbvcc', next: 'call:0800428428' },
                BACK,
            ],
        },
        legal: {
            heading: 'b.comp.legal.h',
            body: 'b.comp.legal.b',
            options: [
                { label: 'b.comp.opt.legalaid', next: 'call:0800110110' },
                { label: 'b.comp.opt.powa', next: 'call:0116424345' },
                BACK,
            ],
        },
        emotional: {
            heading: 'b.comp.emotional.h',
            body: 'b.comp.emotional.b',
            options: [
                { label: 'b.comp.opt.powa', next: 'call:0116424345' },
                { label: 'b.comp.opt.gbv', next: 'call:0800428428' },
                BACK,
            ],
        },
        shelter: {
            heading: 'b.comp.shelter.h',
            body: 'b.comp.shelter.b',
            options: [
                { label: 'b.comp.opt.nsh', next: 'call:0800001005' },
                { label: 'b.comp.opt.powa', next: 'call:0116424345' },
                BACK,
            ],
        },
        bystander: {
            heading: 'b.comp.bystander.h',
            body: 'b.comp.bystander.b',
            options: [
                { label: 'b.comp.opt.gbv', next: 'call:0800428428' },
                BACK,
            ],
        },
        safetyplan: {
            heading: 'b.comp.safetyplan.h',
            body: 'b.comp.safetyplan.b',
            options: [
                { label: 'b.comp.opt.openplan', next: 'nav:safety-plan' },
                BACK,
            ],
        },
        digital: {
            heading: 'b.comp.digital.h',
            body: 'b.comp.digital.b',
            options: [BACK],
        },
    };
}

export function renderCompanion(root) {
    let currentStepId = 'start';
    function show(stepId) {
        currentStepId = stepId;
        const step = steps()[stepId];
        if (!step)
            return;
        root.innerHTML = `
      <div class="screen companion-screen">

        <header class="screen-header">
          <button class="btn-back-small" id="btn-back" aria-label="${t('b.comp.backapp')}">${t('common.back')}</button>
          <h2 class="screen-title">${t('b.comp.title')}</h2>
          <span class="companion-badge">${t('b.comp.badge')}</span>
        </header>

        <div class="companion-body">
          <h3 class="companion-heading">${t(step.heading)}</h3>
          <p class="companion-text">${t(step.body).replace(/\n/g, '<br/>')}</p>
        </div>

        <div class="companion-options" id="companion-options">
          ${step.options.map(o => `
            <button class="companion-option-btn" data-next="${o.next}">
              ${t(o.label)}
            </button>
          `).join('')}
        </div>

        <p class="companion-disclaimer">${t('b.comp.disclaimer')}</p>

      </div>
    `;
        root.querySelector('#btn-back').addEventListener('click', () => {
            store.navigateTo('app');
        });
        root.querySelectorAll('[data-next]').forEach(btn => {
            btn.addEventListener('click', () => {
                const next = btn.dataset['next'];
                if (next.startsWith('call:')) {
                    window.location.href = `tel:${next.slice(5)}`;
                    return;
                }
                if (next.startsWith('open:')) {
                    window.open(next.slice(5), '_blank', 'noopener');
                    return;
                }
                if (next.startsWith('nav:')) {
                    store.navigateTo(next.slice(4));
                    return;
                }
                show(next);
            });
        });
    }
    show(currentStepId);
}
