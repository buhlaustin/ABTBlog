import Link from "next/link";
import { SiteLogo } from "@/components/site-logo";
import { siteConfig } from "@/lib/site";

const nav = [
  { href: "/work/", label: "Work" },
  { href: "/blog/", label: "Blog" },
  { href: "/about/", label: "About" },
];

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-border bg-white/90 backdrop-blur-md">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3 sm:px-6 sm:py-4">
        <Link href="/" className="shrink-0 transition opacity-90 hover:opacity-100">
          <SiteLogo variant="header" />
          <span className="sr-only">{siteConfig.name}</span>
        </Link>
        <nav className="flex flex-wrap items-center justify-end gap-x-1 gap-y-1 text-sm font-medium">
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
