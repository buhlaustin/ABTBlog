import Link from "next/link";
import { JsonLd } from "@/components/json-ld";
import { siteConfig } from "@/lib/profile";
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
            Technical Services
          </h1>
          <p className="mt-2 font-mono text-sm text-muted">
            {siteConfig.location} · Remote US
          </p>
          <p className="mt-6 text-base leading-relaxed text-muted">
            Most software projects stall because of over-engineered architecture
            or brittle, rushed code. I step in as a senior solo builder to get
            your product across the finish line—specializing in K–12 EdTech,
            SaaS, and browser-based simulations.
          </p>
          <p className="mt-4 text-base leading-relaxed text-muted">
            See what I&apos;ve built on{" "}
            <Link href="/work/" className="text-accent hover:underline">
              Work
            </Link>{" "}
            or read my background on{" "}
            <Link href="/about/" className="text-accent hover:underline">
              About
            </Link>
            .
          </p>
        </header>

        <div className="mt-14">
          <ServiceSection title="What I Do">
            <ul className="list-none space-y-5 pl-0">
              {serviceOfferings.map((offering) => (
                <li key={offering.name}>
                  <span className="font-semibold text-foreground">
                    {offering.name}:
                  </span>{" "}
                  {offering.summary}
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
                  <dd className="mt-1 text-sm">
                    {faq.question === "How do we kick things off?" ? (
                      <>
                        Email{" "}
                        <a
                          href={`mailto:${servicesContact.email}`}
                          className="text-accent hover:underline"
                        >
                          {servicesContact.email}
                        </a>{" "}
                        or call{" "}
                        <a
                          href={`tel:${servicesContact.phoneTel}`}
                          className="text-accent hover:underline"
                        >
                          {servicesContact.phoneDisplay}
                        </a>
                        . You don&apos;t need a formal RFP—just a few sentences
                        about the problem you&apos;re solving and when you need
                        it done.
                      </>
                    ) : (
                      faq.answer
                    )}
                  </dd>
                </div>
              ))}
            </dl>
          </ServiceSection>
        </div>
      </main>
    </>
  );
}