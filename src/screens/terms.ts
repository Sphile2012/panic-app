import { store } from '../state.js';
export function renderTerms(root) {
    root.innerHTML = `
    <div class="screen terms-screen">

      <header class="screen-header">
        <button class="btn-back-small" id="btn-back" aria-label="Back">←</button>
        <h2 class="screen-title">Terms and conditions</h2>
      </header>

      <div class="terms-body">

        <p class="terms-intro">
          By using Panic Ring you agree to these terms. Please read them.
          If you do not agree, do not use the app.
        </p>
        <p class="terms-effective">Last updated: October 2026</p>

        <!-- 1 -->
        <div class="terms-section">
          <h3 class="terms-heading">1. What Panic Ring is</h3>
          <p>
            Panic Ring is a personal safety tool that helps you alert trusted
            contacts, record incidents privately and find verified support
            services. It is not an emergency dispatch service and does not
            guarantee that help will arrive.
          </p>
        </div>

        <!-- 2 -->
        <div class="terms-section">
          <h3 class="terms-heading">2. No guarantee of delivery</h3>
          <p>
            Alerts are sent via the SMS application on your device. Delivery
            depends on your device, your mobile network, and the recipient's
            network. Panic Ring will always show you the honest delivery
            status. It will never claim an alert was delivered when it was not.
          </p>
          <p>
            If the app has no network connection, an alert will be queued and
            retried when connectivity returns, provided you have not closed the
            app. Queued alerts older than 30 minutes are discarded.
          </p>
          <p>
            In an emergency, always call <strong>10111</strong> (SAPS) or
            <strong>0800 428 428</strong> (GBV Command Centre) directly if you
            are able to.
          </p>
        </div>

        <!-- 3 -->
        <div class="terms-section">
          <h3 class="terms-heading">3. Your data and privacy</h3>
          <p>
            Your contacts, notes and safety plan are stored encrypted on your
            device only. The encryption key is derived from your PIN.
            Panic Ring staff cannot read your private data.
          </p>
          <p>
            The only information sent to our servers is:
          </p>
          <ul class="terms-list">
            <li>A hashed (one-way) version of your PIN — never the PIN itself</li>
            <li>Alert counts (how many contacts, how many delivered) — no names, no content, no location</li>
            <li>A random device identifier, known only to your device</li>
          </ul>
          <p>
            Location is captured only when you actively choose to share it
            during an alert. It is included in the SMS message to your contacts
            and is not stored on our servers.
          </p>
          <p>
            You can delete all your data at any time in Settings → Reset app.
          </p>
        </div>

        <!-- 4 -->
        <div class="terms-section">
          <h3 class="terms-heading">4. Your responsibility</h3>
          <p>
            You are responsible for keeping your PIN confidential, choosing
            trusted contacts carefully, and ensuring the app is set up before
            you need it. Panic Ring cannot protect you if it is not set up.
          </p>
          <p>
            You must not use Panic Ring to harass, stalk or harm anyone.
            The app is designed for personal safety, not surveillance.
          </p>
        </div>

        <!-- 5 -->
        <div class="terms-section">
          <h3 class="terms-heading">5. Support services directory</h3>
          <p>
            The services listed in the Support directory are labelled
            <strong>Listed</strong> (public information verified) or
            <strong>Partner</strong> (written agreement in place). Panic Ring
            does not endorse any service beyond what is stated and re-verifies
            listings on a schedule. We are not responsible for the actions of
            listed organisations.
          </p>
          <p>
            Sensitive shelter addresses are never shown. Users are directed to
            the verified shelter helpline instead.
          </p>
        </div>

        <!-- 6 -->
        <div class="terms-section">
          <h3 class="terms-heading">6. Safety Companion</h3>
          <p>
            The Safety Companion is a menu-led information tool. It answers
            only from reviewed content and the verified directory. It will
            never diagnose, counsel, give legal advice, or say help is on
            the way. It is clearly labelled as automated and is not a
            substitute for professional support.
          </p>
        </div>

        <!-- 7 -->
        <div class="terms-section">
          <h3 class="terms-heading">7. Check-in timer</h3>
          <p>
            The check-in timer sends an SMS alert to your trusted circle if
            you do not cancel before the timer expires. It is your
            responsibility to cancel the timer if you are safe. Panic Ring
            is not liable for alerts sent because a timer was not cancelled.
          </p>
        </div>

        <!-- 8 -->
        <div class="terms-section">
          <h3 class="terms-heading">8. Limitation of liability</h3>
          <p>
            Panic Ring is provided as-is. We take the safety of people using
            this app seriously and work hard to make it reliable. However, we
            cannot guarantee uninterrupted service and are not liable for any
            harm resulting from failure to deliver an alert, network outages,
            device failures, or misuse.
          </p>
        </div>

        <!-- 9 -->
        <div class="terms-section">
          <h3 class="terms-heading">9. Changes to these terms</h3>
          <p>
            We may update these terms. Significant changes will be shown
            in the app before taking effect. Continued use after that point
            means you accept the updated terms.
          </p>
        </div>

        <!-- 10 -->
        <div class="terms-section">
          <h3 class="terms-heading">10. Applicable law</h3>
          <p>
            These terms are governed by the laws of the Republic of South
            Africa. The Protection of Personal Information Act (POPIA) applies
            to how we handle personal information.
          </p>
        </div>

        <!-- Emergency reminder -->
        <div class="terms-emergency-reminder">
          <p>
            <strong>In an emergency, call 10111 (SAPS) or 0800 428 428
            (GBV Command Centre).</strong> Do not rely solely on this app.
          </p>
        </div>

      </div>

    </div>
  `;
    root.querySelector('#btn-back').addEventListener('click', () => store.navigateTo('about'));
}
