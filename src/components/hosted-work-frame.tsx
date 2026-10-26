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
    <div className="flex min-h-[calc(100vh-3.5rem)] flex-col bg-zinc-950">
      <div className="flex items-center justify-between gap-4 border-b border-zinc-800 px-4 py-2 sm:px-6">
        <div className="flex items-center gap-3 text-sm">
          <Link
            href="/work/"
            className="font-medium text-zinc-400 transition hover:text-zinc-100"
          >
            ← Work
          </Link>
          <span className="text-zinc-600">/</span>
          <span className="font-medium text-zinc-100">{title}</span>
        </div>
      </div>
      <iframe
        title={title}
        src={entryPath}
        className="min-h-0 flex-1 w-full border-0 bg-zinc-950"
        allow="fullscreen"
      />
    </div>
  );
}
