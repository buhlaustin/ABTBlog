import Link from "next/link";
import { JsonLd } from "@/components/json-ld";
import { Reveal } from "@/components/reveal";
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
          <Reveal when="mount">
            <h1 className="font-display text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              Technical Services
            </h1>
          </Reveal>
          <Reveal when="mount" delayMs={60}>
            <p className="mt-2 font-mono text-sm text-muted">
              {siteConfig.location} · Remote US
            </p>
          </Reveal>
          <Reveal when="mount" delayMs={120}>
            <p className="mt-6 text-base leading-relaxed text-muted">
              Most software projects stall because of over-engineered architecture
              or brittle, rushed code. I step in as a senior solo builder to get
              your product across the finish line—specializing in K–12 EdTech,
              SaaS, and browser-based simulations.
            </p>
          </Reveal>
          <Reveal when="mount" delayMs={180}>
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
          </Reveal>
          <Reveal when="mount" delayMs={240}>
            <div className="mt-8 flex flex-wrap gap-3">
              <a
                href={`mailto:${servicesContact.email}`}
                className="btn-press inline-flex min-h-11 items-center justify-center rounded-full bg-foreground px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-zinc-800"
              >
                Email {servicesContact.email}
              </a>
              <a
                href={`tel:${servicesContact.phoneTel}`}
                className="btn-press inline-flex min-h-11 items-center justify-center rounded-full border border-border bg-white px-5 py-2.5 text-sm font-semibold text-foreground transition hover:bg-surface"
              >
                Call {servicesContact.phoneDisplay}
              </a>
            </div>
          </Reveal>
        </header>

        <div className="mt-14">
          <ServiceSection title="What I Do">
            <ul className="list-none space-y-4 pl-0">
              {serviceOfferings.map((offering, index) => (
                <Reveal key={offering.name} delayMs={index * 70}>
                  <li className="lift-card rounded-2xl border border-border bg-surface p-6 shadow-sm">
                    <h3 className="font-display text-lg font-bold tracking-tight text-foreground">
                      {offering.name}
                    </h3>
                    <p className="mt-3 text-sm leading-relaxed text-muted">
                      {offering.summary}
                    </p>
                  </li>
                </Reveal>
              ))}
            </ul>
          </ServiceSection>

          <ServiceSection title="FAQ">
            <dl className="space-y-4">
              {servicesFaqs.map((faq, index) => (
                <Reveal key={faq.question} delayMs={index * 50}>
                <div className="lift-card rounded-xl border border-border bg-white p-5 shadow-sm">
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
                </Reveal>
              ))}
            </dl>
          </ServiceSection>

          <Reveal>
            <section className="lift-card mt-12 rounded-2xl border border-border bg-surface-raised px-6 py-8 text-center sm:px-10 sm:py-10">
              <h2 className="font-display text-xl font-bold tracking-tight text-foreground sm:text-2xl">
                Ready to talk?
              </h2>
              <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-muted">
                A few sentences on the problem and your timeline is enough—no
                formal RFP required.
              </p>
              <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
                <a
                  href={`mailto:${servicesContact.email}`}
                  className="btn-press inline-flex min-h-11 items-center justify-center rounded-full bg-foreground px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-zinc-800"
                >
                  Email me
                </a>
                <a
                  href={`tel:${servicesContact.phoneTel}`}
                  className="btn-press inline-flex min-h-11 items-center justify-center rounded-full border border-border bg-white px-5 py-2.5 text-sm font-semibold text-foreground transition hover:bg-surface"
                >
                  {servicesContact.phoneDisplay}
                </a>
              </div>
            </section>
          </Reveal>
        </div>
      </main>
    </>
  );
}