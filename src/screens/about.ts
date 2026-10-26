import '../strings/groupB.js';
import { store } from '../state.js';
import { t } from '../i18n.js';
import { DB_CONFIGURED } from '../db.js';

export function renderAbout(root) {
    const authEnabled = DB_CONFIGURED;
    const version = '1.2.0';
    const buildDate = '2024';
    
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
        <span class="about-version">Version ${version} (${buildDate})</span>
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
          <li>Custom PIN creation with disguise modes</li>
          <li>Password and PIN recovery options</li>
          <li>Optional cloud backup ${authEnabled ? '(Enabled)' : '(Disabled)'}</li>
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
        <ul class="about-list">
          <li>All data encrypted on your device</li>
          <li>PIN hashes using SHA-256 (local) and bcrypt (cloud)</li>
          <li>AES-256-GCM encryption for sensitive data</li>
          <li>No tracking or analytics</li>
          <li>Works completely offline</li>
        </ul>
      </section>

      <section class="about-section">
        <h3 class="about-section-title">${t('b.about.design.title')}</h3>
        <p class="about-section-body">${t('b.about.design.body1')}</p>
        <p class="about-section-body" style="margin-top:8px">${t('b.about.design.body2')}</p>
        <p class="about-section-body" style="margin-top:8px">
          The app includes 5 disguise modes (Calculator, Budget Tracker, Weather, Notes, Clock) 
          to help protect your privacy when your device is locked.
        </p>
      </section>

      <section class="about-section">
        <h3 class="about-section-title">Security Features</h3>
        <ul class="about-list">
          <li>Two-PIN system (Secret + Decoy)</li>
          <li>Security questions for PIN recovery</li>
          <li>Password reset via email</li>
          <li>Auto-lock after inactivity</li>
          <li>Emergency escape (press ESC key)</li>
        </ul>
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
        <a class="about-emergency-link" href="tel:0800150150">
          <span class="about-emergency-number">0800 150 150</span>
          <span class="about-emergency-name">LifeLine SA</span>
        </a>
      </section>

      <div class="about-links">
        <button class="about-link-btn" id="btn-terms">${t('b.about.terms')}</button>
        <button class="about-link-btn" id="btn-support-dir">${t('b.about.support')}</button>
        <button class="about-link-btn" id="btn-guide">User Guide</button>
      </div>

    </div>
  `;
    root.querySelector('#btn-back').addEventListener('click', () => store.navigateTo('settings'));
    root.querySelector('#btn-terms').addEventListener('click', () => store.navigateTo('terms'));
    root.querySelector('#btn-support-dir').addEventListener('click', () => store.navigateTo('support'));
    root.querySelector('#btn-guide').addEventListener('click', () => store.navigateTo('guide'));
}
