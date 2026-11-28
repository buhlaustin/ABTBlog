import Link from "next/link";
import { getAllCaseStudies } from "@/lib/case-studies";
import { Reveal } from "@/components/reveal";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "Case studies",
  description:
    "How Austin Buhl builds LTI 1.3, OneRoster, and WebRTC classroom systems for K-12 edtech—ClassQuip and district-scale integrations.",
  path: "/case-studies/",
});

export default function CaseStudiesIndexPage() {
  const studies = getAllCaseStudies();

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-safe py-7 sm:py-16">
      <Reveal when="mount">
        <h1 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">
          Case studies
        </h1>
      </Reveal>
      <Reveal when="mount" delayMs={80}>
        <p className="mt-4 max-w-2xl text-muted">
          Client and company work on LMS launches, roster sync, and live
          classroom video inside district constraints.
        </p>
      </Reveal>
      <ul className="mt-12 list-none space-y-6 pl-0">
        {studies.map((study, index) => (
          <Reveal key={study.slug} delayMs={index * 60}>
            <li className="lift-card rounded-2xl border border-border bg-white p-6 shadow-sm">
              <p className="font-mono text-xs uppercase tracking-wider text-muted">
                {study.client} · {study.timeframe}
              </p>
              <h2 className="font-display mt-2 text-xl font-bold tracking-tight">
                <Link
                  href={`/case-studies/${study.slug}/`}
                  className="text-foreground hover:text-accent"
                >
                  {study.title}
                </Link>
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-muted">
                {study.summary}
              </p>
              <Link
                href={`/case-studies/${study.slug}/`}
                className="mt-4 inline-flex text-sm font-semibold text-accent hover:underline"
              >
                Read case study →
              </Link>
            </li>
          </Reveal>
        ))}
      </ul>
    </main>
  );
}