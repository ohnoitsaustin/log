import { describe, it, expect } from "vitest";
import { encryptMedia, decryptMedia } from "../media";
import { deriveKey, generateSalt } from "../crypto";

describe("media encrypt/decrypt", () => {
  it("round-trips binary data through encrypt then decrypt", async () => {
    const salt = generateSalt();
    const key = await deriveKey("test-passphrase", salt);

    // Simulate image data (random bytes)
    const original = new Uint8Array(1024);
    crypto.getRandomValues(original);

    const { ciphertext, iv } = await encryptMedia(key, original.buffer as ArrayBuffer);
    const decrypted = await decryptMedia(key, ciphertext, iv);

    expect(new Uint8Array(decrypted)).toEqual(original);
  });

  it("produces different ciphertext for same input (unique IVs)", async () => {
    const salt = generateSalt();
    const key = await deriveKey("test-passphrase", salt);
    const data = new Uint8Array([1, 2, 3, 4, 5]).buffer as ArrayBuffer;

    const result1 = await encryptMedia(key, data);
    const result2 = await encryptMedia(key, data);

    expect(result1.iv).not.toEqual(result2.iv);
  });

  it("decrypt with wrong key throws", async () => {
    const key1 = await deriveKey("key-one", generateSalt());
    const key2 = await deriveKey("key-two", generateSalt());

    const data = new Uint8Array([10, 20, 30]).buffer as ArrayBuffer;
    const { ciphertext, iv } = await encryptMedia(key1, data);

    await expect(decryptMedia(key2, ciphertext, iv)).rejects.toThrow();
  });

  it("handles empty data", async () => {
    const salt = generateSalt();
    const key = await deriveKey("test-passphrase", salt);
    const empty = new ArrayBuffer(0);

    const { ciphertext, iv } = await encryptMedia(key, empty);
    const decrypted = await decryptMedia(key, ciphertext, iv);

    expect(new Uint8Array(decrypted)).toEqual(new Uint8Array(0));
  });
});
