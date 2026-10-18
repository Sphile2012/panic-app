import { store } from '../state.js';
import { t, getLang } from '../i18n.js';

type Msg = { from: 'me' | 'bot'; text: string };

const RULES: Array<{ key: string; words: string[] }> = [
    { key: 'chat.emergency', words: ['danger', 'help me', 'emergency', 'police', 'unsafe', 'ngozini', 'tsietsing', 'gevaar', 'noodgeval', 'ukuphepha'] },
    { key: 'chat.pin', words: ['pin', 'password', 'code', 'unlock', 'iphinikhodi', 'pine', 'wagwoord', 'kode'] },
    { key: 'chat.contacts', words: ['contact', 'trusted', 'circle', 'beneficiary', 'oxhumana', 'batho', 'kontak', 'bangoa', 'begunstigde'] },
    { key: 'chat.alert', words: ['alert', 'panic', 'hold', 'button', 'sms', 'isexwayiso', 'tsebiso', 'waarskuwing', 'knoppie', 'inkinobho'] },
    { key: 'chat.battery', words: ['battery', 'charge', 'power', 'ibhethri', 'betri', 'battery'] },
    { key: 'chat.location', words: ['location', 'gps', 'live', 'track', 'where', 'indawo', 'sebaka', 'ligging', 'bukhoma', 'hehle', 'regstreeks'] },
    { key: 'chat.language', words: ['language', 'zulu', 'sesotho', 'afrikaans', 'english', 'ulimi', 'puo', 'taal'] },
    { key: 'chat.install', words: ['install', 'home screen', 'download', 'faka', 'kenya', 'installeer'] },
    { key: 'chat.hello', words: ['hello', 'hi', 'hey', 'sawubona', 'dumela', 'hallo', 'goeie'] },
];

export function answer(question: string): string {
    const q = question.toLowerCase();
    for (const r of RULES) {
        if (r.words.some(w => new RegExp(`(^|[^a-z])${w}`).test(q))) return t(r.key);
    }
    return t('chat.fallback');
}

let history: Msg[] = [];
let historyLang = '';

function esc(s: string): string {
    return s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c] as string));
}

export function renderChat(root: HTMLElement) {
    if (historyLang !== getLang()) {
        history = [{ from: 'bot', text: t('chat.hello') }];
        historyLang = getLang();
    }

    root.innerHTML = `
    <div class="screen chat-screen">
      <header class="screen-header">
        <button class="btn-back-small" id="btn-back" aria-label="Back">Back</button>
        <div>
          <h2 class="screen-title">${esc(t('chat.title'))}</h2>
          <p class="chat-sub">${esc(t('chat.sub'))}</p>
        </div>
      </header>
      <div class="chat-log" id="chat-log" aria-live="polite">
        ${history.map(m => `<div class="chat-msg chat-msg--${m.from}">${esc(m.text)}</div>`).join('')}
      </div>
      <form class="chat-form" id="chat-form" autocomplete="off">
        <input class="text-input" id="chat-input" type="text" maxlength="200" placeholder="${esc(t('chat.placeholder'))}" />
        <button class="btn-primary chat-send" type="submit">${esc(t('chat.send'))}</button>
      </form>
    </div>`;

    const log = root.querySelector('#chat-log') as HTMLElement;
    log.scrollTop = log.scrollHeight;
    root.querySelector('#btn-back')!.addEventListener('click', () => store.navigateTo('app'));
    root.querySelector('#chat-form')!.addEventListener('submit', (e) => {
        e.preventDefault();
        const input = root.querySelector('#chat-input') as HTMLInputElement;
        const text = input.value.trim();
        if (!text) return;
        history.push({ from: 'me', text });
        history.push({ from: 'bot', text: answer(text) });
        renderChat(root);
        (root.querySelector('#chat-input') as HTMLInputElement).focus();
    });
}
