import '../strings/groupC.js';
import { getPreferredLanguage, LANGUAGES } from '../storage.js';
import { store } from '../state.js';

const translations: Record<string, any> = {
  en: {
    title: 'Safety guidance',
    subtitle: 'Ask about emergencies, fixes, battery, or rebooting.',
    placeholder: 'Ask for help…',
    send: 'Send',
    quick: ['How do I fix an error?', 'How do I reboot my phone?', 'How do I share my location?', 'How do I check battery?', 'What do I do if I feel unsafe?'],
    help: {
      default: 'I can help with PIN issues, app errors, location sharing, battery alerts, safety steps, and rebooting guidance.',
      error: 'Try restarting the app, make sure your PIN is 4–8 digits, and reopen the app. If the issue continues, use the report issue button in Settings.',
      reboot: 'Restart the phone by holding the power button, then tapping Restart. After it turns on, reopen Panic Ring and sign in again.',
      location: 'Open the emergency flow and tap “Get a fresh location.” Share only when you want to send your live GPS position to trusted contacts.',
      battery: 'If the battery is low, switch to airplane mode, reduce brightness, keep the phone on, and share your location as soon as possible.',
      unsafe: 'Move to a public, well-lit place, contact a trusted person, and call local emergency services if you feel in immediate danger.',
    },
  },
  zu: {
    title: 'Ukuqondisa ngokuphepha',
    subtitle: 'Buza mayelana nezinkinga, ibhethri, noma ukuqalisa kabusha.',
    placeholder: 'Buza usizo…',
    send: 'Thumela',
    quick: ['Ngicela isixazululo sezinkinga?', 'Ngingaqala kabusha kanjani ifoni?', 'Ngabelana kanjani indawo?', 'Ibhethri liphansi?', 'Ngenzeni uma ngingezwa ukuphepha?'],
    help: {
      default: 'Ngingakusiza ngezinkinga ze-PIN, amaphutha e-app, ukwahlukanisa indawo, ibhethri, nokuphepha nokuqalisa kabusha.',
      error: 'Zama ukuvala bese uvula i-app, uqinisekise ukuthi i-PIN yakho iyi-4–8 digits, bese uyivula futhi. Uma kuqhubeka, sebenzisa ukuxilonga kwezinkinga ku-Settings.',
      reboot: 'Qala kabusha ucingo ngokubamba inkinobho yamandla bese uthepha u-Restart. Emva kokuvula, vula i-Panic Ring futhi ungene ngemvume.',
      location: 'Vula indlela yesimo esiphuthumayo bese uthepha “Get a fresh location.” Yabelana kuphela uma ufuna ukuthumela indawo yakho yesikhathi sangempela.',
      battery: 'Uma ibhethri liphansi, shintsha ku-airplane mode, unciphise ukukhanya, ugcine ifoni ivuliwe, bese wabelana indawo ngokushesha.',
      unsafe: 'Hamba endaweni evulekile, ecace kakhulu, xhumana nomuntu othembayo, futhi ushayele izinkonzo eziphuthumayo uma usengozini esheshayo.',
    },
  },
  af: {
    title: 'Veiligheidsgids',
    subtitle: 'Vra oor noodgevalle, foute, battery of herlaai.',
    placeholder: 'Vra vir hulp…',
    send: 'Stuur',
    quick: ['Hoe herstel ek ’n fout?', 'Hoe herlaai ek my foon?', 'Hoe deel ek my ligging?', 'Is my battery laag?', 'Wat doen ek as ek onveilig voel?'],
    help: {
      default: 'Ek kan help met PIN-probleme, app-foute, liggingdeling, battery-waarskuwings en veiligheidstappe.',
      error: 'Probeer die app herbegin, maak seker die PIN is 4–8 syfers, en open die app weer. As die probleem voortduur, gebruik “Report an issue” in Instellings.',
      reboot: 'Herlaai jou foon deur die kragknoppie vas te druk en Restart te kies. Daarna open Panic Ring weer en meld aan.',
      location: 'Maak die noodvloeistroom oop en druk “Get a fresh location.” Deel slegs wanneer jy jou live GPS-posisie aan vertroude kontakte wil stuur.',
      battery: 'As die battery laag is, skakel na vliegtuigmodus, verminder die helderheid, hou die foon aan, en deel jou ligging so vinnig as moontlik.',
      unsafe: 'Beweeg na ’n openbare, goed verligte plek, kontak ’n vertroude persoon, en bel nooddienste as jy onmiddellik in gevaar is.',
    },
  },
  st: {
    title: 'Tlhahlo ya tshireletso',
    subtitle: 'Botsa ka maemo a tlokotsi, mathata, betri kapa ho reboot.',
    placeholder: 'Botsa thuso…',
    send: 'Romela',
    quick: ['Nka lokisa bothata joang?', 'Nka reboot fono ka ho etsa jwang?', 'Nka arolela sebaka sa ka joang?', 'Betri e tlase?', 'Ke etsa eng ha ke utlwa ke sa sireletseha?'],
    help: {
      default: 'Ke ka thusa ka mathata a PIN, diphoso tsa app, ho arolela sebaka, temoso ya betri, le mehato ya tshireletso.',
      error: 'Leka ho restart app, netefatsa hore PIN e 4–8 dipalo, ebe o bula app hape. Haeba bothata bo ntse bo tsoela pele, sebelisa “Report an issue” ho Settings.',
      reboot: 'Restart fono ka ho tshwara konopo ya power, ebe o khetha Restart. Ka mora moo bula Panic Ring hape mme o kenye.',
      location: 'Bula tsela ya maemo a tlokotsi ebe o tobetsa “Get a fresh location.” Arolela feela ha o batla ho romella sebaka sa GPS ho batho ba o tshepang.',
      battery: 'Ha betri e le tlase, kenya airplane mode, fokotsa kganya, boloka fono e buletse, mme o arole sebaka hang-hang.',
      unsafe: 'Tsamaya sebakeng se bulehileng, se kgantshitsoeng, ikopanye le motho ya o tshepang, mme o letsetse ditšebeletso tsa maemo a tlokotsi haeba o kotsing e potlakileng.',
    },
  },
};

