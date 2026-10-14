import { store } from '../../state.js';
const DAYS = [
    { day: 'Mon', icon: 'Cloudy', hi: 24, lo: 14 },
    { day: 'Tue', icon: 'Sunny', hi: 27, lo: 16 },
    { day: 'Wed', icon: 'Rain', hi: 18, lo: 12 },
    { day: 'Thu', icon: 'Cloudy', hi: 22, lo: 13 },
    { day: 'Fri', icon: 'Sunny', hi: 28, lo: 17 },
    { day: 'Sat', icon: 'Storm', hi: 19, lo: 11 },
    { day: 'Sun', icon: 'Sunny', hi: 26, lo: 15 },
];
export function renderWeather(root) {
    root.innerHTML = `
    <div class="screen weather-screen">

      <header class="weather-header">
        <span class="weather-city">Johannesburg</span>
        <span class="weather-updated">Updated just now</span>
      </header>

      <div class="weather-hero">
        <div class="weather-icon-big" aria-hidden="true">Partly cloudy</div>
        <div class="weather-temp">23°</div>
        <div class="weather-desc">Partly cloudy</div>
        <div class="weather-feels">
          Feels like&nbsp;
          <input
            class="weather-feels-input"
            id="weather-pin"
            type="number"
            inputmode="numeric"
            maxlength="4"
            placeholder="--"
            aria-label="Feels like temperature"
            style="width:3ch;background:transparent;border:none;border-bottom:1px solid var(--border);color:var(--text);font-size:1rem;text-align:center"
          />°
        </div>
      </div>

      <div class="weather-details">
        <div class="weather-detail"><span>62%</span><small>Humidity</small></div>
        <div class="weather-detail"><span>14 km/h</span><small>Wind</small></div>
        <div class="weather-detail"><span>06:12</span><small>Sunrise</small></div>
        <div class="weather-detail"><span>18:45</span><small>Sunset</small></div>
      </div>

      <ul class="weather-forecast">
        ${DAYS.map(d => `
          <li class="weather-day">
            <span class="weather-day-name">${d.day}</span>
            <span class="weather-day-icon">${d.icon}</span>
            <span class="weather-day-lo">${d.lo}°</span>
            <span class="weather-day-hi">${d.hi}°</span>
          </li>
        `).join('')}
      </ul>

    </div>
  `;
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
