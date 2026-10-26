import Link from "next/link";
import type { WorkItem } from "@/lib/work-registry";

function StatusBadge({ status }: { status: WorkItem["status"] }) {
  const styles =
    status === "live"
      ? "bg-emerald-500/15 text-emerald-400 ring-emerald-500/30"
      : status === "wip"
        ? "bg-amber-500/15 text-amber-400 ring-amber-500/30"
        : "bg-zinc-500/15 text-zinc-400 ring-zinc-500/30";
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
    <article className="group relative flex flex-col overflow-hidden rounded-2xl border border-border/80 bg-surface/80 p-6 shadow-lg shadow-black/20 transition duration-300 hover:border-emerald-500/40 hover:shadow-emerald-950/20">
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-emerald-500/5 via-transparent to-transparent opacity-0 transition group-hover:opacity-100" />
      <div className="relative mb-4 flex items-start justify-between gap-3">
        <h2 className="font-display text-xl font-bold tracking-tight text-foreground">
          <Link href={href} className="hover:text-accent">
            {item.title}
          </Link>
        </h2>
        <StatusBadge status={item.status} />
      </div>
      <p className="relative mb-5 flex-1 text-sm leading-relaxed text-muted">
        {item.summary}
      </p>
      <div className="relative mb-5 flex flex-wrap gap-2">
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
        className="relative inline-flex items-center gap-1 text-sm font-semibold text-accent transition hover:text-emerald-300"
      >
        {cta}
        <span aria-hidden className="transition group-hover:translate-x-0.5">
          →
        </span>
      </Link>
    </article>
  );
}