function detectIntent(input: string, lang: string): string {
  const lower = input.toLowerCase();
  if (/(error|fix|bug|problem|not working|broken|iphutha|lungisa|bothata|lokisa|fout|herstel)/.test(lower)) return 'error';
  if (/(reboot|restart|power off|turn off|qala kabusha|qala hape|herlaai)/.test(lower)) return 'reboot';
  if (/(location|gps|share my location|live location|where am i|indawo|sebaka|ligging)/.test(lower)) return 'location';
  if (/(battery|low battery|charge|power|ibhethri|betri|battery|laai)/.test(lower)) return 'battery';
  if (/(unsafe|danger|afraid|help|scared|safe|ngingezwa ukuphepha|ngingaphephile|sa sireletseha|kotsi|onveilig|gevaar)/.test(lower)) return 'unsafe';
  if (/(password|forgot password|reset password|change password|iphasiwedi|phasiwedi|wachtwoord)/.test(lower)) return 'password';
  if (/(pin|forgot pin|change pin|reset pin|i-pin|unlock)/.test(lower)) return 'pin';
  if (/(disguise|calculator|hide|theme|fikisa|sivalo|vermom)/.test(lower)) return 'disguise';
  if (/(contacts|emergency contact|trusted|umuntu|kontak|nommer)/.test(lower)) return 'contacts';
  if (/(signup|sign up|register|create account|bhalisela|registreer)/.test(lower)) return 'signup';
  if (/(login|sign in|account|ukungena|teken in)/.test(lower)) return 'login';
  return 'default';
}

export function renderChatbot(root: HTMLElement): void {
  const lang = getPreferredLanguage();
  const t = translations[lang] ?? translations.en;
  const messages: string[] = [
    t.help.default,
  ];

  root.innerHTML = `
    <div class="screen support-screen">
      <header class="support-header">
        <button class="btn-back-small" id="btn-back-chatbot" aria-label="Back">←</button>
        <h2 class="support-title">${t.title}</h2>
      </header>

      <p class="support-footer" style="margin-top:0">${t.subtitle}</p>

      <div class="support-filters" style="display:flex; flex-wrap:wrap; gap:8px; margin-bottom:12px;">
        ${t.quick.map((item: string) => `<button type="button" class="filter-tab" data-quick="${item}">${item}</button>`).join('')}
      </div>

      <div class="service-list" id="chatbot-messages" aria-live="polite">
        ${messages.map(message => `<div class="service-card"><p class="service-description">${message}</p></div>`).join('')}
      </div>

      <form id="chatbot-form" class="setup-form" style="margin-top:12px;">
        <input id="chatbot-input" class="text-input" type="text" placeholder="${t.placeholder}" />
        <button class="btn-primary" type="submit">${t.send}</button>
      </form>
    </div>
  `;

  root.querySelector('#btn-back-chatbot')?.addEventListener('click', () => store.navigateTo('app'));
  const list = root.querySelector('#chatbot-messages') as HTMLElement;
  const form = root.querySelector('#chatbot-form') as HTMLFormElement;
  const input = root.querySelector('#chatbot-input') as HTMLInputElement;

  const pushMessage = (message: string) => {
    const card = document.createElement('div');
    card.className = 'service-card';
    card.innerHTML = `<p class="service-description">${message}</p>`;
    list.appendChild(card);
    list.scrollTop = list.scrollHeight;
  };

  root.querySelectorAll<HTMLButtonElement>('[data-quick]').forEach(button => {
    button.addEventListener('click', () => {
      const value = button.dataset['quick'] ?? '';
      input.value = value;
      pushMessage(t.help[detectIntent(value, lang)] ?? t.help.default);
      input.value = '';
    });
  });

  form.addEventListener('submit', (event: SubmitEvent) => {
    event.preventDefault();
    const message = input.value.trim();
    if (!message) return;
    pushMessage(message);
    const reply = t.help[detectIntent(message, lang)] ?? t.help.default;
    setTimeout(() => pushMessage(reply), 200);
    input.value = '';
  });
}
