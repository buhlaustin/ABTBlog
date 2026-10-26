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
      <div className="flex shrink-0 items-center justify-between gap-4 border-b border-border bg-white px-4 py-2.5 sm:px-6">
        <div className="flex items-center gap-2 text-sm text-muted">
          <Link
            href="/work/"
            className="font-medium text-foreground transition hover:text-accent"
          >
            ← Work
          </Link>
          <span aria-hidden>/</span>
          <span className="font-medium text-foreground">{title}</span>
        </div>
        <a
          href={entryPath}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs font-medium text-muted transition hover:text-accent"
        >
          Open in new tab
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
