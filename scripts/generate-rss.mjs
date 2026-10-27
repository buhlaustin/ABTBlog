import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import matter from "gray-matter";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const blogDir = join(root, "content", "blog");
const siteUrl = "https://austinbuhltech.com";

const files = readdirSync(blogDir).filter((f) => f.endsWith(".md"));

const posts = files
  .map((filename) => {
    const raw = readFileSync(join(blogDir, filename), "utf8");
    const { data } = matter(raw);
    return {
      title: data.title,
      slug: data.slug ?? filename.replace(/\.md$/, ""),
      date: data.date,
      description: data.description ?? "",
      author: data.author ?? "Austin Buhl",
    };
  })
  .filter((p) => p.title && p.date)
  .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

const items = posts
  .map(
    (post) => `
    <item>
      <title>${escapeXml(post.title)}</title>
      <link>${siteUrl}/blog/${post.slug}/</link>
      <guid>${siteUrl}/blog/${post.slug}/</guid>
      <pubDate>${new Date(post.date).toUTCString()}</pubDate>
      <description>${escapeXml(post.description)}</description>
      <author>${escapeXml(post.author)}</author>
    </item>`,
  )
  .join("");

const rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>Austin Buhl</title>
    <link>${siteUrl}</link>
    <description>Personal site — writing and work at austinbuhltech.com</description>
    ${items}
  </channel>
</rss>
`;

writeFileSync(join(root, "public", "rss.xml"), rss.trim() + "\n");
console.log("Generated public/rss.xml");

function escapeXml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
