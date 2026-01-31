"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useKey } from "@/components/key-provider";

export function SignOutButton() {
  const router = useRouter();
  const supabase = createClient();
  const { lock } = useKey();

  async function handleSignOut() {
    lock();
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }

  return (
    <button
      onClick={handleSignOut}
      className="text-foreground/60 hover:bg-foreground/5 hover:text-foreground flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors"
    >
      <svg
        className="h-5 w-5"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
        />
      </svg>
      Sign out
    </button>
  );
}
