"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const supabase = createClient();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/sign-in`,
    });

    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      setSuccess(true);
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div>
        <h1 className="text-foreground text-2xl font-bold">Check your email</h1>
        <p className="text-foreground/60 mt-2 text-sm">
          If an account exists for <strong>{email}</strong>, we sent a password reset link.
        </p>
        <Link
          href="/sign-in"
          className="text-foreground/60 hover:text-foreground mt-4 inline-block text-sm"
        >
          Back to sign in
        </Link>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-foreground text-2xl font-bold">Reset password</h1>
      <p className="text-foreground/60 mt-1 text-sm">
        Enter your email and we&apos;ll send a reset link.
      </p>

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

        {error && <p className="text-sm text-red-500">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="bg-foreground text-background w-full rounded-md px-4 py-2 text-sm font-medium transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {loading ? "Sending..." : "Send reset link"}
        </button>
      </form>

      <Link
        href="/sign-in"
        className="text-foreground/60 hover:text-foreground mt-4 inline-block text-sm"
      >
        Back to sign in
      </Link>
    </div>
  );
}
