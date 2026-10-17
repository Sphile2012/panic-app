import { store } from '../state.js';
export function renderSafetyPlan(root: HTMLElement): void {
    const { safetyPlan: p } = store.getState();
    root.innerHTML = `
    <div class="screen safety-plan-screen">

      <header class="screen-header">
        <button class="btn-back-small" id="btn-back" aria-label="Back">←</button>
        <h2 class="screen-title">My safety plan</h2>
        <button class="btn-text-action" id="btn-save-plan">Save</button>
      </header>

      <p class="plan-intro">
        Fill this in while you feel safe. Having it ready helps
        you act quickly if you need to.
      </p>

      <form class="plan-form" id="plan-form" autocomplete="off">
        <section class="plan-step" data-plan-step>
          <h3 class="form-section-title">1. Safe place</h3>
          ${planField('safe-places', 'Where can I go?', 'Addresses where I can go if I need to leave', p.safePlaces)}
        </section>
        <section class="plan-step" data-plan-step hidden>
          <h3 class="form-section-title">2. People and emergency numbers</h3>
          ${planField('trusted-people', 'Trusted people', 'Names and phone numbers of people I can call', p.trustedPeople)}
          ${planField('emergency-numbers', 'Emergency numbers', '10111, 0800 428 428, neighbours, etc.', p.emergencyNumbers)}
        </section>
        <section class="plan-step" data-plan-step hidden>
          <h3 class="form-section-title">3. Transport</h3>
          ${planField('transport', 'How can I get there?', 'Transport options and backup routes', p.transportOptions)}
        </section>
        <section class="plan-step" data-plan-step hidden>
          <h3 class="form-section-title">4. Important documents</h3>
          ${planField('important-docs', 'What should I take?', 'ID, passport, bank cards — where they are', p.importantDocs)}
        </section>
        <section class="plan-step" data-plan-step hidden>
          <h3 class="form-section-title">5. Other things to remember</h3>
          ${planField('remember', 'Things to remember', 'Anything else I need to know in an emergency', p.thingsToRemember)}
          ${planField('safe-word', 'Safe word (optional)', 'A phrase your trusted people already know means you need support', p.safeWord)}
        </section>
      </form>
      <div class="plan-step-nav">
        <button class="btn-secondary-outline" id="btn-plan-prev" type="button" disabled>Previous</button>
        <span id="plan-step-count" aria-live="polite">Step 1 of 5</span>
        <button class="btn-secondary-outline" id="btn-plan-next" type="button">Next</button>
      </div>
      <div class="plan-bottom-actions">
        <button class="btn-secondary-outline" id="btn-plan-back-bottom" type="button">Back to app</button>
        <button class="btn-primary" id="btn-save-plan-bottom" type="button">Save Safety Plan</button>
      </div>

      <p class="plan-footer">
        This plan is stored encrypted on this device only. It is not shared automatically.
        A safe word is a manual message shortcut, not a hidden alert.
      </p>

    </div>
  `;
    root.querySelector('#btn-back').addEventListener('click', () => {
        store.navigateTo('app');
    });
    root.querySelector('#btn-plan-back-bottom').addEventListener('click', () => store.navigateTo('app'));
    const steps = Array.from(root.querySelectorAll<HTMLElement>('[data-plan-step]'));
    let currentStep = 0;
    const showStep = (): void => {
        steps.forEach((step, index) => {
          step.hidden = index !== currentStep;
        });
        root.querySelector('#plan-step-count').textContent = `Step ${currentStep + 1} of ${steps.length}`;
        (root.querySelector('#btn-plan-prev') as HTMLButtonElement).disabled = currentStep === 0;
        root.querySelector('#btn-plan-next').textContent = currentStep === steps.length - 1 ? 'Start over' : 'Next';
    };
    root.querySelector('#btn-plan-prev').addEventListener('click', () => {
        currentStep = Math.max(0, currentStep - 1);
        showStep();
    });
    root.querySelector('#btn-plan-next').addEventListener('click', () => {
        currentStep = currentStep === steps.length - 1 ? 0 : currentStep + 1;
        showStep();
    });
    showStep();
    const savePlan = (): void => {
        const get = (id: string) => (root.querySelector(`#${id}`) as HTMLTextAreaElement | null)?.value.trim() ?? '';
        const plan = {
            trustedPeople: get('trusted-people'),
            safePlaces: get('safe-places'),
            emergencyNumbers: get('emergency-numbers'),
            importantDocs: get('important-docs'),
            transportOptions: get('transport'),
            thingsToRemember: get('remember'),
            safeWord: get('safe-word'),
        };
        store.saveSafetyPlan(plan);
        const saveButtons = [
          root.querySelector('#btn-save-plan'),
          root.querySelector('#btn-save-plan-bottom'),
        ];
        saveButtons.forEach(button => {
          if (!button)
            return;
          button.textContent = 'Saved ✓';
          setTimeout(() => { button.textContent = button.id === 'btn-save-plan' ? 'Save' : 'Save Safety Plan'; }, 1500);
        });
    };
    root.querySelector('#btn-save-plan').addEventListener('click', savePlan);
    root.querySelector('#btn-save-plan-bottom').addEventListener('click', savePlan);
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
