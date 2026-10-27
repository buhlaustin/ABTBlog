import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { MarkdownContent } from "@/components/markdown-content";
import { getWorkItem, type WorkItem, workItems } from "@/lib/work-registry";
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
  return workItems
    .filter((entry) => entry.kind !== "hosted")
    .map((entry) => ({ slug: entry.slug }));
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
    <main className="mx-auto w-full max-w-2xl flex-1 px-safe py-10 sm:py-16">
      <Link
        href="/work/"
        className="inline-flex min-h-11 items-center text-sm font-semibold text-accent hover:text-blue-700 active:text-blue-800"
      >
        ← All work
      </Link>
      <h1 className="font-display mt-4 text-3xl font-bold tracking-tight sm:mt-6 sm:text-4xl">
        {item.title}
      </h1>
      <p className="mt-4 text-muted">{item.summary}</p>
      {item.repoUrl ? (
        <a
          href={item.repoUrl}
          className="mt-8 inline-flex min-h-11 items-center rounded-full bg-foreground px-5 py-2.5 text-sm font-semibold text-white hover:bg-zinc-800 active:bg-zinc-700"
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

  if (item.kind === "hosted") {
    notFound();
  }

  return <ExternalWorkDetail item={item} />;
}
