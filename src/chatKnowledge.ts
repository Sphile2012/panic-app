import { t } from './i18n.js';

type HelpRule = { key: string; words: string[] };

const RULES: HelpRule[] = [
    { key: 'chat.emergencyDialer', words: ['emergency dialer', 'emergency numbers', 'call 112', 'call 10111', 'call 10177', '112', '10111', '10177', 'ambulance', 'gbv helpline', 'childline'] },
    { key: 'chat.emergency', words: ['danger', 'help me', 'in danger', 'emergency', 'police', 'unsafe', 'ngozini', 'tsietsing', 'gevaar', 'noodgeval', 'ukuphepha'] },
    { key: 'chat.pin', words: ['pin', 'passcode', 'password', 'code', 'unlock', 'forgot pin', 'change pin', 'decoy', 'iphinikhodi', 'pine', 'wagwoord', 'kode'] },
    { key: 'chat.contacts', words: ['trusted contacts', 'emergency contact', 'trusted circle', 'contacts', 'contact', 'circle', 'beneficiary', 'oxhumana', 'batho', 'kontak', 'bangoa', 'begunstigde'] },
    { key: 'chat.alert', words: ['panic button', 'send an alert', 'sos', 'alert', 'panic', 'hold', 'button', 'sms', 'isexwayiso', 'tsebiso', 'waarskuwing', 'knoppie', 'inkinobho'] },
    { key: 'chat.battery', words: ['battery', 'charge', 'low power', 'ibhethri', 'betri'] },
    { key: 'chat.location', words: ['live location', 'share location', 'location', 'gps', 'track', 'where am i', 'indawo', 'sebaka', 'ligging', 'bukhoma', 'hehle', 'regstreeks'] },
    { key: 'chat.checkin', words: ['check in', 'check-in', 'checkin', 'check-in timer', 'arrival timer', 'safe arrival', 'timer'] },
    { key: 'chat.safetyPlan', words: ['safety plan', 'safe place', 'safety planning', 'emergency plan'] },
    { key: 'chat.history', words: ['alert history', 'incident history', 'past alerts', 'history', 'incidents'] },
    { key: 'chat.records', words: ['records', 'evidence photo', 'evidence photos', 'record photo'] },
    { key: 'chat.journey', words: ['journey planner', 'journey', 'route', 'trip', 'destination'] },
    { key: 'chat.notes', words: ['private notes', 'export notes', 'notes', 'note'] },
    { key: 'chat.fakeCall', words: ['fake call', 'pretend call', 'simulated call'] },
    { key: 'chat.companion', words: ['safety companion', 'companion', 'shelter', 'legal support', 'medical care', 'digital safety'] },
    { key: 'chat.profile', words: ['profile photo', 'profile', 'my name', 'phone number'] },
    { key: 'chat.privacy', words: ['privacy', 'private data', 'stored data', 'encryption', 'delete all data', 'reset app', 'security'] },
    { key: 'chat.settings', words: ['settings', 'appearance', 'dark mode', 'theme', 'disguise', 'auto-lock', 'auto lock'] },
    { key: 'chat.language', words: ['language', 'zulu', 'xhosa', 'sesotho', 'afrikaans', 'english', 'ulimi', 'puo', 'taal'] },
    { key: 'chat.install', words: ['install', 'home screen', 'download', 'faka', 'kenya', 'installeer'] },
    { key: 'chat.guide', words: ['user guide', 'faq', 'troubleshoot', 'troubleshooting', 'problem', 'error', 'support', 'terms'] },
    { key: 'chat.signout', words: ['sign out', 'signout', 'log out', 'logout', 'log off'] },
    { key: 'chat.signup', words: ['sign up', 'signup', 'register', 'create account', 'new account', 'login', 'sign in'] },
    { key: 'chat.navigation', words: ['menu', 'more button', 'hamburger', 'navigate', 'navigation'] },
    { key: 'chat.about', words: ['what can you do', 'what does panic ring do', 'features', 'about panic ring'] },
    { key: 'chat.hello', words: ['hello', 'hi', 'hey', 'sawubona', 'dumela', 'hallo', 'goeie'] },
];

function normalizeText(value: string): string {
    return value
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, ' ')
        .trim();
}

export function answer(question: string): string {
    const questionText = ` ${normalizeText(question)} `;
    let bestRule: HelpRule | undefined;
    let bestScore = 0;
    for (const rule of RULES) {
        const score = Math.max(0, ...rule.words
            .map(word => normalizeText(word))
            .filter(word => questionText.includes(` ${word} `))
            .map(word => word.split(' ').length));
        if (score > bestScore) {
            bestRule = rule;
            bestScore = score;
        }
    }
    return t(bestRule?.key ?? 'chat.fallback');
}
