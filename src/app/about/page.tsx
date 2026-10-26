import type { Metadata } from "next";
import Link from "next/link";
import { siteConfig } from "@/lib/site";

export const metadata: Metadata = {
  title: "About",
  description: `About ${siteConfig.name} — builder, founder, and maker.`,
};

export default function AboutPage() {
  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-12 sm:px-6 sm:py-16">
      <h1 className="font-display text-4xl font-bold tracking-tight">About</h1>
      <div className="mt-8 space-y-5 text-base leading-relaxed text-muted">
        <p>
          I&apos;m {siteConfig.name}, based in {siteConfig.location}. I build
          software for work and for fun—edtech, dev tools, simulations, and
          the occasional game.
        </p>
        <p>
          By day I&apos;m co-founder &amp; CEO at{" "}
          <a
            href="https://www.classquip.com"
            className="font-medium text-accent underline-offset-2 hover:underline"
            target="_blank"
            rel="noopener noreferrer"
          >
            ClassQuip
          </a>
          , working on a better virtual classroom for K–12. Previously Stride /
          K12.
        </p>
        <p>
          This site is the monolith for everything I ship here: writing at{" "}
          <strong className="font-medium text-foreground">
            austinbuhltech.com
          </strong>
          , plus hosted projects under{" "}
          <Link href="/work/" className="text-accent hover:underline">
            /work
          </Link>
          .
        </p>
        <p>
          Find me on{" "}
          <a
            href={siteConfig.github}
            className="font-medium text-accent underline-offset-2 hover:underline"
            target="_blank"
            rel="noopener noreferrer"
          >
            GitHub
          </a>
          .
        </p>
      </div>
    </main>
  );
}
