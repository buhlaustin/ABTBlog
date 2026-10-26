import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { HostedWorkFrame } from "@/components/hosted-work-frame";
import { MarkdownContent } from "@/components/markdown-content";
import {
  getAllWorkSlugs,
  getWorkItem,
  type WorkItem,
} from "@/lib/work-registry";
import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";

interface PageProps {
  params: Promise<{ slug: string }>;
}

function getWorkMarkdown(slug: string): string | null {
  const filePath = path.join(process.cwd(), "content", "work", `${slug}.md`);
  if (!fs.existsSync(filePath)) return null;
  const raw = fs.readFileSync(filePath, "utf8");
  return matter(raw).content;
}

export function generateStaticParams() {
  return getAllWorkSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const item = getWorkItem(slug);
  if (!item) return {};
  return {
    title: item.title,
    description: item.summary,
  };
}

function ExternalWorkDetail({ item }: { item: WorkItem }) {
  const extra = getWorkMarkdown(item.slug);

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-12 sm:px-6 sm:py-16">
      <Link
        href="/work/"
        className="text-sm font-semibold text-accent hover:text-emerald-300"
      >
        ← All work
      </Link>
      <h1 className="font-display mt-6 text-4xl font-bold tracking-tight">
        {item.title}
      </h1>
      <p className="mt-4 text-muted">{item.summary}</p>
      {item.repoUrl ? (
        <a
          href={item.repoUrl}
          className="mt-8 inline-flex rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-zinc-950 hover:bg-emerald-300"
          target="_blank"
          rel="noopener noreferrer"
        >
          View on GitHub
        </a>
      ) : null}
      {extra ? (
        <div className="mt-10">
          <MarkdownContent content={extra} />
        </div>
      ) : null}
    </main>
  );
}

export default async function WorkDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const item = getWorkItem(slug);
  if (!item) notFound();

  if (item.kind === "hosted" && item.hostedEntry) {
    return <HostedWorkFrame title={item.title} entryPath={item.hostedEntry} />;
  }

  return <ExternalWorkDetail item={item} />;
}
