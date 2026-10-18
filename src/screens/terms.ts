import '../strings/groupB.js';
import { store } from '../state.js';
import { t } from '../i18n.js';
export function renderTerms(root) {
    const section = (n: number, paras: string[], list?: { after: number; items: string[] }) => `
        <div class="terms-section">
          <h3 class="terms-heading">${t(`b.terms.s${n}.h`)}</h3>
          ${paras.map((p, i) => `<p>${t(`b.terms.s${n}.${p}`)}</p>` + (list && list.after === i ? `<ul class="terms-list">${list.items.map(l => `<li>${t(`b.terms.s${n}.${l}`)}</li>`).join('')}</ul>` : '')).join('')}
        </div>`;
    root.innerHTML = `
    <div class="screen terms-screen">

      <header class="screen-header">
        <button class="btn-back-small" id="btn-back" aria-label="${t('common.back')}">${t('common.back')}</button>
        <h2 class="screen-title">${t('b.terms.title')}</h2>
      </header>

      <div class="terms-body">

        <p class="terms-intro">${t('b.terms.intro')}</p>
        <p class="terms-effective">${t('b.terms.effective')}</p>
        ${section(1, ['p1'])}
        ${section(2, ['p1', 'p2', 'p3', 'p4', 'p5'])}
        ${section(3, ['p1', 'p2', 'p3', 'p4'], { after: 1, items: ['li1', 'li2', 'li3'] })}
        ${section(4, ['p1', 'p2'])}
        ${section(5, ['p1', 'p2'])}
        ${section(6, ['p1'])}
        ${section(7, ['p1'])}
        ${section(8, ['p1'])}
        ${section(9, ['p1'])}
        ${section(10, ['p1'])}

        <div class="terms-emergency-reminder">
          <p>${t('b.terms.emerg')}</p>
        </div>

      </div>

    </div>
  `;
    root.querySelector('#btn-back').addEventListener('click', () => store.navigateTo('about'));
}
