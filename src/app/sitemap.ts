import type { MetadataRoute } from "next";
import { getAllPosts } from "@/lib/blog";
import { siteConfig } from "@/lib/site";
import { workItems } from "@/lib/work-registry";

export const dynamic = "force-static";

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${siteConfig.url}/`, lastModified, changeFrequency: "weekly", priority: 1 },
    { url: `${siteConfig.url}/about/`, lastModified, changeFrequency: "monthly", priority: 0.8 },
    { url: `${siteConfig.url}/blog/`, lastModified, changeFrequency: "weekly", priority: 0.9 },
    { url: `${siteConfig.url}/work/`, lastModified, changeFrequency: "weekly", priority: 0.9 },
  ];

  const posts: MetadataRoute.Sitemap = getAllPosts().map((post) => ({
    url: `${siteConfig.url}/blog/${post.slug}/`,
    lastModified: new Date(post.date),
    changeFrequency: "monthly" as const,
    priority: 0.7,
  }));

  const work: MetadataRoute.Sitemap = workItems.map((item) => ({
    url: `${siteConfig.url}/work/${item.slug}/`,
    lastModified,
    changeFrequency: "monthly" as const,
    priority: item.featured ? 0.85 : 0.65,
  }));

  return [...staticRoutes, ...posts, ...work];
}
