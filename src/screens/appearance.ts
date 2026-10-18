import '../strings/groupA.js';
import { store } from '../state.js';
import { t } from '../i18n.js';
import { loadAppearance, saveAppearance, applyAppearance, ACCENT_COLOURS, DISGUISE_OPTIONS, disguiseLabel, disguiseDescription, } from '../theme.js';
const accentLabel = (id: string) => t('a.ap.accent.' + id);
export function renderAppearance(root) {
    const current = loadAppearance();
    root.innerHTML = `
    <div class="screen appearance-screen">

      <header class="screen-header">
        <button class="btn-back-small" id="btn-back" aria-label="${t('common.back')}">${t('common.back')}</button>
        <h2 class="screen-title">${t('a.set.appearance')}</h2>
      </header>

      <!-- ── Colour mode ─────────────────────────────────────────────────── -->
      <section class="ap-section">
        <h3 class="ap-section-title">${t('a.ap.colourmode')}</h3>
        <div class="ap-mode-group">
          ${[['dark', t('a.app.dark')], ['light', t('a.app.light')], ['auto', t('a.ap.system')]]
        .map(([id, label]) => `
              <label class="ap-mode-btn ${current.mode === id ? 'ap-mode-btn--active' : ''}">
                <input type="radio" name="mode" value="${id}"
                  ${current.mode === id ? 'checked' : ''} />
                ${label}
              </label>
            `).join('')}
        </div>
      </section>

      <!-- ── Accent colour ───────────────────────────────────────────────── -->
      <section class="ap-section">
        <h3 class="ap-section-title">${t('a.ap.accent')}</h3>
        <div class="ap-colour-grid">
          ${ACCENT_COLOURS.map(c => `
            <button
              class="ap-colour-swatch ${current.accentId === c.id ? 'ap-colour-swatch--active' : ''}"
              data-accent="${c.id}"
              style="--swatch-light:${c.hex};--swatch-dark:${c.darkHex}"
              title="${accentLabel(c.id)}"
              aria-pressed="${current.accentId === c.id}"
              aria-label="${accentLabel(c.id)}${current.accentId === c.id ? ' (' + t('a.ap.selected') + ')' : ''}">
              ${current.accentId === c.id ? '&bull;' : ''}
            </button>
          `).join('')}
        </div>
        <p class="ap-colour-name" id="ap-colour-name">
          ${current.accentId ? accentLabel(current.accentId) : ''}
        </p>
      </section>

      <section class="ap-section">
        <h3 class="ap-section-title">${t('a.ap.photobg')}</h3>
        <p class="ap-section-body">${t('a.ap.photobody')}</p>
        <input class="ap-photo-input" id="ap-photo-input" type="file" accept="image/jpeg,image/png,image/webp" aria-label="${t('a.ap.choosearia')}" />
        <div class="ap-photo-actions">
          <button class="btn-secondary-outline" id="btn-choose-photo" type="button">${t('a.ap.choose')}</button>
          <button class="btn-secondary-outline" id="btn-remove-photo" type="button" ${current.backgroundImage ? '' : 'disabled'}>${t('prof.remove')}</button>
        </div>
        <p class="ap-colour-name" id="ap-photo-status" aria-live="polite">${current.backgroundImage ? t('a.ap.applied') : t('a.ap.nophoto')}</p>
      </section>

      <!-- ── Disguise screen ─────────────────────────────────────────────── -->
      <section class="ap-section">
        <h3 class="ap-section-title">${t('a.ap.disguise')}</h3>
        <p class="ap-section-body">
          ${t('a.ap.disguisebody')}
        </p>
        <div class="ap-disguise-grid">
          ${DISGUISE_OPTIONS.map(d => `
            <button
              class="ap-disguise-card ${current.disguise === d.id ? 'ap-disguise-card--active' : ''}"
              data-disguise="${d.id}">
              <span class="ap-disguise-icon">${d.preview}</span>
              <span class="ap-disguise-label">${disguiseLabel(d.id)}</span>
              <span class="ap-disguise-desc">${disguiseDescription(d.id)}</span>
              ${current.disguise === d.id
        ? `<span class="ap-disguise-check">${t('a.app.active')}</span>`
        : ''}
            </button>
          `).join('')}
        </div>
      </section>

    </div>
  `;
    const ap = loadAppearance();
    const photoInput = root.querySelector('#ap-photo-input') as HTMLInputElement;
    const photoStatus = root.querySelector('#ap-photo-status') as HTMLElement;
    const removePhotoButton = root.querySelector('#btn-remove-photo') as HTMLButtonElement;
    root.querySelector('#btn-back').addEventListener('click', () => {
        store.navigateTo('settings');
    });
    root.querySelector('#btn-choose-photo').addEventListener('click', () => photoInput.click());
    photoInput.addEventListener('change', async () => {
      const file = photoInput.files?.[0];
      if (!file)
        return;
      try {
        if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 12 * 1024 * 1024)
          throw new Error(t('a.ap.err.type'));
        const bitmap = await createImageBitmap(file);
        const scale = Math.min(1, 1400 / Math.max(bitmap.width, bitmap.height));
        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.round(bitmap.width * scale));
        canvas.height = Math.max(1, Math.round(bitmap.height * scale));
        const context = canvas.getContext('2d');
        if (!context)
          throw new Error(t('a.ap.err.proc'));
        context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
        bitmap.close();
        ap.backgroundImage = canvas.toDataURL('image/jpeg', 0.68);
        saveAppearance(ap);
        applyAppearance(ap);
        removePhotoButton.disabled = false;
        photoStatus.textContent = t('a.ap.saved');
      }
      catch (error) {
        photoStatus.textContent = error instanceof Error ? error.message : t('a.ap.err.save');
      }
      finally {
        photoInput.value = '';
      }
    });
    removePhotoButton.addEventListener('click', () => {
      ap.backgroundImage = '';
      saveAppearance(ap);
      applyAppearance(ap);
      removePhotoButton.disabled = true;
      photoStatus.textContent = t('a.ap.nophoto');
    });
    root.querySelectorAll('input[name="mode"]').forEach(radio => {
        radio.addEventListener('change', () => {
            ap.mode = radio.value;
            saveAppearance(ap);
            applyAppearance(ap);
            root.querySelectorAll('.ap-mode-btn').forEach(btn => {
                btn.classList.toggle('ap-mode-btn--active', btn.querySelector('input').value === ap.mode);
            });
            updateAccentLabel();
        });
    });
    const colourNameEl = root.querySelector('#ap-colour-name');
    root.querySelectorAll('[data-accent]').forEach(btn => {
        btn.addEventListener('click', () => {
            ap.accentId = btn.dataset['accent'];
            saveAppearance(ap);
            applyAppearance(ap);
            root.querySelectorAll('[data-accent]').forEach(b => {
                const active = b.dataset['accent'] === ap.accentId;
                b.classList.toggle('ap-colour-swatch--active', active);
                b.setAttribute('aria-pressed', String(active));
                b.textContent = active ? '\u2022' : '';
                b.setAttribute('aria-label', accentLabel(b.dataset['accent']));
                if (active)
                    b.setAttribute('aria-label', b.getAttribute('aria-label') + ' (' + t('a.ap.selected') + ')');
            });
            updateAccentLabel();
        });
    });

        function updateAccentLabel() {
          const accent = ACCENT_COLOURS.find(c => c.id === ap.accentId);
          const mode = document.documentElement.dataset['theme'] === 'dark' ? t('a.ap.night') : t('a.ap.day');
          colourNameEl.textContent = accent ? t('a.ap.modeline', { accent: accentLabel(accent.id), mode }) : '';
        }

        updateAccentLabel();

    root.querySelectorAll('[data-disguise]').forEach(btn => {
        btn.addEventListener('click', () => {
            ap.disguise = btn.dataset['disguise'];
            saveAppearance(ap);
            root.querySelectorAll('[data-disguise]').forEach(b => {
                const active = b.dataset['disguise'] === ap.disguise;
                b.classList.toggle('ap-disguise-card--active', active);
                const existing = b.querySelector('.ap-disguise-check');
                if (active && !existing) {
                    const badge = document.createElement('span');
                    badge.className = 'ap-disguise-check';
                    badge.textContent = t('a.app.active');
                    b.appendChild(badge);
                }
                else if (!active && existing) {
                    existing.remove();
                }
            });
        });
    });
}
