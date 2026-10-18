const ALGO = 'AES-GCM';
const KEY_USAGE: KeyUsage[] = ['encrypt', 'decrypt'];

async function keyFromHash(pinHash: string) {
    const raw = new Uint8Array(pinHash.match(/../g).map(h => parseInt(h, 16)));
    return crypto.subtle.importKey('raw', raw, { name: ALGO, length: 256 }, false, KEY_USAGE);
}

function encode(text: string) {
    return new TextEncoder().encode(text);
}

function decode(buf: ArrayBuffer | Uint8Array) {
    return new TextDecoder().decode(buf);
}

function concat(a: Uint8Array, b: Uint8Array) {
    const out = new Uint8Array(a.length + b.length);
    out.set(a);
    out.set(b, a.length);
    return out;
}

export async function encrypt(plaintext: string, pinHash: string) {
    const key = await keyFromHash(pinHash);
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const ct = await crypto.subtle.encrypt({ name: ALGO, iv }, key, encode(plaintext).buffer);
    const combined = concat(iv, new Uint8Array(ct));
    return btoa(String.fromCharCode(...combined));
}

export async function decrypt(b64: string, pinHash: string) {
    const key = await keyFromHash(pinHash);
    const bytes = Uint8Array.from(atob(b64), c => c.charCodeAt(0));
    const iv = bytes.slice(0, 12);
    const ct = bytes.slice(12);
    const plain = await crypto.subtle.decrypt({ name: ALGO, iv }, key, ct);
    return decode(plain);
}

export async function encryptJson(value: unknown, pinHash: string) {
    return encrypt(JSON.stringify(value), pinHash);
}

export async function decryptJson<T>(b64: string, pinHash: string): Promise<T | null> {
    try {
        const text = await decrypt(b64, pinHash);
        return JSON.parse(text) as T;
    }
    catch {
        return null;
    }
}
