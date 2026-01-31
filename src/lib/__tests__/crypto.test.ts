import { describe, it, expect } from "vitest";
import {
  deriveKey,
  encrypt,
  decrypt,
  createKeyCheck,
  verifyPassphrase,
  generateSalt,
} from "../crypto";
import { toBase64, fromBase64 } from "../crypto-utils";

describe("crypto", () => {
  it("encrypt then decrypt round-trips to original plaintext", async () => {
    const salt = generateSalt();
    const key = await deriveKey("test-passphrase", salt);
    const plaintext = "Hello, encrypted world!";

    const { ciphertext, iv } = await encrypt(key, plaintext);
    const decrypted = await decrypt(key, ciphertext, iv);

    expect(decrypted).toBe(plaintext);
  });

  it("decrypt with wrong key throws", async () => {
    const salt1 = generateSalt();
    const salt2 = generateSalt();
    const key1 = await deriveKey("passphrase-one", salt1);
    const key2 = await deriveKey("passphrase-two", salt2);

    const { ciphertext, iv } = await encrypt(key1, "secret data");

    await expect(decrypt(key2, ciphertext, iv)).rejects.toThrow();
  });

  it("handles unicode and multiline text", async () => {
    const salt = generateSalt();
    const key = await deriveKey("unicode-test", salt);
    const plaintext = "Mood: 😊\nTags: work, life\n日本語テスト";

    const { ciphertext, iv } = await encrypt(key, plaintext);
    const decrypted = await decrypt(key, ciphertext, iv);

    expect(decrypted).toBe(plaintext);
  });

  it("handles empty string", async () => {
    const salt = generateSalt();
    const key = await deriveKey("empty-test", salt);

    const { ciphertext, iv } = await encrypt(key, "");
    const decrypted = await decrypt(key, ciphertext, iv);

    expect(decrypted).toBe("");
  });

  it("produces different ciphertext for same plaintext (unique IVs)", async () => {
    const salt = generateSalt();
    const key = await deriveKey("iv-test", salt);
    const plaintext = "same text";

    const result1 = await encrypt(key, plaintext);
    const result2 = await encrypt(key, plaintext);

    expect(toBase64(result1.ciphertext)).not.toBe(toBase64(result2.ciphertext));
    expect(toBase64(result1.iv)).not.toBe(toBase64(result2.iv));
  });
});

describe("key-check", () => {
  it("verifyPassphrase succeeds with correct passphrase", async () => {
    const { salt, iv, checkBlob } = await createKeyCheck("my-secret");
    const key = await verifyPassphrase("my-secret", salt, iv, checkBlob);

    expect(key).not.toBeNull();
  });

  it("verifyPassphrase returns null with wrong passphrase", async () => {
    const { salt, iv, checkBlob } = await createKeyCheck("my-secret");
    const key = await verifyPassphrase("wrong-passphrase", salt, iv, checkBlob);

    expect(key).toBeNull();
  });
});

describe("crypto-utils", () => {
  it("base64 round-trips correctly", () => {
    const original = new Uint8Array([0, 1, 127, 128, 255]);
    const encoded = toBase64(original);
    const decoded = fromBase64(encoded);

    expect(decoded).toEqual(original);
  });

  it("handles empty Uint8Array", () => {
    const original = new Uint8Array([]);
    const encoded = toBase64(original);
    const decoded = fromBase64(encoded);

    expect(decoded).toEqual(original);
  });
});
