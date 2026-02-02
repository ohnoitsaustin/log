"use client";

import { useEffect, useState, useCallback } from "react";
import { Sidebar } from "@/components/sidebar";
import { BottomNav } from "@/components/bottom-nav";
import { KeyProvider } from "@/components/key-provider";
import { Header } from "@/components/header";
import { QuickEntryModal } from "@/components/quick-entry-modal";
import { createClient } from "@/lib/supabase/client";
import {
  listActivities,
  seedDefaultActivities,
  type Activity,
} from "@/lib/activities";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const [showQuickEntry, setShowQuickEntry] = useState(false);
  const [activities, setActivities] = useState<Activity[]>([]);
  const supabase = createClient();

  const loadActivities = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    let list = await listActivities(supabase);
    if (list.length === 0) {
      list = await seedDefaultActivities(supabase, user.id);
    }
    setActivities(list);
  }, [supabase]);

  useEffect(() => {
    loadActivities();
  }, [loadActivities]);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "n") {
        e.preventDefault();
        setShowQuickEntry(true);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <KeyProvider>
      <div className="bg-background flex min-h-screen">
        <Sidebar onNewEntry={() => setShowQuickEntry(true)} />
        <main className="flex-1 pb-16 md:pb-0 md:pl-64">
          <Header onNewEntry={() => setShowQuickEntry(true)} />
          <div className="mx-auto max-w-3xl px-4 py-8">{children}</div>
        </main>
        <BottomNav onNewEntry={() => setShowQuickEntry(true)} />
        {showQuickEntry && (
          <QuickEntryModal
            activities={activities}
            onClose={() => setShowQuickEntry(false)}
          />
        )}
      </div>
    </KeyProvider>
  );
}
