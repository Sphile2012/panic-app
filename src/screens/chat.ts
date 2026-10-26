import { store } from '../state.js';
import { t, getLang } from '../i18n.js';
import { answer } from '../chatKnowledge.js';
export { answer };

type Msg = { from: 'me' | 'bot'; text: string };

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
        <button class="btn-back-small" id="btn-back" aria-label="Back">←</button>
        <div>
          <h2 class="screen-title">${esc(t('chat.title'))}</h2>
          <p class="chat-sub">${esc(t('chat.sub'))}</p>
        </div>
      </header>
      <div class="chat-log" id="chat-log" aria-live="polite">
        ${history.map(m => `<div class="chat-msg chat-msg--${m.from}">${esc(m.text)}</div>`).join('')}
      </div>
      <form class="chat-form" id="chat-form" autocomplete="off">
        <textarea class="text-input chat-input" id="chat-input" rows="2" maxlength="200" aria-label="${esc(t('chat.placeholder'))}" placeholder="${esc(t('chat.placeholder'))}"></textarea>
        <button class="btn-primary chat-send" type="submit">${esc(t('chat.send'))}</button>
      </form>
    </div>`;

    const log = root.querySelector('#chat-log') as HTMLElement;
    log.scrollTop = log.scrollHeight;
    root.querySelector('#btn-back')!.addEventListener('click', () => store.navigateTo('app'));
    const input = root.querySelector('#chat-input') as HTMLTextAreaElement;
    input.addEventListener('input', () => {
        input.style.height = 'auto';
        input.style.height = `${Math.min(input.scrollHeight, 120)}px`;
    });
    root.querySelector('#chat-form')!.addEventListener('submit', (e) => {
        e.preventDefault();
        const text = input.value.trim();
        if (!text) return;
        history.push({ from: 'me', text });
        history.push({ from: 'bot', text: answer(text) });
        renderChat(root);
        (root.querySelector('#chat-input') as HTMLTextAreaElement).focus();
    });
}
