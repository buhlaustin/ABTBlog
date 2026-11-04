import type { Metadata } from "next";
import { siteConfig } from "@/lib/site";

const ogImage = {
  url: siteConfig.ogImage,
  width: 1200,
  height: 630,
  alt: siteConfig.ogImageAlt,
} as const;

function absoluteUrl(path: string): string {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return new URL(normalized, siteConfig.url).href;
}

type PageMetadataInput = {
  /** Short page title (layout adds ` · Austin Buhl` unless absoluteTitle). */
  title: string;
  description: string;
  /** Site path with trailing slash, e.g. `/blog/` or `/about/`. */
  path: string;
  absoluteTitle?: boolean;
  noIndex?: boolean;
  openGraphType?: "website" | "article";
  publishedTime?: string;
  modifiedTime?: string;
  authors?: string[];
  tags?: string[];
};

/** Per-page metadata with canonical URL, Open Graph, and Twitter cards. */
export function pageMetadata(input: PageMetadataInput): Metadata {
  const canonical = absoluteUrl(input.path);
  const socialTitle = input.absoluteTitle
    ? input.title
    : `${input.title} · ${siteConfig.name}`;

  const openGraph: Metadata["openGraph"] =
    input.openGraphType === "article"
      ? {
          title: socialTitle,
          description: input.description,
          url: canonical,
          siteName: siteConfig.name,
          locale: siteConfig.locale,
          type: "article",
          images: [ogImage],
          publishedTime: input.publishedTime,
          modifiedTime: input.modifiedTime,
          authors: input.authors,
          tags: input.tags,
        }
      : {
          title: socialTitle,
          description: input.description,
          url: canonical,
          siteName: siteConfig.name,
          locale: siteConfig.locale,
          type: "website",
          images: [ogImage],
        };

  return {
    title: input.absoluteTitle ? { absolute: input.title } : input.title,
    description: input.description,
    alternates: { canonical },
    openGraph,
    twitter: {
      card: "summary_large_image",
      title: socialTitle,
      description: input.description,
      images: [siteConfig.ogImage],
    },
    robots: input.noIndex ? { index: false, follow: false } : undefined,
  };
}

/** Root layout defaults (homepage + fallback). */
export function rootSiteMetadata(): Metadata {
  return {
    metadataBase: new URL(siteConfig.url),
    title: {
      default: siteConfig.defaultTitle,
      template: `%s · ${siteConfig.name}`,
    },
    description: siteConfig.description,
    applicationName: siteConfig.name,
    authors: [{ name: siteConfig.name, url: siteConfig.url }],
    creator: siteConfig.name,
    icons: {
      icon: [{ url: siteConfig.favicon, type: "image/svg+xml" }],
    },
    openGraph: {
      title: siteConfig.defaultTitle,
      description: siteConfig.description,
      url: siteConfig.url,
      siteName: siteConfig.name,
      locale: siteConfig.locale,
      type: "website",
      images: [ogImage],
    },
    twitter: {
      card: "summary_large_image",
      title: siteConfig.defaultTitle,
      description: siteConfig.description,
      images: [siteConfig.ogImage],
    },
  };
}

export function personJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "Person",
    name: siteConfig.name,
    url: siteConfig.url,
    jobTitle: "Software Engineer",
    description: siteConfig.description,
    address: {
      "@type": "PostalAddress",
      addressLocality: "Knoxville",
      addressRegion: "TN",
      addressCountry: "US",
    },
    sameAs: [siteConfig.github, "https://www.linkedin.com/in/austinbuhl20"],
  };
}

export function articleJsonLd(input: {
  title: string;
  description: string;
  path: string;
  datePublished: string;
  authorName: string;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: input.title,
    description: input.description,
    datePublished: input.datePublished,
    author: {
      "@type": "Person",
      name: input.authorName,
    },
    mainEntityOfPage: absoluteUrl(input.path),
    publisher: {
      "@type": "Person",
      name: siteConfig.name,
    },
  };
}
