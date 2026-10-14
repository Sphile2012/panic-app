async function sha256Hex(text) {
    const encoded = new TextEncoder().encode(text);
    const buf = await crypto.subtle.digest('SHA-256', encoded);
    return Array.from(new Uint8Array(buf))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
}
export async function exportNotes(notes, scrubMetadata = false) {
    const exportedNotes = scrubMetadata
        ? notes
            .map(({ title, body }) => ({ title, body }))
            .sort((a, b) => a.title.localeCompare(b.title) || a.body.localeCompare(b.body))
        : [...notes].sort((a, b) => a.createdAt - b.createdAt);
    const payload = JSON.stringify(exportedNotes, null, 2);
    const hash = await sha256Hex(payload);
    const doc = {
        ...(scrubMetadata ? {} : { exported_at: new Date().toISOString() }),
        app: 'Panic Ring',
        version: 1,
        metadata_scrubbed: scrubMetadata,
        notes: exportedNotes,
        integrity: hash,
    };
    const blob = new Blob([JSON.stringify(doc, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const name = scrubMetadata ? 'panic-ring-notes-redacted.json' : `panic-ring-notes-${ts}.json`;
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export async function verifyExport(json) {
    try {
        const doc = JSON.parse(json);
        const payload = JSON.stringify(doc.notes, null, 2);
        const hash = await sha256Hex(payload);
        return hash === doc.integrity;
    }
    catch {
        return false;
    }
}
