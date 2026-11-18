import Link from "next/link";
import { workItems } from "@/lib/work-registry";
import { Reveal } from "@/components/reveal";
import { WorkCard } from "@/components/work-card";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "Lab",
  description:
    "Browser games, simulations, and open-source projects by Austin Buhl—hosted demos and GitHub repos.",
  path: "/work/",
});

export default function WorkIndexPage() {
  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-safe py-10 sm:py-16">
      <Reveal when="mount">
        <p className="font-mono text-xs uppercase tracking-wider text-muted">
          Client and company work
        </p>
        <p className="mt-2 text-sm">
          <Link
            href="/case-studies/"
            className="font-semibold text-accent hover:text-blue-700"
          >
            Case studies →
          </Link>
        </p>
      </Reveal>
      <Reveal when="mount" delayMs={80}>
        <h1 className="font-display mt-10 text-3xl font-bold tracking-tight sm:text-4xl">
          Lab
        </h1>
      </Reveal>
      <Reveal when="mount" delayMs={120}>
        <p className="mt-4 max-w-2xl text-muted">
          Things I build for fun. Browser sims and games you can play without
          installing anything.
        </p>
      </Reveal>
      <div className="mt-12 grid gap-6 sm:grid-cols-2">
        {workItems.map((item, index) => (
          <Reveal key={item.slug} delayMs={index * 60}>
            <WorkCard item={item} />
          </Reveal>
        ))}
      </div>
    </main>
  );
}