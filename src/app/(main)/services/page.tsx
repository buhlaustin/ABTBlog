import Link from "next/link";
import { BookCallButton } from "@/components/book-call-button";
import { JsonLd } from "@/components/json-ld";
import { Reveal } from "@/components/reveal";
import {
  serviceAudience,
  serviceOfferings,
  serviceOffers,
  serviceProcess,
  serviceTechnologies,
  servicesContact,
  servicesFaqs,
  servicesPageSeo,
} from "@/lib/services";
import {
  breadcrumbJsonLd,
  faqPageJsonLd,
  pageMetadata,
  technicalServicesJsonLd,
} from "@/lib/seo";

export const metadata = pageMetadata({
  title: servicesPageSeo.title,
  description: servicesPageSeo.metaDescription,
  path: "/services/",
});

function ServiceSection({
  title,
  children,
  id,
}: {
  title: string;
  children: React.ReactNode;
  id?: string;
}) {
  return (
    <section
      id={id}
      className="mt-12 border-t border-border pt-10 first:mt-0 first:border-t-0 first:pt-0"
    >
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
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Home", path: "/" },
          { name: "Services", path: "/services/" },
        ])}
      />
      <main className="mx-auto w-full max-w-3xl flex-1 px-safe py-10 sm:py-16">
        <header>
          <Reveal when="mount">
            <h1 className="font-display text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              {servicesPageSeo.h1}
            </h1>
          </Reveal>
          <Reveal when="mount" delayMs={60}>
            <p className="mt-2 font-mono text-sm text-muted">
              {servicesPageSeo.locationLine}
            </p>
          </Reveal>
          <Reveal when="mount" delayMs={120}>
            <p className="services-hero-lead mt-6 text-base leading-relaxed text-muted">
              {servicesPageSeo.lead}
            </p>
          </Reveal>
          <Reveal when="mount" delayMs={160}>
            <p className="services-hero-support mt-4 text-base leading-relaxed text-muted">
              {servicesPageSeo.support}
            </p>
          </Reveal>
          <Reveal when="mount" delayMs={200}>
            <div className="cta-mobile-stack mt-8">
              <BookCallButton />
            </div>
          </Reveal>
        </header>

        <div className="mt-14">
          <ServiceSection title="Packaged offers" id="offers">
            <ul className="list-none space-y-4 pl-0">
              {serviceOffers.map((offer, index) => (
                <Reveal key={offer.slug} delayMs={index * 60}>
                  <li className="lift-card rounded-2xl border border-border bg-white p-6 shadow-sm">
                    <h3 className="font-display text-lg font-bold tracking-tight text-foreground">
                      {offer.name}
                    </h3>
                    <p className="mt-2 text-sm leading-relaxed text-muted">
                      {offer.oneLiner}
                    </p>
                    <p className="mt-3 font-mono text-xs text-muted">
                      {offer.timeframe}
                    </p>
                    <p className="mt-1 text-sm font-semibold text-foreground">
                      From {offer.price}
                    </p>
                    <div className="mt-4 flex flex-wrap items-center gap-4">
                      <Link
                        href={`/services/${offer.slug}/`}
                        className="text-sm font-semibold text-accent hover:text-blue-700"
                      >
                        Details →
                      </Link>
                      <BookCallButton variant="secondary" />
                    </div>
                  </li>
                </Reveal>
              ))}
            </ul>
          </ServiceSection>

          <ServiceSection title="Who I work with" id="clients">
            <ul className="list-none space-y-4 pl-0">
              {serviceAudience.map((item, index) => (
                <Reveal key={item.title} delayMs={index * 60}>
                  <li className="lift-card rounded-2xl border border-border bg-white p-5 shadow-sm">
                    <h3 className="font-display text-base font-bold text-foreground">
                      {item.title}
                    </h3>
                    <p className="mt-2 text-sm leading-relaxed">{item.body}</p>
                  </li>
                </Reveal>
              ))}
            </ul>
          </ServiceSection>

          <ServiceSection title="How it works" id="process">
            <ol className="list-decimal space-y-3 pl-5 text-sm leading-relaxed">
              {serviceProcess.map((step) => (
                <li key={step.slice(0, 32)}>{step}</li>
              ))}
            </ol>
          </ServiceSection>

          <ServiceSection title="Other work I take on" id="services">
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

          <ServiceSection title="Technologies & focus" id="tech">
            <p className="text-sm">
              Senior contract work across modern web stacks—especially where
              real-time data, education integrations, or simulation UX matter.
            </p>
            <ul className="mt-4 flex flex-wrap gap-2">
              {serviceTechnologies.map((tech) => (
                <li key={tech}>
                  <span className="rounded-full border border-border bg-surface px-3 py-1.5 font-mono text-xs text-foreground">
                    {tech}
                  </span>
                </li>
              ))}
            </ul>
          </ServiceSection>

          <ServiceSection title="FAQ" id="faq">
            <dl className="mt-4 space-y-4">
              {servicesFaqs.map((faq, index) => (
                <Reveal key={faq.question} delayMs={index * 40}>
                  <div className="lift-card rounded-xl border border-border bg-white p-5 shadow-sm">
                    <dt className="font-semibold text-foreground">
                      {faq.question}
                    </dt>
                    <dd className="mt-2 text-sm leading-relaxed">
                      {faq.answer}
                    </dd>
                  </div>
                </Reveal>
              ))}
            </dl>
          </ServiceSection>

          <Reveal>
            <section
              id="contact"
              className="lift-card mt-12 rounded-2xl border border-border bg-surface-raised px-6 py-8 text-center sm:px-10 sm:py-10"
            >
              <h2 className="font-display text-xl font-bold tracking-tight text-foreground sm:text-2xl">
                Tell me what&apos;s stuck
              </h2>
              <p className="mx-auto mt-3 max-w-lg text-sm leading-relaxed text-muted">
                A few sentences is plenty: your product, the districts or LMSs
                involved, and your deadline. No RFP needed.
              </p>
              <div className="cta-mobile-stack mx-auto mt-6 max-w-sm sm:max-w-none sm:justify-center">
                <BookCallButton />
                <a
                  href={`mailto:${servicesContact.email}`}
                  className="btn-press inline-flex min-h-11 w-full items-center justify-center rounded-full border border-border bg-white px-5 py-2.5 text-sm font-semibold text-foreground transition hover:bg-surface sm:w-auto"
                >
                  Email me
                </a>
                <a
                  href={`tel:${servicesContact.phoneTel}`}
                  className="btn-press inline-flex min-h-11 w-full items-center justify-center rounded-full border border-border bg-white px-5 py-2.5 text-sm font-semibold text-foreground transition hover:bg-surface sm:w-auto"
                >
                  Call {servicesContact.phoneDisplay}
                </a>
              </div>
            </section>
          </Reveal>
        </div>
      </main>
    </>
  );
}