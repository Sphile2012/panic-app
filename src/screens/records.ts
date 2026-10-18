import { store } from '../state.js';
import { listPhotos, deletePhoto, type EvidencePhoto } from '../evidence.js';

function fmt(ts: number): string {
    return new Date(ts).toLocaleString();
}

async function shareFiles(photos: EvidencePhoto[]): Promise<string> {
    const files = photos.map((p, i) => new File([p.blob], `record-${i + 1}.jpg`, { type: 'image/jpeg' }));
    const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean };
    if (nav.canShare?.({ files }) && nav.share) {
        try {
            await nav.share({ files, text: 'Panic Ring records' });
            return 'Choose WhatsApp in the share sheet to send.';
        }
        catch {
            return 'Sharing was cancelled.';
        }
    }
    window.open('https://wa.me/?text=' + encodeURIComponent('Panic Ring records. Photos are saved on my phone.'), '_blank');
    return 'This device cannot attach photos from the browser. Download them and attach in WhatsApp.';
}

export async function renderRecords(root: HTMLElement) {
    root.innerHTML = `
    <div class="screen">
      <header class="screen-header">
        <button class="btn-back-small" id="btn-back" aria-label="Back">Back</button>
        <h2 class="screen-title">Records</h2>
      </header>
      <p class="setup-hint">Photos taken during alerts are stored on this device only.</p>
      <div id="rec-actions"></div>
      <p class="setup-hint" id="rec-msg" aria-live="polite"></p>
      <div class="rec-grid" id="rec-grid"></div>
    </div>`;
    root.querySelector('#btn-back')!.addEventListener('click', () => store.navigateTo('app'));
    const grid = root.querySelector('#rec-grid') as HTMLElement;
    const msg = root.querySelector('#rec-msg') as HTMLElement;
    const actions = root.querySelector('#rec-actions') as HTMLElement;

    const paint = async () => {
        const photos = await listPhotos();
        grid.innerHTML = '';
        actions.innerHTML = photos.length
            ? '<button class="btn-primary" id="rec-share-all" type="button">Send all via WhatsApp</button>'
            : '';
        if (!photos.length) {
            grid.innerHTML = '<p class="setup-hint">No records yet. Turn on alert photos in Settings.</p>';
            return;
        }
        actions.querySelector('#rec-share-all')!.addEventListener('click', async () => {
            msg.textContent = await shareFiles(photos);
        });
        photos.forEach((p) => {
            const url = URL.createObjectURL(p.blob);
            const card = document.createElement('div');
            card.className = 'rec-card';
            card.innerHTML = `<img src="${url}" alt="" /><span>${fmt(p.at)}</span>
              <div><button type="button" class="btn-secondary-outline rec-s">Send</button>
              <button type="button" class="btn-secondary rec-d">Delete</button></div>`;
            card.querySelector('.rec-s')!.addEventListener('click', async () => {
                msg.textContent = await shareFiles([p]);
            });
            card.querySelector('.rec-d')!.addEventListener('click', async () => {
                if (p.id !== undefined)
                    await deletePhoto(p.id);
                URL.revokeObjectURL(url);
                await paint();
            });
            grid.appendChild(card);
        });
    };
    await paint();
}
