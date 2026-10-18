import '../strings/groupB.js';
import { store } from '../state.js';
import { t } from '../i18n.js';
export function renderSafetyPlan(root) {
    const { safetyPlan: p } = store.getState();
    root.innerHTML = `
    <div class="screen safety-plan-screen">

      <header class="screen-header">
        <button class="btn-back-small" id="btn-back" aria-label="${t('common.back')}">${t('common.back')}</button>
        <h2 class="screen-title">${t('b.plan.title')}</h2>
        <button class="btn-text-action" id="btn-save-plan">${t('b.plan.save')}</button>
      </header>

      <p class="plan-intro">${t('b.plan.intro')}</p>

      <form class="plan-form" id="plan-form" autocomplete="off">
        ${planField('trusted-people', t('b.plan.trusted'), t('b.plan.trusted.ph'), p.trustedPeople)}
        ${planField('safe-places', t('b.plan.places'), t('b.plan.places.ph'), p.safePlaces)}
        ${planField('emergency-numbers', t('b.plan.numbers'), t('b.plan.numbers.ph'), p.emergencyNumbers)}
        ${planField('important-docs', t('b.plan.docs'), t('b.plan.docs.ph'), p.importantDocs)}
        ${planField('transport', t('b.plan.transport'), t('b.plan.transport.ph'), p.transportOptions)}
        ${planField('remember', t('b.plan.remember'), t('b.plan.remember.ph'), p.thingsToRemember)}
      </form>

      <p class="plan-footer">${t('b.plan.footer')}</p>

    </div>
  `;
    root.querySelector('#btn-back').addEventListener('click', () => {
        store.navigateTo('app');
    });
    root.querySelector('#btn-save-plan').addEventListener('click', () => {
        const get = (id) => (root.querySelector(`#${id}`)?.value ?? '').trim();
        const plan = {
            trustedPeople: get('trusted-people'),
            safePlaces: get('safe-places'),
            emergencyNumbers: get('emergency-numbers'),
            importantDocs: get('important-docs'),
            transportOptions: get('transport'),
            thingsToRemember: get('remember'),
        };
        store.saveSafetyPlan(plan);
        const btn = root.querySelector('#btn-save-plan');
        btn.textContent = t('b.plan.saved');
        setTimeout(() => { btn.textContent = t('b.plan.save'); }, 1500);
    });
}
function planField(id, label, placeholder, value) {
    const escaped = value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
    return `
    <div class="plan-field">
      <label class="field-label" for="${id}">${label}</label>
      <textarea
        class="plan-textarea"
        id="${id}"
        placeholder="${placeholder}"
        rows="3">${escaped}</textarea>
    </div>
  `;
}
