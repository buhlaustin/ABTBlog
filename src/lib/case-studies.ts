import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";

const caseStudiesDirectory = path.join(process.cwd(), "content", "case-studies");

export interface CaseStudy {
  slug: string;
  title: string;
  date: string;
  client: string;
  clientType: string;
  role: string;
  timeframe: string;
  stack: string[];
  summary: string;
  metaDescription: string;
  problem: string;
  approach: string;
  results: string[];
  quote: string;
  quoteAuthor: string;
  featured: boolean;
  relatedOfferSlug: string;
  content: string;
}

export function getAllCaseStudies(): CaseStudy[] {
  if (!fs.existsSync(caseStudiesDirectory)) {
    return [];
  }

  const files = fs
    .readdirSync(caseStudiesDirectory)
    .filter((f) => f.endsWith(".md") && !f.startsWith("_"));

  return files
    .map((filename) => {
      const raw = fs.readFileSync(
        path.join(caseStudiesDirectory, filename),
        "utf8",
      );
      const { data, content } = matter(raw);
      const slug =
        (typeof data.slug === "string" ? data.slug : null) ??
        filename.replace(/\.md$/, "");

      return {
        slug,
        title: String(data.title ?? slug),
        date: String(data.date ?? ""),
        client: String(data.client ?? ""),
        clientType: String(data.clientType ?? ""),
        role: String(data.role ?? ""),
        timeframe: String(data.timeframe ?? ""),
        stack: Array.isArray(data.stack) ? data.stack.map(String) : [],
        summary: String(data.summary ?? ""),
        metaDescription: String(
          data.metaDescription ?? data.summary ?? "",
        ),
        problem: String(data.problem ?? ""),
        approach: String(data.approach ?? ""),
        results: Array.isArray(data.results) ? data.results.map(String) : [],
        quote: String(data.quote ?? ""),
        quoteAuthor: String(data.quoteAuthor ?? ""),
        featured: Boolean(data.featured),
        relatedOfferSlug: String(data.relatedOfferSlug ?? ""),
        content,
      };
    })
    .filter((study) => study.date)
    .sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
    );
}

export function getCaseStudyBySlug(slug: string): CaseStudy | undefined {
  return getAllCaseStudies().find((study) => study.slug === slug);
}

export function getAllCaseStudySlugs(): string[] {
  return getAllCaseStudies().map((study) => study.slug);
}