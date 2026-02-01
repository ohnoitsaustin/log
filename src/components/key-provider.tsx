"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { createKeyCheck, deriveKey, importKeyFromRaw, verifyPassphrase } from "@/lib/crypto";
import { toBase64, fromBase64, toHex, fromHex } from "@/lib/crypto-utils";

interface KeyContextValue {
  key: CryptoKey | null;
  salt: Uint8Array | null;
  isUnlocked: boolean;
  lock: () => void;
}

const KeyContext = createContext<KeyContextValue | undefined>(undefined);

const SESSION_KEY_STORAGE = "log_session_key";
const SESSION_SALT_STORAGE = "log_session_salt";

async function cacheKeyToSession(key: CryptoKey, salt: Uint8Array) {
  try {
    const raw = await crypto.subtle.exportKey("raw", key);
    sessionStorage.setItem(SESSION_KEY_STORAGE, toBase64(new Uint8Array(raw)));
    sessionStorage.setItem(SESSION_SALT_STORAGE, toBase64(salt));
  } catch {
    // Silently ignore — caching is best-effort
  }
}

async function restoreKeyFromSession(): Promise<{ key: CryptoKey; salt: Uint8Array } | null> {
  try {
    const rawB64 = sessionStorage.getItem(SESSION_KEY_STORAGE);
    const saltB64 = sessionStorage.getItem(SESSION_SALT_STORAGE);
    if (!rawB64 || !saltB64) return null;

    const key = await importKeyFromRaw(fromBase64(rawB64));
    const salt = fromBase64(saltB64);
    return { key, salt };
  } catch {
    clearSessionCache();
    return null;
  }
}

function clearSessionCache() {
  sessionStorage.removeItem(SESSION_KEY_STORAGE);
  sessionStorage.removeItem(SESSION_SALT_STORAGE);
}

type Status = "loading" | "setup" | "unlock" | "unlocked";

interface StoredKeyCheck {
  salt: string;
  iv: string;
  check_blob: string;
}

export function KeyProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<Status>("loading");
  const [key, setKey] = useState<CryptoKey | null>(null);
  const [salt, setSalt] = useState<Uint8Array | null>(null);
  const [storedCheck, setStoredCheck] = useState<StoredKeyCheck | null>(null);

  const supabase = createClient();

  useEffect(() => {
    async function checkKeyExists() {
      // Try restoring from session cache first
      const cached = await restoreKeyFromSession();
      if (cached) {
        setKey(cached.key);
        setSalt(cached.salt);
        setStatus("unlocked");
        return;
      }

      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("key_checks")
        .select("salt, iv, check_blob")
        .eq("user_id", user.id)
        .single();

      if (error || !data) {
        setStatus("setup");
      } else {
        setStoredCheck(data as StoredKeyCheck);
        setStatus("unlock");
      }
    }

    checkKeyExists();
  }, [supabase]);

  function lock() {
    setKey(null);
    setSalt(null);
    clearSessionCache();
    setStatus("unlock");
  }

  if (status === "loading") {
    return (
      <div className="bg-background flex min-h-screen items-center justify-center">
        <p className="text-foreground/60 text-sm">Loading...</p>
      </div>
    );
  }

  if (status === "setup") {
    return (
      <SetupModal
        supabase={supabase}
        onComplete={(k, s) => {
          setKey(k);
          setSalt(s);
          cacheKeyToSession(k, s);
          setStatus("unlocked");
        }}
      />
    );
  }

  if (status === "unlock" && storedCheck) {
    return (
      <UnlockModal
        storedCheck={storedCheck}
        onUnlock={(k, s) => {
          setKey(k);
          setSalt(s);
          cacheKeyToSession(k, s);
          setStatus("unlocked");
        }}
      />
    );
  }

  return <KeyContext value={{ key, salt, isUnlocked: true, lock }}>{children}</KeyContext>;
}

export function useKey() {
  const context = useContext(KeyContext);
  if (!context) throw new Error("useKey must be used within KeyProvider");
  return context;
}

// --- Setup Modal ---

