import Link from "next/link";
import { JsonLd } from "@/components/json-ld";
import { profile, siteConfig } from "@/lib/profile";
import { serviceOfferings, servicesContact, servicesFaqs } from "@/lib/services";
import {
  faqPageJsonLd,
  pageMetadata,
  technicalServicesJsonLd,
} from "@/lib/seo";

export const metadata = pageMetadata({
  title: "Technical Services",
  description: `Software development and consultation—${siteConfig.name}, ${siteConfig.location}. Remote US. ${servicesContact.email}, ${servicesContact.phoneDisplay}.`,
  path: "/services/",
});

function ServiceSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-12 border-t border-border pt-10 first:mt-0 first:border-t-0 first:pt-0">
      <h2 className="font-display text-xl font-bold tracking-tight text-foreground">
        {title}
      </h2>
      <div className="mt-4 space-y-4 text-base leading-relaxed text-muted">
        {children}
      </div>
    </section>
  );
}

export default function ServicesPage() {
  return (
    <>
      <JsonLd data={technicalServicesJsonLd()} />
      <JsonLd data={faqPageJsonLd(servicesFaqs)} />
      <main className="mx-auto w-full max-w-3xl flex-1 px-safe py-10 sm:py-16">
        <header>
          <h1 className="font-display text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Technical services
          </h1>
          <p className="mt-2 font-mono text-sm text-muted">
            {siteConfig.location} · remote US
          </p>
          <p className="mt-6 text-base leading-relaxed text-muted">
            I take on freelance development and consulting when capacity allows.
            Examples of personal builds are on{" "}
            <Link href="/work/" className="text-accent hover:underline">
              Work
            </Link>
            ; background on{" "}
            <Link href="/about/" className="text-accent hover:underline">
              About
            </Link>
            .
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <a
              href={`mailto:${servicesContact.email}`}
              className="inline-flex min-h-11 items-center justify-center rounded-full bg-foreground px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-zinc-800"
            >
              {servicesContact.email}
            </a>
            <a
              href={`tel:${servicesContact.phoneTel}`}
              className="inline-flex min-h-11 items-center justify-center rounded-full border border-border bg-white px-5 py-2.5 text-sm font-semibold text-foreground transition hover:bg-surface"
            >
              {servicesContact.phoneDisplay}
            </a>
            <a
              href={siteConfig.twitter}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-11 items-center justify-center rounded-full border border-border bg-white px-5 py-2.5 text-sm font-semibold text-foreground transition hover:bg-surface"
            >
              Follow on Twitter
            </a>
          </div>
        </header>

        <div className="mt-14">
          <ServiceSection title="Services">
            <ul className="list-none space-y-6 pl-0">
              {serviceOfferings.map((offering) => (
                <li
                  key={offering.name}
                  className="rounded-xl border border-border bg-surface p-5"
                >
                  <h3 className="font-display font-bold text-foreground">
                    {offering.name}
                  </h3>
                  <p className="mt-2 text-sm">{offering.summary}</p>
                  <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-foreground">
                    {offering.bullets.map((bullet) => (
                      <li key={bullet}>{bullet}</li>
                    ))}
                  </ul>
                </li>
              ))}
            </ul>
          </ServiceSection>

          <ServiceSection title="FAQ">
            <dl className="space-y-5">
              {servicesFaqs.map((faq) => (
                <div key={faq.question}>
                  <dt className="font-semibold text-foreground">
                    {faq.question}
                  </dt>
                  <dd className="mt-1 text-sm">{faq.answer}</dd>
                </div>
              ))}
            </dl>
          </ServiceSection>

          <ServiceSection title="Contact">
            <p>
              <a
                href={`mailto:${servicesContact.email}`}
                className="text-accent hover:underline"
              >
                {servicesContact.email}
              </a>
              {" · "}
              <a
                href={`tel:${servicesContact.phoneTel}`}
                className="text-accent hover:underline"
              >
                {servicesContact.phoneDisplay}
              </a>
              {" · "}
              <a
                href={profile.linkedIn}
                className="text-accent hover:underline"
                target="_blank"
                rel="noopener noreferrer"
              >
                LinkedIn
              </a>
            </p>
          </ServiceSection>
        </div>
      </main>
    </>
  );
}