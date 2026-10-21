export const ACCENT_COLOURS = [
    { id: 'purple', label: 'Purple', hex: '#5c4de8', darkHex: '#8b80f7', dim: '#3a2f9a' },
    { id: 'teal', label: 'Teal', hex: '#0d9488', darkHex: '#42cfc1', dim: '#0f6b63' },
    { id: 'rose', label: 'Rose', hex: '#e11d48', darkHex: '#ff718f', dim: '#9f0d2f' },
    { id: 'amber', label: 'Amber', hex: '#d97706', darkHex: '#f6b94a', dim: '#92520a' },
    { id: 'sky', label: 'Sky', hex: '#0284c7', darkHex: '#41b8f3', dim: '#015d8a' },
    { id: 'emerald', label: 'Emerald', hex: '#059669', darkHex: '#38d99b', dim: '#03674a' },
    { id: 'slate', label: 'Slate', hex: '#475569', darkHex: '#b2bccb', dim: '#2d3748' },
    { id: 'pink', label: 'Pink', hex: '#c02668', darkHex: '#f369ac', dim: '#831843' },
];
export const DISGUISE_OPTIONS = [
    {
        id: 'calculator',
        label: 'Calculator',
        description: 'Standard number pad. PIN + = unlocks.',
        preview: 'Calc',
    },
    {
        id: 'budget',
        label: 'Budget Tracker',
        description: 'Looks like a personal finance app.',
        preview: 'Budget',
    },
    {
        id: 'weather',
        label: 'Weather',
        description: 'Looks like a weather forecast app.',
        preview: 'Weather',
    },
    {
        id: 'notes-plain',
        label: 'Quick Notes',
        description: 'Looks like a plain note-taking app.',
        preview: 'Notes',
    },
    {
        id: 'clock',
        label: 'Clock & Timer',
        description: 'Looks like a clock app. Timer entry is the PIN.',
        preview: 'Clock',
    },
];
const STORAGE_KEY = 'pr_appearance';
const DEFAULT = {
    mode: 'light',
    accentId: 'pink',
    disguise: 'calculator',
    backgroundImage: '',
};
export function loadAppearance() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw)
            return { ...DEFAULT };
        return { ...DEFAULT, ...JSON.parse(raw) };
    }
    catch {
        return { ...DEFAULT };
    }
}
export function saveAppearance(a) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(a));
}

export function resolveThemeMode(mode) {
    return mode === 'auto'
        ? window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark'
        : mode;
}

export function applyAppearance(a) {
    const html = document.documentElement;
    const resolved = resolveThemeMode(a.mode);
    html.setAttribute('data-theme', resolved);
    html.setAttribute('data-accent', a.accentId);
    const accent = ACCENT_COLOURS.find(c => c.id === a.accentId) ?? ACCENT_COLOURS[0];
    html.style.setProperty('--accent', resolved === 'dark' ? accent.darkHex : accent.hex);
    html.style.setProperty('--accent-fill', accent.hex);
    html.style.setProperty('--accent-dim', resolved === 'dark' ? accent.hex : accent.dim);
    const photo = typeof a.backgroundImage === 'string' &&
        /^data:image\/(?:jpeg|png|webp);base64,[A-Za-z0-9+/]+={0,2}$/.test(a.backgroundImage)
        ? a.backgroundImage
        : '';
    if (photo) {
        html.style.setProperty('--photo-background', `url("${photo}")`);
        html.dataset['photoBackground'] = 'true';
    }
    else {
        html.style.removeProperty('--photo-background');
        delete html.dataset['photoBackground'];
    }
}
export function watchSystemTheme(getMode) {
    window.matchMedia('(prefers-color-scheme: light)').addEventListener('change', () => {
        const a = loadAppearance();
        a.mode = getMode();
        applyAppearance(a);
    });
}
