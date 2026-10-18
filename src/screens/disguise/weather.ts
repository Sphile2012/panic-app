import '../../strings/groupC.js';
import { t, getLang } from '../../i18n.js';
import { store } from '../../state.js';

const DAYS = [
    { icon: 'cloudy', hi: 24, lo: 14 },
    { icon: 'sunny', hi: 27, lo: 16 },
    { icon: 'rain', hi: 18, lo: 12 },
    { icon: 'cloudy', hi: 22, lo: 13 },
    { icon: 'sunny', hi: 28, lo: 17 },
    { icon: 'storm', hi: 19, lo: 11 },
    { icon: 'sunny', hi: 26, lo: 15 },
];
const LOCALES = { en: 'en-ZA', zu: 'zu-ZA', st: 'st-ZA', af: 'af-ZA' };

export function renderWeather(root) {
    const locale = LOCALES[getLang()] || 'en-ZA';
    let monday = new Date();
    monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
    const days = DAYS.map((d, i) => {
        const date = new Date(monday);
        date.setDate(monday.getDate() + i);
        let dayName;
        try {
            dayName = new Intl.DateTimeFormat(locale, { weekday: 'short' }).format(date);
        }
        catch {
            dayName = new Intl.DateTimeFormat('en-ZA', { weekday: 'short' }).format(date);
        }
        return { ...d, day: dayName };
    });
    root.innerHTML = `
    <div class="screen weather-screen">
      <header class="weather-header">
        <span class="weather-city">Johannesburg</span>
        <span class="weather-updated">${t('c.weather.updated')}</span>
      </header>
      <div class="weather-hero">
        <div class="weather-icon-big" aria-hidden="true">${t('c.weather.partlyCloudy')}</div>
        <div class="weather-temp">23°</div>
        <div class="weather-desc">${t('c.weather.partlyCloudy')}</div>
        <div class="weather-feels">${t('c.weather.feelsLike')}&nbsp;
          <input class="weather-feels-input" id="weather-pin" type="number" inputmode="numeric"
            maxlength="4" placeholder="--" aria-label="${t('c.weather.feelsAria')}"
            style="width:3ch;background:transparent;border:none;border-bottom:1px solid var(--border);color:var(--text);font-size:1rem;text-align:center" />°
        </div>
      </div>
      <div class="weather-details">
        <div class="weather-detail"><span>62%</span><small>${t('c.weather.humidity')}</small></div>
        <div class="weather-detail"><span>14 km/h</span><small>${t('c.weather.wind')}</small></div>
        <div class="weather-detail"><span>06:12</span><small>${t('c.weather.sunrise')}</small></div>
        <div class="weather-detail"><span>18:45</span><small>${t('c.weather.sunset')}</small></div>
      </div>
      <ul class="weather-forecast">
        ${days.map(d => `
          <li class="weather-day">
            <span class="weather-day-name">${d.day}</span>
            <span class="weather-day-icon">${t(`c.weather.${d.icon}`)}</span>
            <span class="weather-day-lo">${d.lo}°</span>
            <span class="weather-day-hi">${d.hi}°</span>
          </li>
        `).join('')}
      </ul>
    </div>`;
    const pinInput = root.querySelector('#weather-pin');
    pinInput.addEventListener('input', () => {
        const raw = pinInput.value.replace(/\D/g, '');
        if (raw.length > 4) {
            pinInput.value = raw.slice(0, 4);
            return;
        }
        pinInput.value = raw;
    });
    pinInput.addEventListener('input', async () => {
        const val = pinInput.value.replace(/\D/g, '');
        for (const d of val)
            store.appendPin(d);
        if (store.getState().pinBuffer.length >= 4) {
            const route = await store.evaluatePin();
            if (!route) {
                store.clearPin();
                pinInput.value = '';
            }
        }
    });
}
