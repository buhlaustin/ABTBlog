import Link from "next/link";
import { notFound } from "next/navigation";
import { BookCallButton } from "@/components/book-call-button";
import { JsonLd } from "@/components/json-ld";
import { Reveal } from "@/components/reveal";
import {
  getAllServiceOfferSlugs,
  getServiceOfferBySlug,
  offerPriceKind,
  servicesContact,
} from "@/lib/services";
import { pageMetadata, serviceOfferJsonLd } from "@/lib/seo";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export function generateStaticParams() {
  return getAllServiceOfferSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: PageProps) {
  const { slug } = await params;
  const offer = getServiceOfferBySlug(slug);
  if (!offer) return {};
  return pageMetadata({
    title: offer.seoTitle,
    description: offer.seoDescription,
    path: `/services/${offer.slug}/`,
  });
}

export default async function ServiceOfferPage({ params }: PageProps) {
  const { slug } = await params;
  const offer = getServiceOfferBySlug(slug);
  if (!offer) notFound();

  const priceKind = offerPriceKind(offer.slug);

  return (
    <>
      <JsonLd data={serviceOfferJsonLd(offer)} />
      <main className="mx-auto w-full max-w-3xl flex-1 px-safe py-10 sm:py-16">
        <Link
          href="/services/"
          className="inline-flex min-h-11 items-center text-sm font-semibold text-accent hover:text-blue-700"
        >
          ← Services
        </Link>
        <header className="mt-4">
          <Reveal when="mount">
            <h1 className="font-display text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              {offer.name}
            </h1>
          </Reveal>
          <Reveal when="mount" delayMs={60}>
            <p className="mt-4 text-lg leading-relaxed text-foreground">
              {offer.oneLiner}
            </p>
          </Reveal>
          <Reveal when="mount" delayMs={100}>
            <p className="mt-4 text-sm leading-relaxed text-muted">
              <span className="font-semibold text-foreground">Ideal for: </span>
              {offer.idealFor}
            </p>
          </Reveal>
        </header>

        <section className="mt-12 border-t border-border pt-10">
          <h2 className="font-display text-xl font-bold tracking-tight text-foreground">
            What&apos;s included
          </h2>
          <ul className="mt-4 list-disc space-y-2 pl-5 text-sm leading-relaxed text-muted">
            {offer.includes.map((item) => (
              <li key={item.slice(0, 48)}>{item}</li>
            ))}
          </ul>
        </section>

        <section className="mt-12 border-t border-border pt-10">
          <h2 className="font-display text-xl font-bold tracking-tight text-foreground">
            Deliverables
          </h2>
          <ul className="mt-4 list-disc space-y-2 pl-5 text-sm leading-relaxed text-muted">
            {offer.deliverables.map((item) => (
              <li key={item.slice(0, 48)}>{item}</li>
            ))}
          </ul>
        </section>

        <section className="mt-12 border-t border-border pt-10">
          <dl className="space-y-3 text-sm">
            <div>
              <dt className="font-mono text-xs uppercase tracking-wider text-muted">
                Timeframe
              </dt>
              <dd className="mt-1 text-foreground">{offer.timeframe}</dd>
            </div>
            <div>
              <dt className="font-mono text-xs uppercase tracking-wider text-muted">
                Investment
              </dt>
              <dd className="mt-1 text-foreground">
                {priceKind}: {offer.price}
              </dd>
              <dd className="mt-2 text-muted">{offer.priceNote}</dd>
            </div>
          </dl>
        </section>

        {offer.relatedWritingPath ? (
          <p className="mt-10 text-sm">
            <Link
              href={offer.relatedWritingPath}
              className="font-semibold text-accent hover:text-blue-700"
            >
              Related writing →
            </Link>
          </p>
        ) : null}

        <Reveal className="lift-card mt-12 rounded-2xl border border-border bg-surface-raised px-6 py-8 text-center sm:px-10">
          <BookCallButton className="mx-auto" />
          <p className="mx-auto mt-4 max-w-md text-sm text-muted">
            Or email{" "}
            <a
              href={`mailto:${servicesContact.email}`}
              className="text-accent hover:underline"
            >
              {servicesContact.email}
            </a>
          </p>
        </Reveal>
      </main>
    </>
  );
}