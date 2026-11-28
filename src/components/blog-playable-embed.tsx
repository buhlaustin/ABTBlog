"use client";

import Link from "next/link";

/** Inline iframe for blog posts that ship a companion sim under /play/. */
export function BlogPlayableEmbed({
  title,
  entryPath,
  workHref,
}: {
  title: string;
  entryPath: string;
  workHref?: string;
}) {
  return (
    <aside
      className="not-prose my-10 overflow-hidden rounded-2xl border border-border bg-zinc-950 shadow-sm"
      aria-label={`Play ${title}`}
    >
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/80 bg-surface-raised px-4 py-3">
        <p className="text-sm font-semibold text-foreground">{title}</p>
        <div className="flex items-center gap-3 text-xs font-medium text-muted">
          {workHref ? (
            <Link href={workHref} className="text-accent hover:underline">
              Full screen
            </Link>
          ) : null}
          <a href={entryPath} target="_blank" rel="noopener noreferrer" className="hover:text-foreground">
            New tab ↗
          </a>
        </div>
      </div>
      <iframe
        title={title}
        src={entryPath}
        className="w-full border-0 bg-[#0d1210]"
        style={{ height: "min(72vh, 640px)", minHeight: 420 }}
        loading="lazy"
        allow="fullscreen"
      />
    </aside>
  );
}