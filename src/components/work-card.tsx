import Link from "next/link";
import type { WorkItem } from "@/lib/work-registry";

function StatusBadge({ status }: { status: WorkItem["status"] }) {
  const label =
    status === "live" ? "Live" : status === "wip" ? "WIP" : "Archived";
  return (
    <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium uppercase tracking-wide text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
      {label}
    </span>
  );
}

export function WorkCard({ item }: { item: WorkItem }) {
  const href = `/work/${item.slug}/`;
  const cta =
    item.kind === "hosted" ? "Play" : item.repoUrl ? "View repo" : "Details";

  return (
    <article className="flex flex-col rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm transition hover:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-900/50 dark:hover:border-zinc-700">
      <div className="mb-3 flex items-start justify-between gap-2">
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
          <Link href={href} className="hover:underline">
            {item.title}
          </Link>
        </h2>
        <StatusBadge status={item.status} />
      </div>
      <p className="mb-4 flex-1 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
        {item.summary}
      </p>
      <div className="flex flex-wrap items-center gap-2">
        {item.tags.map((tag) => (
          <span
            key={tag}
            className="rounded-md bg-zinc-50 px-2 py-0.5 text-xs text-zinc-500 dark:bg-zinc-800/80 dark:text-zinc-400"
          >
            {tag}
          </span>
        ))}
      </div>
      <Link
        href={href}
        className="mt-4 inline-flex text-sm font-medium text-emerald-700 hover:text-emerald-800 dark:text-emerald-400 dark:hover:text-emerald-300"
      >
        {cta} →
      </Link>
    </article>
  );
}
