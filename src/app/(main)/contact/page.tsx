import { BookCallButton } from "@/components/book-call-button";
import { Reveal } from "@/components/reveal";
import { servicesContact, servicesPageSeo } from "@/lib/services";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "Contact",
  description:
    "Book a call or email Austin Buhl about LTI 1.3, OneRoster, and WebRTC integrations for edtech teams. Knoxville, TN; remote across the US.",
  path: "/contact/",
});

export default function ContactPage() {
  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-safe py-10 sm:py-16">
      <Reveal when="mount">
        <h1 className="font-display text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
          Contact
        </h1>
      </Reveal>
      <Reveal when="mount" delayMs={80}>
        <p className="mt-2 font-mono text-sm text-muted">
          {servicesPageSeo.locationLine}
        </p>
      </Reveal>
      <Reveal when="mount" delayMs={140} className="mt-8">
        <BookCallButton />
      </Reveal>
      <Reveal when="mount" delayMs={200} className="mt-8 space-y-6 text-base leading-relaxed text-muted">
        <p>
          Or email{" "}
          <a
            href={`mailto:${servicesContact.email}`}
            className="text-accent hover:underline"
          >
            {servicesContact.email}
          </a>{" "}
          with three things: what you&apos;re building, where the integration is
          stuck, and when you need it working.
        </p>
        <p>
          <a
            href={`tel:${servicesContact.phoneTel}`}
            className="text-foreground hover:text-accent"
          >
            {servicesContact.phoneDisplay}
          </a>
        </p>
        <p>
          Based in Knoxville, TN. I work with teams across the US, Eastern time.
        </p>
      </Reveal>
    </main>
  );
}