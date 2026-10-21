import { store } from '../../state.js';
const CATEGORIES = ['Groceries', 'Utilities', 'Transport', 'Food', 'Airtime'];
export function renderBudget(root) {
    const transactions = [
        { label: 'Groceries', amount: '-R 284.50', date: 'Today' },
        { label: 'Utilities', amount: '-R 1 200.00', date: 'Yesterday' },
        { label: 'Salary', amount: '+R 18 500.00', date: 'Mon' },
        { label: 'Transport', amount: '-R 45.00', date: 'Mon' },
    ];
    root.innerHTML = `
    <div class="screen budget-screen">

      <header class="budget-header">
        <span class="budget-app-title">My Budget</span>
        <span class="budget-month">Oct 2026</span>
      </header>

      <div class="budget-balance">
        <span class="budget-balance-label">Available balance</span>
        <span class="budget-balance-amount" id="budget-balance">R 16 970.50</span>
      </div>

      <div class="budget-input-row">
        <select class="budget-cat-select" id="budget-cat" aria-label="Category">
          ${CATEGORIES.map(c => `<option>${c}</option>`).join('')}
        </select>
        <input
          class="budget-amount-input"
          id="budget-amount"
          type="number"
          inputmode="numeric"
          placeholder="Amount"
          aria-label="Amount" />
        <button class="budget-add-btn" id="budget-add" aria-label="Add">✓</button>
      </div>

      <ul class="budget-tx-list" id="budget-tx-list">
        ${transactions.map(t => `
          <li class="budget-tx-item">
            <span class="budget-tx-label">${t.label}</span>
            <div class="budget-tx-right">
              <span class="budget-tx-amount ${t.amount.startsWith('+') ? 'budget-tx--credit' : 'budget-tx--debit'}">${t.amount}</span>
              <span class="budget-tx-date">${t.date}</span>
            </div>
          </li>
        `).join('')}
      </ul>

    </div>
  `;
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
      <span class="budget-tx-label">${catEl.value}</span>
      <div class="budget-tx-right">
        <span class="budget-tx-amount budget-tx--debit">-R ${parseFloat(raw).toFixed(2)}</span>
        <span class="budget-tx-date">Just now</span>
      </div>
    `;
        txList.insertAdjacentElement('afterbegin', li);
        const cur = parseFloat(balanceEl.textContent.replace(/[^\d.]/g, ''));
        const spend = parseFloat(raw) || 0;
        balanceEl.textContent = `R ${(cur - spend).toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
        store.clearPin();
        amountInput.value = '';
    });
    amountInput.addEventListener('keydown', e => {
        if (e.key === 'Enter')
            addBtn.click();
    });
}
