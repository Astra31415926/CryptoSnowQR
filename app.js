// --- SECTION: INITIALIZATION & GLOBAL STATE ---
let mode = 'idle';
let text = '';
let password = '';
let pendingCiphertext = null;

// --- SECTION: SECURE CRYPTOGRAPHY API (PBKDF2 + AES-GCM) ---
async function encryptData(plaintext, passwordKey) {
    const enc = new TextEncoder();
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const km = await crypto.subtle.importKey("raw", enc.encode(passwordKey), "PBKDF2", false, ["deriveKey"]);
    const key = await crypto.subtle.deriveKey(
        { name: "PBKDF2", salt, iterations: 390000, hash: "SHA-256" },
        km,
        { name: "AES-GCM", length: 256 },
        false,
        ["encrypt"]
    );
    const nonce = crypto.getRandomValues(new Uint8Array(12));
    const ct = await crypto.subtle.encrypt({ name: "AES-GCM", iv: nonce }, key, enc.encode(plaintext));
    const comb = new Uint8Array(40 + ct.byteLength);
    comb.set(salt, 0);
    comb.set(nonce, 16);
    comb.set(new Uint8Array(ct), 28);
    
    let binary = '';
    const len = comb.byteLength;
    for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(comb[i]);
    }
    return btoa(binary);
}

async function decryptData(b64, passwordKey) {
    try {
        const enc = new TextEncoder();
        const binaryString = atob(b64);
        const len = binaryString.length;
        const comb = new Uint8Array(len);
        for (let i = 0; i < len; i++) {
            comb[i] = binaryString.charCodeAt(i);
        }
        const salt = comb.slice(0, 16);
        const nonce = comb.slice(16, 28);
        const ct = comb.slice(28);
        const km = await crypto.subtle.importKey("raw", enc.encode(passwordKey), "PBKDF2", false, ["deriveKey"]);
        const key = await crypto.subtle.deriveKey(
            { name: "PBKDF2", salt, iterations: 390000, hash: "SHA-256" },
            km,
            { name: "AES-GCM", length: 256 },
            false,
            ["decrypt"]
        );
        const dec = await crypto.subtle.decrypt({ name: "AES-GCM", iv: nonce }, key, ct);
        return new TextDecoder().decode(dec);
    } catch (e) {
        return null;
    }
}
