const LARGE_CONTROLS_KEY = 'pr_large_controls';
export function isLargeControlsEnabled() {
    return localStorage.getItem(LARGE_CONTROLS_KEY) === 'true';
}
export function setLargeControlsEnabled(enabled) {
    localStorage.setItem(LARGE_CONTROLS_KEY, String(enabled));
    document.documentElement.classList.toggle('large-controls', enabled);
}
export function applyAccessibilitySettings() {
    document.documentElement.classList.toggle('large-controls', isLargeControlsEnabled());
}
