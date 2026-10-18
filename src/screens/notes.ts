import '../strings/groupB.js';
import { store } from '../state.js';
import { t } from '../i18n.js';
import { exportNotes } from '../export.js';
export function renderNotes(root) {
    const { notes } = store.getState();
    root.innerHTML = `
    <div class="screen notes-screen">

      <header class="screen-header">
        <button class="btn-back-small" id="btn-back" aria-label="${t('common.back')}">${t('common.back')}</button>
        <h2 class="screen-title">${t('b.notes.title')}</h2>
        <button class="btn-icon-action" id="btn-export" aria-label="${t('b.notes.export.aria')}" title="${t('b.notes.export')}">${t('b.notes.export')}</button>
        <button class="btn-icon-action" id="btn-new-note" aria-label="${t('b.notes.new.aria')}">${t('b.notes.new')}</button>
      </header>

      <p class="notes-info">${t('b.notes.info')}</p>

      <ul class="note-list" id="note-list">
        ${notes.length === 0
        ? `<li class="empty-hint">${t('b.notes.empty')}</li>`
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
            alert(t('b.notes.noexport'));
            return;
        }
        await exportNotes(notes);
    });
    root.querySelector('#btn-new-note').addEventListener('click', () => {
        store.setEditingNote(null);
        store.navigateTo('note-edit');
    });
    root.querySelector('#note-list').addEventListener('click', e => {
        const editBtn = e.target.closest('[data-edit]');
        const deleteBtn = e.target.closest('[data-delete]');
        if (editBtn) {
            store.setEditingNote(editBtn.dataset['edit']);
            store.navigateTo('note-edit');
        }
        if (deleteBtn) {
            const id = deleteBtn.dataset['delete'];
            if (confirm(t('b.notes.delete.q'))) {
                store.deleteNote(id);
                store.navigateTo('notes');
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
        <button class="btn-back-small" id="btn-back"         aria-label="${t('common.cancel')}">${t('common.back')}</button>
                <h2 class="screen-title">${existing ? t('b.notes.edit') : t('b.notes.newtitle')}</h2>
                <button class="btn-text-action" id="btn-save-note">${t('b.plan.save')}</button>
      </header>

      <form class="note-form" id="note-form" autocomplete="off">
        <input
          class="note-title-input"
          id="note-title"
          type="text"
          placeholder="${t('b.notes.title.ph')}"
          value="${existing ? escHtml(existing.title) : ''}"
          required
          autocomplete="off" />
        <textarea
          class="note-body-input"
          id="note-body"
          placeholder="${t('b.notes.body.ph')}"
          rows="12">${existing ? escHtml(existing.body) : ''}</textarea>
      </form>

      ${existing ? `<p class="note-timestamp">${t('b.notes.updated', { date: formatDate(existing.updatedAt) })}</p>` : ''}

    </div>
  `;
    root.querySelector('#btn-back').addEventListener('click', () => {
        store.navigateTo('notes');
    });
    const titleEl = root.querySelector('#note-title');
    const bodyEl = root.querySelector('#note-body');
    root.querySelector('#btn-save-note').addEventListener('click', () => {
        const title = titleEl.value.trim();
        const body = bodyEl.value.trim();
        if (!title) {
            titleEl.focus();
            return;
        }
        store.saveNote(editingNoteId, title, body);
        store.navigateTo('notes');
    });
}
function noteCard(n) {
    const preview = n.body.slice(0, 80).replace(/\n/g, ' ');
    return `
    <li class="note-card">
      <div class="note-card-body" data-edit="${n.id}" style="cursor:pointer">
        <span class="note-card-title">${escHtml(n.title)}</span>
        <span class="note-card-preview">${escHtml(preview)}${n.body.length > 80 ? '…' : ''}</span>
        <span class="note-card-date">${formatDate(n.updatedAt)}</span>
      </div>
      <button class="note-delete" data-delete="${n.id}" aria-label="${t('b.notes.delete.aria', { title: escHtml(n.title) })}">${t('b.notes.delete')}</button>
    </li>
  `;
}
function formatDate(ts) {
    return new Date(ts).toLocaleString('en-ZA', {
        day: '2-digit', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
    });
}
function escHtml(s) {
    return s
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}
