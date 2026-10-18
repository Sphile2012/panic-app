import '../strings/groupB.js';
import { t } from '../i18n.js';
export function renderDecoy(root) {
    const items = [1, 2, 3, 4].map(n => `
        <li class="decoy-item">
          <div class="decoy-item-body">
            <span class="decoy-item-title">${t(`b.decoy.n${n}.t`)}</span>
            <span class="decoy-item-preview">${t(`b.decoy.n${n}.p`)}</span>
          </div>
          <span class="decoy-item-date">${t(`b.decoy.n${n}.d`)}</span>
        </li>`).join('');
    root.innerHTML = `
    <div class="screen decoy-screen">
      <header class="decoy-header">
        <span class="decoy-title">${t('b.notes.title')}</span>
        <button class="decoy-add-btn" title="${t('b.notes.new.aria')}" aria-label="${t('b.notes.new.aria')}">＋</button>
      </header>
      <ul class="decoy-list">${items}
      </ul>
      <p class="decoy-footer">${t('b.decoy.count')}</p>
    </div>
  `;
}
