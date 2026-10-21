import { store } from '../state.js';
import { loadAppearance, saveAppearance, applyAppearance, ACCENT_COLOURS, DISGUISE_OPTIONS, } from '../theme.js';
export function renderAppearance(root) {
    const current = loadAppearance();
    root.innerHTML = `
    <div class="screen appearance-screen">

      <header class="screen-header">
        <button class="btn-back-small" id="btn-back" aria-label="Back">←</button>
        <h2 class="screen-title">Appearance</h2>
      </header>

      <section class="ap-section">
        <h3 class="ap-section-title">Colour mode</h3>
        <div class="ap-mode-group">
          ${[['dark', 'Dark'], ['light', 'Light'], ['auto', 'System']]
        .map(([id, label]) => `
              <label class="ap-mode-btn ${current.mode === id ? 'ap-mode-btn--active' : ''}">
                <input type="radio" name="mode" value="${id}"
                  ${current.mode === id ? 'checked' : ''} />
                ${label}
              </label>
            `).join('')}
        </div>
      </section>

      <section class="ap-section">
        <h3 class="ap-section-title">Accent colour</h3>
        <div class="ap-colour-grid">
          ${ACCENT_COLOURS.map(c => `
            <button
              class="ap-colour-swatch ${current.accentId === c.id ? 'ap-colour-swatch--active' : ''}"
              data-accent="${c.id}"
              style="--swatch-light:${c.hex};--swatch-dark:${c.darkHex}"
              title="${c.label}"
              aria-pressed="${current.accentId === c.id}"
              aria-label="${c.label}${current.accentId === c.id ? ' (selected)' : ''}">
              ${current.accentId === c.id ? '✓' : ''}
            </button>
          `).join('')}
        </div>
        <p class="ap-colour-name" id="ap-colour-name">
          ${ACCENT_COLOURS.find(c => c.id === current.accentId)?.label ?? ''}
        </p>
      </section>

      <section class="ap-section">
        <h3 class="ap-section-title">Photo background</h3>
        <p class="ap-section-body">Use a photo behind app screens. It is resized and stored only on this device.</p>
        <input class="ap-photo-input" id="ap-photo-input" type="file" accept="image/jpeg,image/png,image/webp" aria-label="Choose a background photo" />
        <div class="ap-photo-actions">
          <button class="btn-secondary-outline" id="btn-choose-photo" type="button">Choose photo</button>
          <button class="btn-secondary-outline" id="btn-remove-photo" type="button" ${current.backgroundImage ? '' : 'disabled'}>Remove photo</button>
        </div>
        <p class="ap-colour-name" id="ap-photo-status" aria-live="polite">${current.backgroundImage ? 'A photo is applied.' : 'No photo selected.'}</p>
      </section>

      <section class="ap-section">
        <h3 class="ap-section-title">Disguise screen</h3>
        <p class="ap-section-body">
          Choose what the app looks like before you enter your PIN.
        </p>
        <div class="ap-disguise-grid">
          ${DISGUISE_OPTIONS.map(d => `
            <button
              class="ap-disguise-card ${current.disguise === d.id ? 'ap-disguise-card--active' : ''}"
              data-disguise="${d.id}">
              <span class="ap-disguise-icon">${d.preview}</span>
              <span class="ap-disguise-label">${d.label}</span>
              <span class="ap-disguise-desc">${d.description}</span>
              ${current.disguise === d.id
        ? '<span class="ap-disguise-check">✓ Active</span>'
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
          throw new Error('Choose a JPG, PNG, or WebP image under 12 MB.');
        const bitmap = await createImageBitmap(file);
        const scale = Math.min(1, 1400 / Math.max(bitmap.width, bitmap.height));
        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.round(bitmap.width * scale));
        canvas.height = Math.max(1, Math.round(bitmap.height * scale));
        const context = canvas.getContext('2d');
        if (!context)
          throw new Error('This photo could not be processed.');
        context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
        bitmap.close();
        ap.backgroundImage = canvas.toDataURL('image/jpeg', 0.68);
        saveAppearance(ap);
        applyAppearance(ap);
        removePhotoButton.disabled = false;
        photoStatus.textContent = 'Photo applied on this device.';
      }
      catch (error) {
        photoStatus.textContent = error instanceof Error ? error.message : 'This photo could not be saved.';
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
      photoStatus.textContent = 'No photo selected.';
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
                b.textContent = active ? '✓' : '';
                b.setAttribute('aria-label', ACCENT_COLOURS.find(c => c.id === b.dataset['accent'])?.label ?? '');
                if (active)
                    b.setAttribute('aria-label', b.getAttribute('aria-label') + ' (selected)');
            });
            updateAccentLabel();
        });
    });

        function updateAccentLabel() {
          const accent = ACCENT_COLOURS.find(c => c.id === ap.accentId);
          const mode = document.documentElement.dataset['theme'] === 'dark' ? 'Night' : 'Day';
          colourNameEl.textContent = accent ? `${accent.label} · ${mode} mode` : '';
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
                    badge.textContent = '✓ Active';
                    b.appendChild(badge);
                }
                else if (!active && existing) {
                    existing.remove();
                }
            });
        });
    });
}
