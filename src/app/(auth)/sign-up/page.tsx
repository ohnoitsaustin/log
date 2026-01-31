"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function SignUpPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const supabase = createClient();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    setLoading(true);

    const { error } = await supabase.auth.signUp({ email, password });

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
          We sent a confirmation link to <strong>{email}</strong>. Click it to activate your
          account.
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
      <h1 className="text-foreground text-2xl font-bold">Create account</h1>
      <p className="text-foreground/60 mt-1 text-sm">Start your private, encrypted journal.</p>

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

        <div>
          <label htmlFor="confirmPassword" className="text-foreground block text-sm font-medium">
            Confirm password
          </label>
          <input
            id="confirmPassword"
            type="password"
            required
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
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
          {loading ? "Creating account..." : "Create account"}
        </button>
      </form>

      <p className="text-foreground/60 mt-4 text-sm">
        Already have an account?{" "}
        <Link href="/sign-in" className="hover:text-foreground">
          Sign in
        </Link>
      </p>
    </div>
  );
}
