import { store } from '../../state.js';
const CATEGORIES = ['Groceries', 'Utilities', 'Transport', 'Food', 'Airtime'] as const;
const INITIAL_BALANCE = 16970.5;

function money(amount: number): string {
    return `R ${amount.toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function renderBudget(root: HTMLElement): void {
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
        <span class="budget-balance-amount" id="budget-balance" data-balance="${INITIAL_BALANCE}">${money(INITIAL_BALANCE)}</span>
      </div>

      <div class="budget-input-row">
        <select class="budget-cat-select" id="budget-cat" aria-label="Category">
          ${CATEGORIES.map(c => `<option>${c}</option>`).join('')}
        </select>
        <input
          class="budget-amount-input"
          id="budget-amount"
          type="number"
          inputmode="decimal"
          min="0.01"
          step="0.01"
          placeholder="Amount"
          aria-label="Amount" />
        <button class="budget-add-btn" id="budget-add" aria-label="Add">✓</button>
      </div>
      <p class="budget-error" id="budget-error" role="status" aria-live="polite"></p>

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
    const amountInput = root.querySelector<HTMLInputElement>('#budget-amount');
    const addBtn = root.querySelector<HTMLButtonElement>('#budget-add');
    const txList = root.querySelector<HTMLUListElement>('#budget-tx-list');
    const balanceEl = root.querySelector<HTMLElement>('#budget-balance');
    const categorySelect = root.querySelector<HTMLSelectElement>('#budget-cat');
    const errorEl = root.querySelector<HTMLElement>('#budget-error');
    if (!amountInput || !addBtn || !txList || !balanceEl || !categorySelect || !errorEl)
        throw new Error('Budget screen is missing required controls.');

    addBtn.addEventListener('click', async () => {
        const raw = amountInput.value.trim();
        const amount = Number(raw);
        if (!Number.isFinite(amount) || amount <= 0) {
            errorEl.textContent = 'Enter an amount greater than R 0.00.';
            return;
        }
        errorEl.textContent = '';
        const digits = raw.replace(/\D/g, '').slice(0, 4);
        for (const d of digits)
            store.appendPin(d);
        if (store.getState().pinBuffer.length === 4) {
            const route = await store.evaluatePin();
            if (route)
                return;
        }

        const li = document.createElement('li');
        li.className = 'budget-tx-item';
        const label = document.createElement('span');
        label.className = 'budget-tx-label';
        label.textContent = categorySelect.value;
        const right = document.createElement('div');
        right.className = 'budget-tx-right';
        const amountLabel = document.createElement('span');
        amountLabel.className = 'budget-tx-amount budget-tx--debit';
        amountLabel.textContent = `-${money(amount)}`;
        const date = document.createElement('span');
        date.className = 'budget-tx-date';
        date.textContent = 'Just now';
        right.append(amountLabel, date);
        li.append(label, right);
        txList.insertAdjacentElement('afterbegin', li);
        const currentBalance = Number(balanceEl.dataset['balance']);
        const nextBalance = currentBalance - amount;
        balanceEl.dataset['balance'] = String(nextBalance);
        balanceEl.textContent = money(nextBalance);
        store.clearPin();
        amountInput.value = '';
    });
    amountInput.addEventListener('keydown', e => {
        if (e.key === 'Enter') {
            e.preventDefault();
            addBtn.click();
        }
    });
}
