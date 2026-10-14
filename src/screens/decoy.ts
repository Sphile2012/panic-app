export function renderDecoy(root) {
    root.innerHTML = `
    <div class="screen decoy-screen">
      <header class="decoy-header">
        <span class="decoy-title">Notes</span>
        <button class="decoy-add-btn" title="New note" aria-label="New note">＋</button>
      </header>
      <ul class="decoy-list">
        <li class="decoy-item">
          <div class="decoy-item-body">
            <span class="decoy-item-title">Shopping list</span>
            <span class="decoy-item-preview">Bread, milk, olive oil…</span>
          </div>
          <span class="decoy-item-date">Today</span>
        </li>
        <li class="decoy-item">
          <div class="decoy-item-body">
            <span class="decoy-item-title">Work notes</span>
            <span class="decoy-item-preview">Call with Sipho at 14:00…</span>
          </div>
          <span class="decoy-item-date">Yesterday</span>
        </li>
        <li class="decoy-item">
          <div class="decoy-item-body">
            <span class="decoy-item-title">Weekend plans</span>
            <span class="decoy-item-preview">Braai at Zanele's place…</span>
          </div>
          <span class="decoy-item-date">Mon</span>
        </li>
        <li class="decoy-item">
          <div class="decoy-item-body">
            <span class="decoy-item-title">Book list</span>
            <span class="decoy-item-preview">Disgrace, Long Walk…</span>
          </div>
          <span class="decoy-item-date">Sun</span>
        </li>
      </ul>
      <p class="decoy-footer">4 notes</p>
    </div>
  `;
}
