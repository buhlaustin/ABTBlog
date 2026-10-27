"use client";

import Link from "next/link";

export function HostedWorkFrame({
  title,
  entryPath,
}: {
  title: string;
  entryPath: string;
}) {
  return (
    <div
      className="flex flex-col bg-zinc-100"
      style={{ height: "100svh", minHeight: "100vh" }}
    >
      <div className="flex shrink-0 items-center justify-between gap-2 border-b border-border bg-white px-safe py-2.5 pt-[max(0.625rem,env(safe-area-inset-top,0px))]">
        <div className="flex min-w-0 flex-1 items-center gap-2 text-sm text-muted">
          <Link
            href="/work/"
            className="inline-flex min-h-10 shrink-0 items-center font-medium text-foreground transition hover:text-accent active:text-accent"
          >
            ← Work
          </Link>
          <span className="hidden shrink-0 sm:inline" aria-hidden>
            /
          </span>
          <span className="truncate font-medium text-foreground">{title}</span>
        </div>
        <a
          href={entryPath}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex min-h-10 shrink-0 items-center whitespace-nowrap px-2 text-xs font-medium text-muted transition hover:text-accent active:text-accent"
        >
          New tab
        </a>
      </div>
      <iframe
        title={title}
        src={entryPath}
        className="w-full flex-1 border-0 bg-[#0f1419]"
        style={{ minHeight: 0, flex: "1 1 auto" }}
        allow="fullscreen"
      />
    </div>
  );
}
