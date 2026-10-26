import Link from "next/link";
import { siteConfig } from "@/lib/site";

const nav = [
  { href: "/work/", label: "Work" },
  { href: "/blog/", label: "Blog" },
  { href: "/about/", label: "About" },
];

export function SiteHeader() {
  return (
    <header className="border-b border-zinc-200/80 bg-white/90 backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/90">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
        <Link
          href="/"
          className="font-semibold tracking-tight text-zinc-900 dark:text-zinc-50"
        >
          {siteConfig.name}
        </Link>
        <nav className="flex flex-wrap items-center gap-x-5 gap-y-1 text-sm font-medium text-zinc-600 dark:text-zinc-400">
          {nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="transition hover:text-zinc-900 dark:hover:text-zinc-100"
            >
              {item.label}
            </Link>
          ))}
          <a
            href={siteConfig.github}
            className="transition hover:text-zinc-900 dark:hover:text-zinc-100"
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
