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
        className="text-sm font-medium text-emerald-700 dark:text-emerald-400"
      >
        ← All work
      </Link>
      <h1 className="mt-4 text-3xl font-semibold tracking-tight">{item.title}</h1>
      <p className="mt-3 text-zinc-600 dark:text-zinc-400">{item.summary}</p>
      {item.repoUrl ? (
        <a
          href={item.repoUrl}
          className="mt-6 inline-flex rounded-full bg-zinc-900 px-5 py-2.5 text-sm font-medium text-white dark:bg-zinc-100 dark:text-zinc-900"
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
