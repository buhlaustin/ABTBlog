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
      className="flex flex-col bg-[#0f1419]"
      style={{ height: "100svh", minHeight: "100vh" }}
    >
      <div className="flex shrink-0 items-center justify-between gap-4 border-b border-zinc-800/80 bg-[#0f1419]/95 px-4 py-3 backdrop-blur sm:px-6">
        <div className="flex items-center gap-3 text-sm">
          <Link
            href="/work/"
            className="font-medium text-emerald-400/90 transition hover:text-emerald-300"
          >
            ← Work
          </Link>
          <span className="text-zinc-600">/</span>
          <span className="font-medium text-zinc-100">{title}</span>
        </div>
        <a
          href={entryPath}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs font-medium text-zinc-500 transition hover:text-zinc-300"
        >
          Open fullscreen
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
