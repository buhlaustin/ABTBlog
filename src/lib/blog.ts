import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import { authorCard } from "@/lib/profile";

const blogDirectory = path.join(process.cwd(), "content", "blog");

export const defaultBlogAuthor = authorCard.name;

export interface BlogPost {
  slug: string;
  title: string;
  date: string;
  description: string;
  tags: string[];
  author: string;
  content: string;
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

      return {
        slug,
        title: String(data.title ?? slug),
        date: String(data.date ?? ""),
        description: String(data.description ?? ""),
        tags: Array.isArray(data.tags) ? data.tags.map(String) : [],
        author: String(data.author ?? defaultBlogAuthor),
        content,
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
