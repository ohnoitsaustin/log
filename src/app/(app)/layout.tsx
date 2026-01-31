import { Sidebar } from "@/components/sidebar";
import { BottomNav } from "@/components/bottom-nav";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-background flex min-h-screen">
      <Sidebar />
      <main className="flex-1 pb-16 md:pb-0 md:pl-64">
        <div className="mx-auto max-w-3xl px-4 py-8">{children}</div>
      </main>
      <BottomNav />
    </div>
  );
}
