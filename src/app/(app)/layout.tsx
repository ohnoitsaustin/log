"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Sidebar } from "@/components/sidebar";
import { BottomNav } from "@/components/bottom-nav";
import { KeyProvider } from "@/components/key-provider";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "n") {
        e.preventDefault();
        router.push("/new-entry");
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [router]);

  return (
    <KeyProvider>
      <div className="bg-background flex min-h-screen">
        <Sidebar />
        <main className="flex-1 pb-16 md:pb-0 md:pl-64">
          <div className="mx-auto max-w-3xl px-4 py-8">{children}</div>
        </main>
        <BottomNav />
      </div>
    </KeyProvider>
  );
}
