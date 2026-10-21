const DB_NAME = 'pr_evidence';
const STORE = 'photos';
const FLAG = 'pr_evidence_on';

export type EvidencePhoto = { id?: number; at: number; blob: Blob };

export function evidenceEnabled(): boolean {
    return localStorage.getItem(FLAG) !== '0';
}

export function setEvidenceEnabled(on: boolean) {
    localStorage.setItem(FLAG, on ? '1' : '0');
}

function openDb(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
        const req = indexedDB.open(DB_NAME, 1);
        req.onupgradeneeded = () => {
            req.result.createObjectStore(STORE, { keyPath: 'id', autoIncrement: true });
        };
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
    });
}

export async function savePhoto(blob: Blob): Promise<void> {
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(STORE, 'readwrite');
        tx.objectStore(STORE).add({ at: Date.now(), blob });
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
    });
    db.close();
}

export async function listPhotos(): Promise<EvidencePhoto[]> {
    const db = await openDb();
    const rows = await new Promise<EvidencePhoto[]>((resolve, reject) => {
        const req = db.transaction(STORE).objectStore(STORE).getAll();
        req.onsuccess = () => resolve(req.result as EvidencePhoto[]);
        req.onerror = () => reject(req.error);
    });
    db.close();
    return rows.sort((a, b) => b.at - a.at);
}

export async function deletePhoto(id: number): Promise<void> {
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(STORE, 'readwrite');
        tx.objectStore(STORE).delete(id);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
    });
    db.close();
}

export async function requestCameraAccess(): Promise<boolean> {
    if (!navigator.mediaDevices?.getUserMedia)
        return false;
    try {
        const s = await navigator.mediaDevices.getUserMedia({ video: true });
        s.getTracks().forEach(tr => tr.stop());
        return true;
    }
    catch {
        return false;
    }
}

let running = false;

export async function startEvidenceCapture(maxPhotos = 5): Promise<void> {
    if (running || !evidenceEnabled() || !navigator.mediaDevices?.getUserMedia)
        return;
    running = true;
    let stream: MediaStream | null = null;
    try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
            .catch(() => navigator.mediaDevices.getUserMedia({ video: true }));
        const video = document.createElement('video');
        video.muted = true;
        video.playsInline = true;
        video.srcObject = stream;
        await video.play();
        const canvas = document.createElement('canvas');
        for (let i = 0; i < maxPhotos; i++) {
            await new Promise(r => setTimeout(r, 2000 + Math.random() * 8000));
            canvas.width = video.videoWidth || 640;
            canvas.height = video.videoHeight || 480;
            canvas.getContext('2d')?.drawImage(video, 0, 0, canvas.width, canvas.height);
            const blob: Blob | null = await new Promise(r => canvas.toBlob(r, 'image/jpeg', 0.8));
            if (blob)
                await savePhoto(blob);
        }
    }
    catch {
    }
    finally {
        stream?.getTracks().forEach(tr => tr.stop());
        running = false;
    }
}
