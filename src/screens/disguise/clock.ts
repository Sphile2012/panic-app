import '../../strings/groupC.js';
import { t, getLang } from '../../i18n.js';
import { store } from '../../state.js';
import { formatCountdown, getCountdownSecondsLeft, parseCountdownDuration } from './clockTimer.js';

const LOCALES = { en: 'en-ZA', zu: 'zu-ZA', st: 'st-ZA', af: 'af-ZA' };
let clockInterval: ReturnType<typeof setInterval> | null = null;
let countdownTimer: ReturnType<typeof setInterval> | null = null;
let stopwatchInterval: ReturnType<typeof setInterval> | null = null;

export function disposeClock(): void {
    if (clockInterval !== null) clearInterval(clockInterval);
    if (countdownTimer !== null) clearInterval(countdownTimer);
    if (stopwatchInterval !== null) clearInterval(stopwatchInterval);
    clockInterval = null;
    countdownTimer = null;
    stopwatchInterval = null;
    document.removeEventListener('visibilitychange', updateCountdown);
    countdownDeadline = null;
    countdownDisplay = null;
    countdown = null;
    timerInput = null;
    timerMessage = null;
}

let countdownDeadline: number | null = null;
let countdownDisplay: HTMLElement | null = null;
let countdown: HTMLElement | null = null;
let timerInput: HTMLInputElement | null = null;
let timerMessage: HTMLElement | null = null;

function updateCountdown(): void {
    if (countdownDeadline === null || !countdownDisplay) return;

    const secondsLeft = getCountdownSecondsLeft(countdownDeadline, Date.now());
    countdownDisplay.textContent = formatCountdown(secondsLeft);
    if (secondsLeft > 0) return;

    if (countdownTimer !== null) clearInterval(countdownTimer);
    countdownTimer = null;
    countdownDeadline = null;
    if (timerInput) timerInput.value = '';
    if (timerMessage) {
        timerMessage.textContent = t('c.clock.timerDone');
        timerMessage.classList.remove('clock-timer-message--error');
        timerMessage.hidden = false;
    }
}

