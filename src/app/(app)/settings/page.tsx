"use client";

import { useTheme } from "@/components/theme-provider";
import { SignOutButton } from "@/components/sign-out-button";

export default function SettingsPage() {
  const { theme, setTheme } = useTheme();

  return (
    <div>
      <h1 className="text-foreground text-2xl font-semibold">Settings</h1>

      <div className="mt-6 space-y-6">
        <div>
          <label htmlFor="theme" className="text-foreground block text-sm font-medium">
            Theme
          </label>
          <select
            id="theme"
            value={theme}
            onChange={(e) => setTheme(e.target.value as "light" | "dark" | "system")}
            className="border-foreground/20 bg-background text-foreground focus:border-foreground/40 mt-1 rounded-md border px-3 py-2 text-sm focus:outline-none"
          >
            <option value="system">System</option>
            <option value="light">Light</option>
            <option value="dark">Dark</option>
          </select>
        </div>

        <div className="border-foreground/10 border-t pt-6 md:hidden">
          <SignOutButton />
        </div>
      </div>
    </div>
  );
}
