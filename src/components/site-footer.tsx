import { siteConfig } from "@/lib/site";

export function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-zinc-200/80 dark:border-zinc-800">
      <div className="mx-auto flex max-w-5xl flex-col gap-2 px-4 py-8 text-sm text-zinc-500 sm:flex-row sm:items-center sm:justify-between sm:px-6 dark:text-zinc-400">
        <p>
          © {new Date().getFullYear()} {siteConfig.name}
        </p>
        <p className="flex flex-wrap gap-x-4 gap-y-1">
          <a
            href={siteConfig.github}
            className="hover:text-zinc-800 dark:hover:text-zinc-200"
            target="_blank"
            rel="noopener noreferrer"
          >
            GitHub
          </a>
          <a
            href="/rss.xml"
            className="hover:text-zinc-800 dark:hover:text-zinc-200"
          >
            RSS
          </a>
        </p>
      </div>
    </footer>
  );
}
