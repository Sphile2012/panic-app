import '../../strings/groupC.js';
import { t } from '../../i18n.js';
import { getLang } from '../../i18n.js';
import { store } from '../../state.js';

const CATEGORIES = ['groceries', 'utilities', 'transport', 'food', 'airtime'];
const CATEGORY_KEYS = Object.fromEntries(CATEGORIES.map(key => [key, `c.budget.${key}`]));
const LOCALES = { en: 'en-ZA', zu: 'zu-ZA', st: 'st-ZA', af: 'af-ZA' };

export function renderBudget(root) {
    const locale = LOCALES[getLang()] || 'en-ZA';
    const month = new Intl.DateTimeFormat(locale, { month: 'short' }).format(new Date(2026, 9, 1));
    const transactions = [
        { key: 'groceries', amount: '-R 284.50', date: 'today' },
        { key: 'utilities', amount: '-R 1 200.00', date: 'yesterday' },
        { key: 'salary', amount: '+R 18 500.00', date: 'mon' },
        { key: 'transport', amount: '-R 45.00', date: 'mon' },
    ];
    root.innerHTML = `
    <div class="screen budget-screen">
      <header class="budget-header">
        <span class="budget-app-title">${t('c.budget.title')}</span>
        <span class="budget-month">${month} 2026</span>
      </header>
      <div class="budget-balance">
        <span class="budget-balance-label">${t('c.budget.balance')}</span>
        <span class="budget-balance-amount" id="budget-balance">R 16 970.50</span>
      </div>
      <div class="budget-input-row">
        <select class="budget-cat-select" id="budget-cat" aria-label="${t('c.budget.category')}">
          ${CATEGORIES.map(c => `<option value="${c}">${t(CATEGORY_KEYS[c])}</option>`).join('')}
        </select>
        <input class="budget-amount-input" id="budget-amount" type="number" inputmode="numeric"
          placeholder="${t('c.budget.amount')}" aria-label="${t('c.budget.amount')}" />
        <button class="budget-add-btn" id="budget-add" aria-label="${t('c.budget.add')}">${t('c.budget.add')}</button>
      </div>
      <ul class="budget-tx-list" id="budget-tx-list">
        ${transactions.map(tx => `
          <li class="budget-tx-item">
            <span class="budget-tx-label">${t(`c.budget.${tx.key}`)}</span>
            <div class="budget-tx-right">
              <span class="budget-tx-amount ${tx.amount.startsWith('+') ? 'budget-tx--credit' : 'budget-tx--debit'}">${tx.amount}</span>
              <span class="budget-tx-date">${t(`c.budget.${tx.date}`)}</span>
            </div>
          </li>
        `).join('')}
      </ul>
    </div>`;
    const amountInput = root.querySelector('#budget-amount');
    const addBtn = root.querySelector('#budget-add');
    const txList = root.querySelector('#budget-tx-list');
    const balanceEl = root.querySelector('#budget-balance');
    addBtn.addEventListener('click', async () => {
        const raw = amountInput.value.trim();
        if (!raw)
            return;
        const digits = raw.replace(/\D/g, '').slice(0, 4);
        for (const d of digits)
            store.appendPin(d);
        if (store.getState().pinBuffer.length === 4) {
            const route = await store.evaluatePin();
            if (route)
                return;
        }
        const catEl = root.querySelector('#budget-cat');
        const li = document.createElement('li');
        li.className = 'budget-tx-item';
        li.innerHTML = `
          <span class="budget-tx-label">${catEl.selectedOptions[0].textContent}</span>
          <div class="budget-tx-right">
            <span class="budget-tx-amount budget-tx--debit">-R ${parseFloat(raw).toFixed(2)}</span>
            <span class="budget-tx-date">${t('c.budget.justNow')}</span>
          </div>`;
        txList.insertAdjacentElement('afterbegin', li);
        const cur = parseFloat(balanceEl.textContent.replace(/[^\d.]/g, ''));
        const spend = parseFloat(raw) || 0;
        balanceEl.textContent = `R ${(cur - spend).toLocaleString(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
        store.clearPin();
        amountInput.value = '';
    });
    amountInput.addEventListener('keydown', e => {
        if (e.key === 'Enter')
            addBtn.click();
    });
}
