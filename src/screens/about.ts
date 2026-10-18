import '../strings/groupB.js';
import { store } from '../state.js';
import { t } from '../i18n.js';
export function renderAbout(root) {
    root.innerHTML = `
    <div class="screen about-screen">

      <header class="screen-header">
        <button class="btn-back-small" id="btn-back" aria-label="${t('common.back')}">${t('common.back')}</button>
        <h2 class="screen-title">${t('b.about.title')}</h2>
      </header>

      <div class="about-hero">
        <div class="about-logo-ring" aria-hidden="true"></div>
        <h1 class="about-app-name">Panic Ring</h1>
        <p class="about-tagline">${t('b.about.tagline')}</p>
        <span class="about-version">${t('b.about.version')}</span>
      </div>

      <section class="about-section">
        <h3 class="about-section-title">${t('b.about.does.title')}</h3>
        <p class="about-section-body">${t('b.about.does.body')}</p>
        <ul class="about-list">
          <li>${t('b.about.does.1')}</li>
          <li>${t('b.about.does.2')}</li>
          <li>${t('b.about.does.3')}</li>
          <li>${t('b.about.does.4')}</li>
          <li>${t('b.about.does.5')}</li>
          <li>${t('b.about.does.6')}</li>
        </ul>
      </section>

      <section class="about-section">
        <h3 class="about-section-title">${t('b.about.not.title')}</h3>
        <p class="about-section-body">${t('b.about.not.body')}</p>
        <ul class="about-list">
          <li>${t('b.about.not.1')}</li>
          <li>${t('b.about.not.2')}</li>
          <li>${t('b.about.not.3')}</li>
          <li>${t('b.about.not.4')}</li>
        </ul>
      </section>

      <section class="about-section">
        <h3 class="about-section-title">${t('b.about.data.title')}</h3>
        <p class="about-section-body">${t('b.about.data.body')}</p>
      </section>

      <section class="about-section">
        <h3 class="about-section-title">${t('b.about.design.title')}</h3>
        <p class="about-section-body">${t('b.about.design.body1')}</p>
        <p class="about-section-body" style="margin-top:8px">${t('b.about.design.body2')}</p>
      </section>

      <section class="about-section about-section--emergency">
        <h3 class="about-section-title">${t('b.about.emerg.title')}</h3>
        <a class="about-emergency-link" href="tel:10111">
          <span class="about-emergency-number">10111</span>
          <span class="about-emergency-name">${t('b.about.emerg.saps')}</span>
        </a>
        <a class="about-emergency-link" href="tel:0800428428">
          <span class="about-emergency-number">0800 428 428</span>
          <span class="about-emergency-name">${t('b.about.emerg.gbv')}</span>
        </a>
      </section>

      <div class="about-links">
        <button class="about-link-btn" id="btn-terms">${t('b.about.terms')}</button>
        <button class="about-link-btn" id="btn-support-dir">${t('b.about.support')}</button>
      </div>

    </div>
  `;
    root.querySelector('#btn-back').addEventListener('click', () => store.navigateTo('settings'));
    root.querySelector('#btn-terms').addEventListener('click', () => store.navigateTo('terms'));
    root.querySelector('#btn-support-dir').addEventListener('click', () => store.navigateTo('support'));
}
