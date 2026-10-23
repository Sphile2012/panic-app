import { store } from '../state.js';
const KEYS = [
    ['7', '7'], ['8', '8'], ['9', '9'], ['÷', '/'],
    ['4', '4'], ['5', '5'], ['6', '6'], ['×', '*'],
    ['1', '1'], ['2', '2'], ['3', '3'], ['−', '-'],
    ['C', 'C'], ['0', '0'], ['=', '='], ['+', '+'],
];
export function renderCalculator(root) {
        const recoveryConfigured = store.getState().recoveryConfigured;
    root.innerHTML = `
    <div class="screen calculator-screen">
      <div class="calc-display">
        <div class="calc-expression" id="calc-expression">&nbsp;</div>
        <div class="calc-result" id="calc-result">0</div>
      </div>
      <p class="calc-login-error" id="calc-login-error" role="alert" hidden></p>
      <button class="calc-create-account" id="btn-create-account" type="button" hidden>Create account</button>
      ${recoveryConfigured ? '<button class="calc-forgot-pin" id="btn-forgot-pin" type="button">Forgot app PIN? Answer your security questions</button>' : ''}
      <div class="calc-keys">
        ${KEYS.map(([label, value]) => `
          <button
            class="calc-key${value === '=' ? ' calc-key--equals' : ''}${['/', '*', '-', '+'].includes(value) ? ' calc-key--op' : ''}${value === 'C' ? ' calc-key--clear' : ''}"
            data-value="${value}"
            aria-label="${label}">
            ${label}
          </button>
        `).join('')}
      </div>
    </div>
  `;
    const display = root.querySelector('#calc-result');
    const expression = root.querySelector('#calc-expression');
    const loginError = root.querySelector('#calc-login-error') as HTMLElement;
    const createAccount = root.querySelector('#btn-create-account') as HTMLButtonElement;
    const recoveryButton = root.querySelector('#btn-forgot-pin') as HTMLButtonElement | null;
    recoveryButton?.addEventListener('click', () => store.navigateTo('pin-recovery'));
    createAccount.addEventListener('click', () => store.navigateTo('setup-pin'));
    let calcBuffer = '';
    function clearLoginFeedback() {
        loginError.hidden = true;
        createAccount.hidden = true;
    }
    root.querySelector('.calc-keys').addEventListener('click', e => {
        const btn = e.target.closest('.calc-key');
        if (!btn)
            return;
        handleKey(btn.dataset['value'] ?? '');
    });
    function handleKey(v) {
        if (v === 'C') {
            store.clearPin();
            calcBuffer = '';
            clearLoginFeedback();
            display.textContent = '0';
            expression.innerHTML = '&nbsp;';
            return;
        }
        if (v === '=') {
            store.evaluatePin().then(route => {
                if (!route) {
                    display.textContent = 'Incorrect PIN';
                    expression.textContent = '';
                    calcBuffer = '';
                    loginError.textContent = 'Please try again or create an account.';
                    loginError.hidden = false;
                    createAccount.hidden = false;
                }
            });
            return;
        }
        if (/\d/.test(v)) {
            clearLoginFeedback();
            store.appendPin(v);
            expression.textContent = '•'.repeat(store.getState().pinBuffer.length);
            calcBuffer += v;
            display.textContent = calcBuffer;
            return;
        }
        clearLoginFeedback();
        store.clearPin();
        calcBuffer += ` ${v} `;
        display.textContent = v;
        expression.textContent = calcBuffer;
    }
}
