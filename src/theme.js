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
        preview: `<svg viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg" class="disguise-preview-icon">
            <rect x="10" y="10" width="60" height="60" rx="8" fill="#ec4899" opacity="0.15"/>
            <rect x="18" y="18" width="44" height="12" rx="4" fill="#ec4899" opacity="0.3"/>
            <circle cx="25" cy="42" r="5" fill="#ec4899"/>
            <circle cx="40" cy="42" r="5" fill="#ec4899"/>
            <circle cx="55" cy="42" r="5" fill="#ec4899"/>
            <circle cx="25" cy="55" r="5" fill="#ec4899"/>
            <circle cx="40" cy="55" r="5" fill="#ec4899"/>
            <circle cx="55" cy="55" r="5" fill="#ec4899"/>
        </svg>`,
    },
    {
        id: 'budget',
        label: 'Budget Tracker',
        description: 'Looks like a personal finance app.',
        preview: `<svg viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg" class="disguise-preview-icon">
            <rect x="10" y="10" width="60" height="60" rx="8" fill="#8B5CF6" opacity="0.15"/>
            <path d="M20 35 L30 30 L40 38 L50 28 L60 32" stroke="#8B5CF6" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
            <circle cx="30" cy="30" r="3" fill="#8B5CF6"/>
            <circle cx="40" cy="38" r="3" fill="#8B5CF6"/>
            <circle cx="50" cy="28" r="3" fill="#8B5CF6"/>
            <rect x="18" y="50" width="12" height="15" rx="2" fill="#8B5CF6" opacity="0.5"/>
            <rect x="34" y="45" width="12" height="20" rx="2" fill="#8B5CF6" opacity="0.7"/>
            <rect x="50" y="40" width="12" height="25" rx="2" fill="#8B5CF6"/>
        </svg>`,
    },
    {
        id: 'weather',
        label: 'Weather',
        description: 'Looks like a weather forecast app.',
        preview: `<svg viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg" class="disguise-preview-icon">
            <rect x="10" y="10" width="60" height="60" rx="8" fill="#6366F1" opacity="0.15"/>
            <circle cx="40" cy="30" r="10" fill="#fbbf24"/>
            <path d="M25 45 Q30 40, 35 45 T45 45 T55 45" stroke="#6366F1" stroke-width="4" stroke-linecap="round" fill="none"/>
            <rect x="22" y="45" width="36" height="15" rx="6" fill="#6366F1" opacity="0.7"/>
        </svg>`,
    },
    {
        id: 'notes-plain',
        label: 'Quick Notes',
        description: 'Looks like a plain note-taking app.',
        preview: `<svg viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg" class="disguise-preview-icon">
            <rect x="10" y="10" width="60" height="60" rx="8" fill="#ec4899" opacity="0.15"/>
            <line x1="20" y1="25" x2="60" y2="25" stroke="#ec4899" stroke-width="3" stroke-linecap="round"/>
            <line x1="20" y1="35" x2="55" y2="35" stroke="#ec4899" stroke-width="2.5" opacity="0.7" stroke-linecap="round"/>
            <line x1="20" y1="43" x2="58" y2="43" stroke="#ec4899" stroke-width="2.5" opacity="0.7" stroke-linecap="round"/>
            <line x1="20" y1="51" x2="50" y2="51" stroke="#ec4899" stroke-width="2.5" opacity="0.7" stroke-linecap="round"/>
            <line x1="20" y1="59" x2="45" y2="59" stroke="#ec4899" stroke-width="2.5" opacity="0.5" stroke-linecap="round"/>
        </svg>`,
    },
    {
        id: 'clock',
        label: 'Clock & Timer',
        description: 'Looks like a clock app. Timer entry is the PIN.',
        preview: `<svg viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg" class="disguise-preview-icon">
            <rect x="10" y="10" width="60" height="60" rx="8" fill="#8B5CF6" opacity="0.15"/>
            <circle cx="40" cy="40" r="20" stroke="#8B5CF6" stroke-width="3"/>
            <line x1="40" y1="40" x2="40" y2="28" stroke="#8B5CF6" stroke-width="3" stroke-linecap="round"/>
            <line x1="40" y1="40" x2="48" y2="40" stroke="#8B5CF6" stroke-width="2.5" stroke-linecap="round"/>
            <circle cx="40" cy="40" r="2" fill="#8B5CF6"/>
        </svg>`,
    },
];
export function disguiseLabel(id) {
    return DISGUISE_OPTIONS.find(option => option.id === id)?.label ?? id;
}
export function disguiseDescription(id) {
    return DISGUISE_OPTIONS.find(option => option.id === id)?.description ?? '';
}
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
        const saved = JSON.parse(raw);
        return { ...DEFAULT, ...saved, mode: saved.mode === 'dark' ? 'dark' : 'light' };
    }
    catch {
        return { ...DEFAULT };
    }
}
export function saveAppearance(a) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...a, mode: a.mode === 'dark' ? 'dark' : 'light' }));
}

export function applyAppearance(a) {
    const html = document.documentElement;
    html.setAttribute('data-theme', a.mode === 'dark' ? 'dark' : 'light');
    html.setAttribute('data-accent', a.accentId);
    const accent = ACCENT_COLOURS.find(c => c.id === a.accentId) ?? ACCENT_COLOURS[0];
    html.style.setProperty('--accent', accent.hex);
    html.style.setProperty('--accent-fill', accent.hex);
    html.style.setProperty('--accent-dim', accent.dim);
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
