import Link from "next/link";

export function Header() {
    return (
        <header className="bg-background border-b border-foreground/10 px-4 py-3 md:px-6 flex justify-between">
            <h1 className="text-foreground text-lg font-semibold">
                <img src="/log.svg" alt="log" className="inline-block w-6 h-6 mr-1" />
                Plog (your personal log)
            </h1>
            <Link
                href="/new-entry"
                className="bg-foreground text-background rounded-md px-3 py-1.5 text-sm font-medium transition-opacity hover:opacity-90"
            >
                New Entry
            </Link>
        </header>
    )
}