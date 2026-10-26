import Link from "next/link";
import type { WorkItem } from "@/lib/work-registry";

function StatusBadge({ status }: { status: WorkItem["status"] }) {
  const styles =
    status === "live"
      ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
      : status === "wip"
        ? "bg-amber-50 text-amber-800 ring-amber-200"
        : "bg-zinc-100 text-zinc-600 ring-zinc-200";
  const label =
    status === "live" ? "Live" : status === "wip" ? "WIP" : "Archived";

  return (
    <span
      className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide ring-1 ring-inset ${styles}`}
    >
      {label}
    </span>
  );
}

export function WorkCard({ item }: { item: WorkItem }) {
  const href = `/work/${item.slug}/`;
  const cta =
    item.kind === "hosted" ? "Play" : item.repoUrl ? "View repo" : "Details";

  return (
    <article className="group flex flex-col rounded-2xl border border-border bg-white p-6 shadow-sm transition hover:border-zinc-300 hover:shadow-md">
      <div className="mb-4 flex items-start justify-between gap-3">
        <h2 className="font-display text-xl font-bold tracking-tight text-foreground">
          <Link href={href} className="hover:text-accent">
            {item.title}
          </Link>
        </h2>
        <StatusBadge status={item.status} />
      </div>
      <p className="mb-5 flex-1 text-sm leading-relaxed text-muted">
        {item.summary}
      </p>
      <div className="mb-5 flex flex-wrap gap-2">
        {item.tags.map((tag) => (
          <span
            key={tag}
            className="rounded-md bg-surface-raised px-2 py-0.5 font-mono text-[11px] text-muted"
          >
            {tag}
          </span>
        ))}
      </div>
      <Link
        href={href}
        className="inline-flex items-center gap-1 text-sm font-semibold text-accent transition hover:text-blue-700"
      >
        {cta}
        <span aria-hidden className="transition group-hover:translate-x-0.5">
          →
        </span>
      </Link>
    </article>
  );
}
