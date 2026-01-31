import Link from "next/link";

export default function LandingPage() {
  return (
    <div className="bg-background flex min-h-screen flex-col items-center justify-center">
      <h1 className="text-foreground mb-2 text-4xl font-bold tracking-tight">Log</h1>
      <p className="text-foreground/60 mb-8 text-lg">Your private, encrypted journal.</p>
      <Link
        href="/sign-in"
        className="bg-foreground text-background rounded-full px-8 py-3 text-sm font-medium transition-opacity hover:opacity-90"
      >
        Log in
      </Link>
    </div>
  );
}
