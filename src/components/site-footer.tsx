import { siteConfig } from "@/lib/site";

export function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-border/60">
      <div className="mx-auto flex max-w-5xl flex-col gap-3 px-safe pb-safe pt-10 text-sm text-muted sm:flex-row sm:items-center sm:justify-between">
        <p>
          © {new Date().getFullYear()} {siteConfig.name}
        </p>
        <p className="flex flex-wrap gap-x-5 gap-y-1">
          <a
            href={siteConfig.github}
            className="transition hover:text-accent"
            target="_blank"
            rel="noopener noreferrer"
          >
            GitHub
          </a>
          <a href="/rss.xml" className="transition hover:text-accent">
            RSS
          </a>
        </p>
      </div>
    </footer>
  );
}
