import { store } from '../state.js';
import { exportNotes } from '../export.js';
import { formatNoteTimestamp } from '../storage.js';
export function renderNotes(root) {
    const { notes } = store.getState();
    root.innerHTML = `
    <div class="screen notes-screen">

      <header class="screen-header">
        <button class="btn-back-small" id="btn-back" aria-label="Back">←</button>
        <h2 class="screen-title">Notes</h2>
        <button class="btn-icon-action" id="btn-export" aria-label="Export notes" title="Export">Export</button>
        <button class="btn-icon-action" id="btn-new-note" aria-label="New note">＋</button>
      </header>

      <p class="notes-info">
        Notes are stored on this device only. They are not shared
        unless you choose to include them in an alert.
      </p>
      <p class="setup-hint" id="note-action-error" role="alert" aria-live="assertive"></p>

      <ul class="note-list" id="note-list">
        ${notes.length === 0
        ? '<li class="empty-hint">No notes yet. Tap + to add one.</li>'
        : notes.map(noteCard).join('')}
      </ul>

    </div>
  `;
    root.querySelector('#btn-back').addEventListener('click', () => {
        store.navigateTo('app');
    });
    root.querySelector('#btn-export').addEventListener('click', async () => {
        const { notes } = store.getState();
        if (notes.length === 0) {
            alert('No notes to export.');
            return;
        }
        await exportNotes(notes);
    });
    root.querySelector('#btn-new-note').addEventListener('click', () => {
        store.setEditingNote(null);
        store.navigateTo('note-edit');
    });
    root.querySelector('#note-list').addEventListener('click', async (e) => {
        const editBtn = e.target.closest('[data-edit]');
        const deleteBtn = e.target.closest('[data-delete]');
        if (editBtn) {
            store.setEditingNote(editBtn.dataset['edit']);
            store.navigateTo('note-edit');
        }
        if (deleteBtn) {
            const id = deleteBtn.dataset['delete'];
            if (confirm('Delete this note?')) {
                try {
                    await store.deleteNote(id);
                    store.navigateTo('notes');
                }
                catch {
                    root.querySelector('#note-action-error').textContent = 'Could not delete this note. It is still saved on this device. Try again.';
                }
            }
        }
    });
}
export function renderNoteEdit(root) {
    const { notes, editingNoteId } = store.getState();
    const existing = editingNoteId
        ? notes.find(n => n.id === editingNoteId)
        : null;
    root.innerHTML = `
    <div class="screen note-edit-screen">

      <header class="screen-header">
        <button class="btn-back-small" id="btn-back" aria-label="Cancel">←</button>
        <h2 class="screen-title">${existing ? 'Edit note' : 'New note'}</h2>
        <button class="btn-text-action" id="btn-save-note">Save</button>
      </header>
      <p class="setup-hint" id="note-save-error" role="alert" aria-live="assertive"></p>

      <form class="note-form" id="note-form" autocomplete="off">
        <input
          class="note-title-input"
          id="note-title"
          type="text"
          placeholder="Title"
          value="${existing ? escHtml(existing.title) : ''}"
          required
          autocomplete="off" />
        <textarea
          class="note-body-input"
          id="note-body"
          placeholder="Write your note here…"
          rows="12">${existing ? escHtml(existing.body) : ''}</textarea>
      </form>

      ${existing ? `<p class="note-timestamp">Created: ${formatNoteTimestamp(existing.createdAt)}<br>Last updated: ${formatNoteTimestamp(existing.updatedAt)}</p>` : ''}

    </div>
  `;
    root.querySelector('#btn-back').addEventListener('click', () => {
        store.navigateTo('notes');
    });
    const titleEl = root.querySelector('#note-title');
    const bodyEl = root.querySelector('#note-body');
    root.querySelector('#btn-save-note').addEventListener('click', async (event) => {
        const title = titleEl.value.trim();
        const body = bodyEl.value.trim();
        if (!title) {
            titleEl.focus();
            return;
        }
        const button = event.currentTarget;
        const error = root.querySelector('#note-save-error');
        button.disabled = true;
        error.textContent = '';
        try {
            await store.saveNote(editingNoteId, title, body);
            store.navigateTo('notes');
        }
        catch {
            error.textContent = 'Could not save this note. Your changes are still on screen. Try again.';
        }
        finally {
            button.disabled = false;
        }
    });
}
function noteCard(n) {
    const preview = n.body.slice(0, 80).replace(/\n/g, ' ');
    return `
    <li class="note-card">
      <div class="note-card-body" data-edit="${n.id}" style="cursor:pointer">
        <span class="note-card-title">${escHtml(n.title)}</span>
        <span class="note-card-preview">${escHtml(preview)}${n.body.length > 80 ? '…' : ''}</span>
        <span class="note-card-date">Created: ${formatNoteTimestamp(n.createdAt)}<br>Updated: ${formatNoteTimestamp(n.updatedAt)}</span>
      </div>
      <button class="note-delete" data-delete="${n.id}" aria-label="Delete ${escHtml(n.title)}">Delete</button>
    </li>
  `;
}
function escHtml(s) {
    return s
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}
