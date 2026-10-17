const LARGE_CONTROLS_KEY = 'pr_large_controls';

export function isLargeControlsEnabled(): boolean {
    return localStorage.getItem(LARGE_CONTROLS_KEY) === 'true';
}

export function setLargeControlsEnabled(enabled: boolean): void {
    localStorage.setItem(LARGE_CONTROLS_KEY, String(enabled));
    document.documentElement.classList.toggle('large-controls', enabled);
}

export function applyAccessibilitySettings(): void {
    document.documentElement.classList.toggle('large-controls', isLargeControlsEnabled());
}
