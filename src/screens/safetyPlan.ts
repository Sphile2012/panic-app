import { store } from '../state.js';
export function renderSafetyPlan(root) {
    const { safetyPlan: p } = store.getState();
    root.innerHTML = `
    <div class="screen safety-plan-screen">

      <header class="screen-header">
        <button class="btn-back-small" id="btn-back" aria-label="Back">Back</button>
        <h2 class="screen-title">My safety plan</h2>
        <button class="btn-text-action" id="btn-save-plan">Save</button>
      </header>

      <p class="plan-intro">
        Fill this in while you feel safe. Having it ready helps
        you act quickly if you need to.
      </p>

      <form class="plan-form" id="plan-form" autocomplete="off">
        ${planField('trusted-people', 'Trusted people', 'Names and phone numbers of people I can call', p.trustedPeople)}
        ${planField('safe-places', 'Safe places', 'Addresses where I can go if I need to leave', p.safePlaces)}
        ${planField('emergency-numbers', 'Emergency numbers', '10111, 0800 428 428, neighbours, etc.', p.emergencyNumbers)}
        ${planField('important-docs', 'Important documents', 'ID, passport, bank cards — where they are', p.importantDocs)}
        ${planField('transport', 'Transport options', 'How I can get to a safe place', p.transportOptions)}
        ${planField('remember', 'Things to remember', 'Anything else I need to know in an emergency', p.thingsToRemember)}
      </form>

      <p class="plan-footer">
        This plan is stored on this device only. It is not shared automatically.
      </p>

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
        btn.textContent = 'Saved';
        setTimeout(() => { btn.textContent = 'Save'; }, 1500);
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
