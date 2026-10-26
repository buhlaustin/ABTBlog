import Link from "next/link";
import { siteConfig } from "@/lib/site";

const nav = [
  { href: "/work/", label: "Work" },
  { href: "/blog/", label: "Blog" },
  { href: "/about/", label: "About" },
];

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-border bg-white/90 backdrop-blur-md">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
        <Link href="/" className="group flex flex-col gap-0.5">
          <span className="font-display text-lg font-bold tracking-tight text-foreground">
            {siteConfig.name}
          </span>
          <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted">
            austinbuhltech
          </span>
        </Link>
        <nav className="flex flex-wrap items-center gap-x-1 gap-y-1 text-sm font-medium">
          {nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-lg px-3 py-2 text-muted transition hover:bg-surface-raised hover:text-foreground"
            >
              {item.label}
            </Link>
          ))}
          <a
            href={siteConfig.github}
            className="rounded-lg px-3 py-2 text-muted transition hover:bg-surface-raised hover:text-foreground"
            target="_blank"
            rel="noopener noreferrer"
          >
            GitHub
          </a>
        </nav>
      </div>
    </header>
  );
}