export function renderClock(root) {
    disposeClock();
    const locale = LOCALES[getLang()] || 'en-ZA';
    root.innerHTML = `
    <div class="screen clock-screen">
      <div class="clock-tabs">
        <button class="clock-tab clock-tab--active" id="tab-clock">${t('c.clock.clock')}</button>
        <button class="clock-tab" id="tab-timer">${t('c.clock.timer')}</button>
        <button class="clock-tab" id="tab-stopwatch">${t('c.clock.stopwatch')}</button>
      </div>
      <div class="clock-face" id="clock-face">
        <div class="clock-time" id="clock-time">00:00:00</div>
        <div class="clock-date" id="clock-date"></div>
        <div class="clock-tz">Johannesburg · SAST (UTC+2)</div>
      </div>
      <div class="clock-timer-panel" id="timer-panel" style="display:none">
        <p class="clock-timer-hint">${t('c.clock.timerHint')}</p>
        <input class="clock-timer-input" id="timer-input" type="text" inputmode="numeric"
          placeholder="00:00" maxlength="5" aria-label="${t('c.clock.timerDuration')}" autocomplete="off" />
        <div class="clock-timer-actions">
          <button class="clock-timer-btn clock-timer-btn--start" id="timer-start">${t('c.clock.start')}</button>
          <button class="clock-timer-btn clock-timer-btn--cancel" id="timer-cancel">${t('c.clock.cancel')}</button>
        </div>
        <div class="clock-countdown" id="clock-countdown" style="display:none" role="timer" aria-live="off"><span id="countdown-display">00:00</span></div>
        <p class="clock-timer-message" id="timer-message" role="status" aria-live="polite" hidden></p>
      </div>
      <div class="clock-stopwatch-panel" id="stopwatch-panel" style="display:none">
        <div class="clock-time" id="sw-display">00:00.00</div>
        <div class="clock-sw-actions">
          <button class="clock-timer-btn clock-timer-btn--start" id="sw-start">${t('c.clock.start')}</button>
          <button class="clock-timer-btn clock-timer-btn--cancel" id="sw-lap">${t('c.clock.lap')}</button>
        </div>
      </div>
    </div>`;
    const clockDisplay = root.querySelector('#clock-time');
    const dateDisplay = root.querySelector('#clock-date');
    function updateClock() {
        const now = new Date();
        const hh = now.getHours().toString().padStart(2, '0');
        const mm = now.getMinutes().toString().padStart(2, '0');
        const ss = now.getSeconds().toString().padStart(2, '0');
        clockDisplay.textContent = `${hh}:${mm}:${ss}`;
        try {
            dateDisplay.textContent = now.toLocaleDateString(locale, {
                weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
            });
        }
        catch {
            dateDisplay.textContent = now.toLocaleDateString('en-ZA', {
                weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
            });
        }
    }
    updateClock();
    clockInterval = setInterval(updateClock, 1000);
    const clockFace = root.querySelector('#clock-face');
    const timerPanel = root.querySelector('#timer-panel');
    const stopwatchPanel = root.querySelector('#stopwatch-panel');
    function showTab(tab) {
        clockFace.style.display = tab === 'clock' ? 'flex' : 'none';
        timerPanel.style.display = tab === 'timer' ? 'flex' : 'none';
        stopwatchPanel.style.display = tab === 'stopwatch' ? 'flex' : 'none';
        root.querySelectorAll('.clock-tab').forEach(button => button.classList.remove('clock-tab--active'));
        root.querySelector(`#tab-${tab}`).classList.add('clock-tab--active');
    }
    root.querySelector('#tab-clock').addEventListener('click', () => showTab('clock'));
    root.querySelector('#tab-timer').addEventListener('click', () => showTab('timer'));
    root.querySelector('#tab-stopwatch').addEventListener('click', () => showTab('stopwatch'));
    timerInput = root.querySelector('#timer-input');
    countdown = root.querySelector('#clock-countdown');
    countdownDisplay = root.querySelector('#countdown-display');
    timerMessage = root.querySelector('#timer-message');
    timerInput.addEventListener('input', () => {
        let digits = timerInput.value.replace(/\D/g, '').slice(0, 4);
        if (digits.length > 2)
            digits = digits.slice(0, 2) + ':' + digits.slice(2);
        timerInput.value = digits;
    });
    let pinEvaluationPending = false;
    root.querySelector('#timer-start').addEventListener('click', async () => {
        if (pinEvaluationPending) return;
        const raw = timerInput.value.replace(/\D/g, '');
        timerMessage.hidden = true;
        if (raw.length !== 4) {
            timerMessage.textContent = t('c.clock.timerInvalid');
            timerMessage.classList.add('clock-timer-message--error');
            timerMessage.hidden = false;
            return;
        }
        pinEvaluationPending = true;
        try {
            store.clearPin();
            for (const d of raw)
                store.appendPin(d);
            const route = await store.evaluatePin();
            if (route || store.getState().screen !== 'calculator') return;
            store.clearPin();
            const durationSeconds = parseCountdownDuration(timerInput.value);
            if (durationSeconds === null) {
                timerMessage.textContent = t('c.clock.timerInvalid');
                timerMessage.classList.add('clock-timer-message--error');
                timerMessage.hidden = false;
                return;
            }
            if (countdownTimer !== null) clearInterval(countdownTimer);
            countdownDeadline = Date.now() + durationSeconds * 1000;
            countdown.style.display = 'flex';
            timerMessage.hidden = true;
            timerMessage.classList.remove('clock-timer-message--error');
            updateCountdown();
            if (countdownDeadline !== null) countdownTimer = setInterval(updateCountdown, 250);
        } finally {
            pinEvaluationPending = false;
        }
    });
    root.querySelector('#timer-cancel').addEventListener('click', () => {
        if (countdownTimer !== null) {
            clearInterval(countdownTimer);
            countdownTimer = null;
        }
        countdownDeadline = null;
        countdown.style.display = 'none';
        timerInput.value = '';
        timerMessage.hidden = true;
        timerMessage.classList.remove('clock-timer-message--error');
        store.clearPin();
    });
    document.addEventListener('visibilitychange', updateCountdown);
    const swDisplay = root.querySelector('#sw-display');
    const swStart = root.querySelector('#sw-start');
    let swRunning = false;
    let swMs = 0;
    swStart.addEventListener('click', e => {
        swRunning = !swRunning;
        swStart.textContent = swRunning ? t('c.clock.stop') : t('c.clock.start');
        if (swRunning) {
            stopwatchInterval = setInterval(() => {
                swMs += 10;
                const mins = Math.floor(swMs / 60000);
                const secs = Math.floor((swMs % 60000) / 1000);
                const hundredths = Math.floor((swMs % 1000) / 10);
                swDisplay.textContent = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${hundredths.toString().padStart(2, '0')}`;
            }, 10);
        }
        else if (stopwatchInterval !== null) {
            clearInterval(stopwatchInterval);
            stopwatchInterval = null;
        }
    });
}
