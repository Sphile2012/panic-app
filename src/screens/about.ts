import { store } from '../state.js';
export function renderAbout(root) {
    root.innerHTML = `
    <div class="screen about-screen">

      <header class="screen-header">
        <button class="btn-back-small" id="btn-back" aria-label="Back">Back</button>
        <h2 class="screen-title">About Panic Ring</h2>
      </header>

      
      <div class="about-hero">
        <div class="about-logo-ring" aria-hidden="true"></div>
        <h1 class="about-app-name">Panic Ring</h1>
        <p class="about-tagline">
          A privacy-first bridge between a person in an unsafe situation
          and the people and services they choose to trust.
        </p>
        <span class="about-version">Version 1.0</span>
      </div>

      
      <section class="about-section">
        <h3 class="about-section-title">What Panic Ring does</h3>
        <p class="about-section-body">
          Panic Ring helps you discreetly alert your trusted circle, document
          incidents privately, find verified support services, and build a
          personal safety plan — without placing you at greater risk.
        </p>
        <ul class="about-list">
          <li>Silent, hold-to-activate alert — no voice call needed</li>
          <li>A cover screen you choose, with a decoy PIN</li>
          <li>Encrypted notes that only you can read</li>
          <li>Verified South African support services directory</li>
          <li>Consent-based referral — nothing shared without your approval</li>
          <li>Honest delivery status — it never says help was sent when it wasn't</li>
        </ul>
      </section>

      
      <section class="about-section">
        <h3 class="about-section-title">What Panic Ring is not</h3>
        <p class="about-section-body">
          Panic Ring is a bridge, not a promise to end violence. It does not
          call the police automatically, track your location continuously,
          or share anything without your consent.
        </p>
        <ul class="about-list">
          <li>Not a replacement for emergency services</li>
          <li>Not an automated counsellor: the Safety Companion uses reviewed content only</li>
          <li>Not a guarantee that help will arrive</li>
          <li>Not a surveillance tool — no continuous location history</li>
        </ul>
      </section>

      
      <section class="about-section">
        <h3 class="about-section-title">Your data</h3>
        <p class="about-section-body">
          Your contacts, notes and safety plan are stored encrypted on this
          device only. Only you can read them — Panic Ring staff have no
          master key. The only data sent to a server is a PIN hash and alert
          counts (no personal details, no location, no message content).
          You can delete everything at any time in Settings.
        </p>
      </section>

      
      <section class="about-section">
        <h3 class="about-section-title">Design approach</h3>
        <p class="about-section-body">
          Every feature was designed around two questions: how can this help
          the person, and how could it be used against them? Safety is a
          feature, not an assumption.
        </p>
        <p class="about-section-body" style="margin-top:8px">
          We use no invented statistics or survivor stories. Any figure used
          will come from an official source.
        </p>
      </section>

      
      <section class="about-section about-section--emergency">
        <h3 class="about-section-title">Emergency numbers</h3>
        <a class="about-emergency-link" href="tel:10111">
          <span class="about-emergency-number">10111</span>
          <span class="about-emergency-name">SAPS Emergency</span>
        </a>
        <a class="about-emergency-link" href="tel:0800428428">
          <span class="about-emergency-number">0800 428 428</span>
          <span class="about-emergency-name">GBV Command Centre — 24 hours</span>
        </a>
      </section>

      
      <div class="about-links">
        <button class="about-link-btn" id="btn-terms">Terms and conditions</button>
        <button class="about-link-btn" id="btn-support-dir">Support services directory</button>
      </div>

    </div>
  `;
    root.querySelector('#btn-back').addEventListener('click', () => store.navigateTo('settings'));
    root.querySelector('#btn-terms').addEventListener('click', () => store.navigateTo('terms'));
    root.querySelector('#btn-support-dir').addEventListener('click', () => store.navigateTo('support'));
}
