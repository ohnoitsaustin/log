"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function SignInPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      router.push("/timeline");
      router.refresh();
    }
  }

  return (
    <div>
      <h1 className="text-foreground text-2xl font-bold">Sign in</h1>
      <p className="text-foreground/60 mt-1 text-sm">Welcome back to your journal.</p>

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <div>
          <label htmlFor="email" className="text-foreground block text-sm font-medium">
            Email
          </label>
          <input
            id="email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="border-foreground/20 bg-background text-foreground placeholder:text-foreground/40 focus:border-foreground/40 mt-1 block w-full rounded-md border px-3 py-2 text-sm focus:outline-none"
            placeholder="you@example.com"
          />
        </div>

        <div>
          <label htmlFor="password" className="text-foreground block text-sm font-medium">
            Password
          </label>
          <input
            id="password"
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="border-foreground/20 bg-background text-foreground placeholder:text-foreground/40 focus:border-foreground/40 mt-1 block w-full rounded-md border px-3 py-2 text-sm focus:outline-none"
            placeholder="••••••••"
          />
        </div>

        {error && <p className="text-sm text-red-500">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="bg-foreground text-background w-full rounded-md px-4 py-2 text-sm font-medium transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {loading ? "Signing in..." : "Sign in"}
        </button>
      </form>

      <div className="mt-4 flex justify-between text-sm">
        <Link href="/sign-up" className="text-foreground/60 hover:text-foreground">
          Create account
        </Link>
        <Link href="/forgot-password" className="text-foreground/60 hover:text-foreground">
          Forgot password?
        </Link>
      </div>
    </div>
  );
}
