/** Convert Uint8Array to base64 string for serialization. */
export function toBase64(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes));
}

/** Convert base64 string back to Uint8Array. */
export function fromBase64(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

/** Convert Uint8Array to hex string (useful for debugging). */
export function toHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** Convert hex string (with optional \x prefix) back to Uint8Array. */
export function fromHex(hex: string): Uint8Array {
  const clean = hex.startsWith("\\x") ? hex.slice(2) : hex;
  const bytes = new Uint8Array(clean.length / 2);
  for (let i = 0; i < clean.length; i += 2) {
    bytes[i / 2] = parseInt(clean.slice(i, i + 2), 16);
  }
  return bytes;
}

/** Convert Uint8Array to a real ArrayBuffer-backed Uint8Array. */
export function toArrayBufferU8(u8: Uint8Array): Uint8Array {
  // slice() returns a real ArrayBuffer (not SharedArrayBuffer)
  const ab = u8.buffer.slice(u8.byteOffset, u8.byteOffset + u8.byteLength) as ArrayBuffer;
  return new Uint8Array(ab);
}

export function toArrayBuffer(u8: Uint8Array): ArrayBuffer {
  // Copy into a brand-new Uint8Array (guaranteed ArrayBuffer-backed at runtime)
  const copy = new Uint8Array(u8);
  return copy.buffer as ArrayBuffer;
}
