import '../strings/groupC.js';
import { t } from '../i18n.js';
import { store } from '../state.js';
function safeEval(expr, errorText) {
    const tokens = expr.trim().match(/[\d.]+|[+\-*/]/g);
    if (!tokens)
        return errorText;
    try {
        const prec = { '+': 1, '-': 1, '*': 2, '/': 2 };
        const out = [];
        const ops = [];
        const applyOp = () => {
            const op = ops.pop();
            const b = out.pop();
            const a = out.pop();
            if (op === '+')
                out.push(a + b);
            else if (op === '-')
                out.push(a - b);
            else if (op === '*')
                out.push(a * b);
            else if (op === '/')
                out.push(a / b);
        };
        for (const tok of tokens) {
            if (/[\d.]/.test(tok)) {
                out.push(parseFloat(tok));
            }
            else {
                while (ops.length && prec[ops[ops.length - 1]] >= prec[tok])
                    applyOp();
                ops.push(tok);
            }
        }
        while (ops.length)
            applyOp();
        const result = out[0] ?? NaN;
        if (!isFinite(result))
            return errorText;
        return parseFloat(result.toPrecision(12)).toString();
    }
    catch {
        return errorText;
    }
}
const KEYS = [
    ['7', '7'], ['8', '8'], ['9', '9'], ['÷', '/'],
    ['4', '4'], ['5', '5'], ['6', '6'], ['×', '*'],
    ['1', '1'], ['2', '2'], ['3', '3'], ['−', '-'],
    ['C', 'C'], ['0', '0'], ['=', '='], ['+', '+'],
];
export function renderCalculator(root) {
    root.innerHTML = `
    <div class="screen calculator-screen">
      <div class="calc-display">
        <div class="calc-expression" id="calc-expression">&nbsp;</div>
        <div class="calc-result" id="calc-result">0</div>
      </div>
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
    let calcBuffer = '';
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
            display.textContent = '0';
            expression.innerHTML = '&nbsp;';
            return;
        }
        if (v === '=') {
            store.evaluatePin().then(route => {
                if (!route) {
                    display.textContent = safeEval(calcBuffer || '0', t('c.calc.error'));
                    expression.textContent = calcBuffer + ' =';
                    calcBuffer = '';
                }
            });
            return;
        }
        if (/\d/.test(v)) {
            store.appendPin(v);
            expression.textContent = '•'.repeat(store.getState().pinBuffer.length);
            calcBuffer += v;
            display.textContent = calcBuffer;
            return;
        }
        store.clearPin();
        calcBuffer += ` ${v} `;
        display.textContent = v;
        expression.textContent = calcBuffer;
    }
}
