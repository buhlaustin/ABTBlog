import type { Metadata } from "next";
import { ventures } from "@/lib/profile";
import type { ServiceOffer } from "@/lib/services";
import {
  serviceGeo,
  serviceOffers,
  servicesContact,
  servicesPageSeo,
  servicesSchema,
} from "@/lib/services";
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
    jobTitle: "Software engineer and founder",
    description: siteConfig.description,
    knowsAbout: [
      "Games",
      "Classroom software",
      "Writing",
      "Android",
      "Web",
    ],
    address: {
      "@type": "PostalAddress",
      addressLocality: "Knoxville",
      addressRegion: "TN",
      addressCountry: "US",
    },
    worksFor: [
      {
        "@type": "Organization",
        name: ventures.classQuip.name,
        url: ventures.classQuip.url,
      },
      {
        "@type": "Organization",
        name: ventures.novuxGames.name,
        url: ventures.novuxGames.url,
      },
    ],
    sameAs: [
      siteConfig.github,
      siteConfig.twitter,
      "https://www.linkedin.com/in/austinbuhl20",
    ],
  };
}

export function faqPageJsonLd(
  items: ReadonlyArray<{ question: string; answer: string }>,
) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.answer,
      },
    })),
  };
}

export function breadcrumbJsonLd(
  items: ReadonlyArray<{ name: string; path: string }>,
) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: absoluteUrl(item.path),
    })),
  };
}

export function technicalServicesJsonLd() {
  const pageUrl = absoluteUrl("/services/");
  const blogUrl = absoluteUrl("/blog/open-for-professional-services/");
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        "@id": `${pageUrl}#webpage`,
        url: pageUrl,
        name: `${servicesPageSeo.h1} | ${siteConfig.name}`,
        description: servicesPageSeo.metaDescription,
        isPartOf: { "@id": `${siteConfig.url}/#website` },
        about: { "@id": `${pageUrl}#service` },
        breadcrumb: { "@id": `${pageUrl}#breadcrumb` },
        speakable: {
          "@type": "SpeakableSpecification",
          cssSelector: [".services-hero-lead", ".services-hero-support"],
        },
        significantLink: [blogUrl, absoluteUrl("/work/"), absoluteUrl("/about/")],
      },
      {
        "@type": "BreadcrumbList",
        "@id": `${pageUrl}#breadcrumb`,
        itemListElement: [
          {
            "@type": "ListItem",
            position: 1,
            name: "Home",
            item: siteConfig.url,
          },
          {
            "@type": "ListItem",
            position: 2,
            name: "Technical Services",
            item: pageUrl,
          },
        ],
      },
      {
        "@type": "WebSite",
        "@id": `${siteConfig.url}/#website`,
        url: siteConfig.url,
        name: siteConfig.name,
      },
      {
        "@type": "ProfessionalService",
        "@id": `${pageUrl}#service`,
        name: "Austin Buhl: EdTech Integration and Real-Time Engineering",
        alternateName: [
          "LTI 1.3 developer",
          "OneRoster integration consultant",
          "EdTech integration consultant",
          "Knoxville software consultant",
        ],
        url: pageUrl,
        image: absoluteUrl(siteConfig.ogImage),
        description: servicesPageSeo.metaDescription,
        telephone: servicesContact.phoneTel,
        email: servicesContact.email,
        priceRange: "$$$",
        serviceType: [...servicesSchema.serviceTypes],
        areaServed: [
          { "@type": "Country", name: "United States" },
          { "@type": "State", name: "Tennessee" },
          {
            "@type": "AdministrativeArea",
            name: "East Tennessee",
          },
          {
            "@type": "City",
            name: serviceGeo.locality,
            containedInPlace: {
              "@type": "State",
              name: "Tennessee",
            },
          },
        ],
        address: {
          "@type": "PostalAddress",
          addressLocality: serviceGeo.locality,
          addressRegion: serviceGeo.region,
          addressCountry: serviceGeo.country,
        },
        geo: {
          "@type": "GeoCoordinates",
          latitude: serviceGeo.latitude,
          longitude: serviceGeo.longitude,
        },
        provider: {
          "@type": "Person",
          name: siteConfig.name,
          url: siteConfig.url,
          jobTitle: "EdTech Integration Engineer & Founder",
          knowsAbout: [...servicesSchema.knowsAbout],
          sameAs: [
            siteConfig.github,
            siteConfig.twitter,
            "https://www.linkedin.com/in/austinbuhl20",
          ],
        },
        hasOfferCatalog: {
          "@type": "OfferCatalog",
          name: "EdTech integration offers",
          itemListElement: serviceOffers.map((offering, index) => {
            const offer: Record<string, unknown> = {
              "@type": "Offer",
              position: index + 1,
              itemOffered: {
                "@type": "Service",
                name: offering.name,
                description: offering.oneLiner,
                url: absoluteUrl(`/services/${offering.slug}/`),
                areaServed: "United States",
              },
            };
            if (!offering.price.includes("[")) {
              offer.priceSpecification = {
                "@type": "PriceSpecification",
                price: offering.price,
              };
            }
            return offer;
          }),
        },
      },
    ],
  };
}

export function serviceOfferJsonLd(offer: ServiceOffer) {
  const pageUrl = absoluteUrl(`/services/${offer.slug}/`);
  const graph: Record<string, unknown>[] = [
    {
      "@type": "Service",
      "@id": `${pageUrl}#service`,
      name: offer.name,
      description: offer.oneLiner,
      url: pageUrl,
      provider: {
        "@type": "Person",
        name: siteConfig.name,
        url: siteConfig.url,
      },
      areaServed: "United States",
    },
    {
      "@type": "BreadcrumbList",
      itemListElement: [
        {
          "@type": "ListItem",
          position: 1,
          name: "Home",
          item: siteConfig.url,
        },
        {
          "@type": "ListItem",
          position: 2,
          name: "Services",
          item: absoluteUrl("/services/"),
        },
        {
          "@type": "ListItem",
          position: 3,
          name: offer.name,
          item: pageUrl,
        },
      ],
    },
  ];
  return {
    "@context": "https://schema.org",
    "@graph": graph,
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