function SetupModal({
  supabase,
  onComplete,
}: {
  supabase: ReturnType<typeof createClient>;
  onComplete: (key: CryptoKey, salt: Uint8Array) => void;
}) {
  const [passphrase, setPassphrase] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (passphrase.length < 8) {
      setError("Passphrase must be at least 8 characters.");
      return;
    }

    if (passphrase !== confirm) {
      setError("Passphrases do not match.");
      return;
    }

    setLoading(true);

    try {
      const { salt, iv, checkBlob } = await createKeyCheck(passphrase);

      const {
        data: { user },
      } = await supabase.auth.getUser();

      const { error: insertError } = await supabase.from("key_checks").insert({
        user_id: user!.id,
        salt: "\\x" + toHex(salt),
        iv: "\\x" + toHex(iv),
        check_blob: "\\x" + toHex(checkBlob),
      });

      if (insertError) {
        setError(insertError.message);
        setLoading(false);
        return;
      }

      const derivedKey = await deriveKey(passphrase, salt);
      onComplete(derivedKey, salt);
    } catch {
      setError("Something went wrong. Please try again.");
      setLoading(false);
    }
  }

  return (
    <div className="bg-background flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-8">
        <div>
          <h1 className="text-foreground text-2xl font-bold">Set your passphrase</h1>
          <p className="text-foreground/60 mt-1 text-sm">
            This passphrase encrypts your journal. It is never sent to the server. If you forget it,
            your data cannot be recovered.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="passphrase" className="text-foreground block text-sm font-medium">
              Passphrase
            </label>
            <input
              id="passphrase"
              type="password"
              required
              value={passphrase}
              onChange={(e) => setPassphrase(e.target.value)}
              className="border-foreground/20 bg-background text-foreground placeholder:text-foreground/40 focus:border-foreground/40 mt-1 block w-full rounded-md border px-3 py-2 text-sm focus:outline-none"
              placeholder="At least 8 characters"
            />
          </div>

          <div>
            <label htmlFor="confirm" className="text-foreground block text-sm font-medium">
              Confirm passphrase
            </label>
            <input
              id="confirm"
              type="password"
              required
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className="border-foreground/20 bg-background text-foreground placeholder:text-foreground/40 focus:border-foreground/40 mt-1 block w-full rounded-md border px-3 py-2 text-sm focus:outline-none"
              placeholder="Repeat your passphrase"
            />
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="bg-foreground text-background w-full rounded-md px-4 py-2 text-sm font-medium transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {loading ? "Setting up..." : "Set passphrase"}
          </button>
        </form>
      </div>
    </div>
  );
}

// --- Unlock Modal ---

function UnlockModal({
  storedCheck,
  onUnlock,
}: {
  storedCheck: StoredKeyCheck;
  onUnlock: (key: CryptoKey, salt: Uint8Array) => void;
}) {
  const [passphrase, setPassphrase] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const saltBytes = fromHex(storedCheck.salt);
      const ivBytes = fromHex(storedCheck.iv);
      const checkBlobBytes = fromHex(storedCheck.check_blob);

      const derivedKey = await verifyPassphrase(passphrase, saltBytes, ivBytes, checkBlobBytes);

      if (!derivedKey) {
        setError("Wrong passphrase. Please try again.");
        setLoading(false);
        return;
      }

      onUnlock(derivedKey, saltBytes);
    } catch {
      setError("Something went wrong. Please try again.");
      setLoading(false);
    }
  }

  return (
    <div className="bg-background flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-8">
        <div>
          <h1 className="text-foreground text-2xl font-bold">Unlock your journal</h1>
          <p className="text-foreground/60 mt-1 text-sm">
            Enter your passphrase to decrypt your entries.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="unlock-passphrase"
              className="text-foreground block text-sm font-medium"
            >
              Passphrase
            </label>
            <input
              id="unlock-passphrase"
              type="password"
              required
              autoFocus
              value={passphrase}
              onChange={(e) => setPassphrase(e.target.value)}
              className="border-foreground/20 bg-background text-foreground placeholder:text-foreground/40 focus:border-foreground/40 mt-1 block w-full rounded-md border px-3 py-2 text-sm focus:outline-none"
              placeholder="Your passphrase"
            />
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="bg-foreground text-background w-full rounded-md px-4 py-2 text-sm font-medium transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {loading ? "Unlocking..." : "Unlock"}
          </button>
        </form>
      </div>
    </div>
  );
}
