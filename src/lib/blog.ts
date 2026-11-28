import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import { authorCard } from "@/lib/profile";

const blogDirectory = path.join(process.cwd(), "content", "blog");

export const defaultBlogAuthor = authorCard.name;

export interface BlogPlayable {
  title: string;
  entry: string;
  workHref?: string;
}

/**
 * gray-matter parses an unquoted YAML date as a Date. String(date) is a
 * locale string, not YYYY-MM-DD, so slicing it and parsing again is Invalid Date.
 */
export function blogDateToIso(value: unknown): string {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    const year = value.getUTCFullYear();
    const month = String(value.getUTCMonth() + 1).padStart(2, "0");
    const day = String(value.getUTCDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }
  if (typeof value === "string") {
    const match = /^(\d{4}-\d{2}-\d{2})/.exec(value.trim());
    if (match) return match[1];
  }
  return "";
}

/** Calendar date from a YYYY-MM-DD string. Stays on that day in static HTML. */
export function formatBlogDate(isoDate: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(isoDate)) return "";
  return new Date(`${isoDate}T00:00:00Z`).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });
}

export interface BlogPost {
  slug: string;
  title: string;
  date: string;
  description: string;
  tags: string[];
  author: string;
  content: string;
  playable?: BlogPlayable;
}

export function getAllPosts(): BlogPost[] {
  if (!fs.existsSync(blogDirectory)) {
    return [];
  }

  const files = fs.readdirSync(blogDirectory).filter((f) => f.endsWith(".md"));

  return files
    .map((filename) => {
      const raw = fs.readFileSync(path.join(blogDirectory, filename), "utf8");
      const { data, content } = matter(raw);
      const slug =
        (typeof data.slug === "string" ? data.slug : null) ??
        filename.replace(/\.md$/, "");

      const playableRaw = data.playable;
      let playable: BlogPlayable | undefined;
      if (playableRaw && typeof playableRaw === "object" && !Array.isArray(playableRaw)) {
        const p = playableRaw as Record<string, unknown>;
        if (typeof p.title === "string" && typeof p.entry === "string") {
          playable = {
            title: p.title,
            entry: p.entry,
            workHref: typeof p.workHref === "string" ? p.workHref : undefined,
          };
        }
      }

      return {
        slug,
        title: String(data.title ?? slug),
        date: blogDateToIso(data.date),
        description: String(data.description ?? ""),
        tags: Array.isArray(data.tags) ? data.tags.map(String) : [],
        author: String(data.author ?? defaultBlogAuthor),
        content,
        playable,
      };
    })
    .filter((post) => post.date)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

export function getPostBySlug(slug: string): BlogPost | undefined {
  return getAllPosts().find((post) => post.slug === slug);
}

export function getAllPostSlugs(): string[] {
  return getAllPosts().map((post) => post.slug);
}
