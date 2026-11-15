import Link from "next/link";
import { JsonLd } from "@/components/json-ld";
import { profile, siteConfig } from "@/lib/profile";
import {
  serviceGeo,
  serviceOfferings,
  servicesContact,
  servicesFaqs,
} from "@/lib/services";
import {
  faqPageJsonLd,
  pageMetadata,
  technicalServicesJsonLd,
} from "@/lib/seo";

export const metadata = pageMetadata({
  title: "Technical Services",
  description:
    "Hire Austin Buhl for software development and technical consultation in Knoxville, TN and remote across the US—custom web apps, architecture reviews, prototypes, and founder engineering. Email or call to inquire.",
  path: "/services/",
});

function ServiceSection({
  title,
  children,
  className,
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`mt-12 border-t border-border pt-10 first:mt-0 first:border-t-0 first:pt-0 ${className ?? ""}`}
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
  const serviceLd = technicalServicesJsonLd();
  const faqLd = faqPageJsonLd(servicesFaqs);

  return (
    <>
      <JsonLd data={serviceLd} />
      <JsonLd data={faqLd} />
      <main className="mx-auto w-full max-w-3xl flex-1 px-safe py-10 sm:py-16">
        <header>
          <p className="font-mono text-[11px] font-medium uppercase tracking-[0.2em] text-muted">
            {serviceGeo.locality}, {serviceGeo.region} · United States
          </p>
          <h1 className="font-display mt-3 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Technical services
          </h1>
          <p className="mt-4 text-lg font-medium leading-relaxed text-foreground">
            Software development, consultation, and hands-on engineering—I&apos;m
            open to inquiries from founders, product teams, and organizations
            that need a senior builder who has shipped in production.
          </p>
          <p className="mt-4 text-base leading-relaxed text-muted">
            Based in {siteConfig.location}, available remotely nationwide.
            Typical work includes greenfield web products, hardening existing
            systems, architecture guidance, and playable prototypes. See{" "}
            <Link href="/work/" className="font-semibold text-accent hover:underline">
              Work
            </Link>{" "}
            for examples of browser-side simulations and{" "}
            <Link href="/about/" className="font-semibold text-accent hover:underline">
              About
            </Link>{" "}
            for background on edtech and game-engine experience.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <a
              href={`mailto:${servicesContact.email}?subject=Technical%20services%20inquiry`}
              className="inline-flex min-h-11 items-center justify-center rounded-full bg-foreground px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-zinc-800"
            >
              Email {servicesContact.email}
            </a>
            <a
              href={`tel:${servicesContact.phoneTel}`}
              className="inline-flex min-h-11 items-center justify-center rounded-full border border-border bg-white px-5 py-2.5 text-sm font-semibold text-foreground transition hover:bg-surface"
            >
              Call {servicesContact.phoneDisplay}
            </a>
          </div>
          <p className="mt-4 text-sm text-muted">
            No contact form—reach out by email or phone and include your goals,
            timeline, and any budget context.
          </p>
        </header>

        <div className="mt-14">
          <ServiceSection title="What I can help with">
            <ul className="list-none space-y-8 pl-0">
              {serviceOfferings.map((offering) => (
                <li
                  key={offering.name}
                  className="rounded-xl border border-border bg-surface p-6"
                >
                  <h3 className="font-display text-lg font-bold text-foreground">
                    {offering.name}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted">
                    {offering.summary}
                  </p>
                  <ul className="mt-4 list-disc space-y-1 pl-5 text-sm text-foreground">
                    {offering.bullets.map((bullet) => (
                      <li key={bullet}>{bullet}</li>
                    ))}
                  </ul>
                </li>
              ))}
            </ul>
          </ServiceSection>

          <ServiceSection title="Who this is for">
            <p>
              Startups validating an MVP, edtech and SaaS teams needing extra
              senior capacity, studios exploring simulation mechanics, and
              anyone who wants direct access to the engineer—not a sales layer.
            </p>
            <p>
              If you&apos;re hiring for ongoing product work at{" "}
              {profile.company} or Novux Games, use the venture sites; this page
              is for independent technical services through {siteConfig.name}.
            </p>
          </ServiceSection>

          <ServiceSection title="Service area">
            <p>
              Primary location:{" "}
              <strong className="font-semibold text-foreground">
                {serviceGeo.locality}, {serviceGeo.region}
              </strong>{" "}
              (East Tennessee). Clients across Tennessee, the broader
              Southeast, and the United States are welcome. Time zone: US Eastern
              (ET).
            </p>
          </ServiceSection>

          <ServiceSection title="Frequently asked questions">
            <dl className="space-y-6">
              {servicesFaqs.map((faq) => (
                <div
                  key={faq.question}
                  className="rounded-lg border border-border bg-white px-5 py-4"
                >
                  <dt className="font-display text-base font-bold text-foreground">
                    {faq.question}
                  </dt>
                  <dd className="mt-2 text-sm leading-relaxed text-muted">
                    {faq.answer}
                  </dd>
                </div>
              ))}
            </dl>
          </ServiceSection>

          <ServiceSection title="Inquire">
            <p>
              <a
                href={`mailto:${servicesContact.email}`}
                className="font-semibold text-accent underline-offset-2 hover:underline"
              >
                {servicesContact.email}
              </a>
              {" · "}
              <a
                href={`tel:${servicesContact.phoneTel}`}
                className="font-semibold text-accent underline-offset-2 hover:underline"
              >
                {servicesContact.phoneDisplay}
              </a>
              {" · "}
              <a
                href={profile.linkedIn}
                className="font-semibold text-accent underline-offset-2 hover:underline"
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