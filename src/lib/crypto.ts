/**
 * Client-side encryption for Log.
 *
 * - Key derivation: PBKDF2 (600k iterations, SHA-256)
 * - Encryption: AES-256-GCM
 * - All operations use the Web Crypto API (no external deps).
 */

import { toArrayBuffer } from "./crypto-utils";

const PBKDF2_ITERATIONS = 600_000;
const SALT_LENGTH = 16; // 128 bits
const IV_LENGTH = 12; // 96 bits (recommended for AES-GCM)
const KEY_CHECK_PLAINTEXT = "LOG_CHECK";

export function generateSalt(): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(SALT_LENGTH));
}

export function generateIV(): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(IV_LENGTH));
}

export async function deriveKey(passphrase: string, salt: Uint8Array): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    encoder.encode(passphrase),
    "PBKDF2",
    false,
    ["deriveKey"],
  );

  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: toArrayBuffer(salt),
      iterations: PBKDF2_ITERATIONS,
      hash: "SHA-256",
    },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}


export async function encrypt(
  key: CryptoKey,
  plaintext: string,
): Promise<{ ciphertext: Uint8Array; iv: Uint8Array }> {
  const encoder = new TextEncoder();
  const iv = generateIV();

  const encrypted = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv: toArrayBuffer(iv) },  // <- ArrayBuffer
    key,
    encoder.encode(plaintext),
  );

  return { ciphertext: new Uint8Array(encrypted), iv };
}

export async function decrypt(
  key: CryptoKey,
  ciphertext: Uint8Array,
  iv: Uint8Array,
): Promise<string> {
  const decoder = new TextDecoder();

  const plaintext = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: toArrayBuffer(iv) },      // <- ArrayBuffer
    key,
    toArrayBuffer(ciphertext),                       // <- ArrayBuffer
  );

  return decoder.decode(plaintext);
}



/**
 * Create a key-check blob: encrypts a known string so we can later
 * verify the user entered the correct passphrase.
 */
export async function createKeyCheck(
  passphrase: string,
): Promise<{ salt: Uint8Array; iv: Uint8Array; checkBlob: Uint8Array }> {
  const salt = generateSalt();
  const key = await deriveKey(passphrase, salt);
  const { ciphertext, iv } = await encrypt(key, KEY_CHECK_PLAINTEXT);
  return { salt, iv, checkBlob: ciphertext };
}

/**
 * Verify a passphrase against a stored key-check blob.
 * Returns the derived CryptoKey on success, null on wrong passphrase.
 */
export async function verifyPassphrase(
  passphrase: string,
  salt: Uint8Array,
  iv: Uint8Array,
  checkBlob: Uint8Array,
): Promise<CryptoKey | null> {
  const key = await deriveKey(passphrase, salt);
  try {
    const decrypted = await decrypt(key, checkBlob, iv);
    return decrypted === KEY_CHECK_PLAINTEXT ? key : null;
  } catch {
    // AES-GCM auth tag mismatch → wrong passphrase
    return null;
  }
}
