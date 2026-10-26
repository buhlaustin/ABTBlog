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
      <h1 className="text-3xl font-semibold tracking-tight">About</h1>
      <div className="mt-6 space-y-4 text-base leading-relaxed text-zinc-600 dark:text-zinc-400">
        <p>
          I&apos;m {siteConfig.name}, based in {siteConfig.location}. I build
          software for work and for fun—edtech, dev tools, simulations, and
          the occasional game.
        </p>
        <p>
          By day I&apos;m co-founder &amp; CEO at{" "}
          <a
            href="https://www.classquip.com"
            className="font-medium text-emerald-700 underline-offset-2 hover:underline dark:text-emerald-400"
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
          <strong className="font-medium text-zinc-800 dark:text-zinc-200">
            austinbuhltech.com
          </strong>
          , plus hosted projects under{" "}
          <Link href="/work/" className="text-emerald-700 dark:text-emerald-400">
            /work
          </Link>
          .
        </p>
        <p>
          Find me on{" "}
          <a
            href={siteConfig.github}
            className="font-medium text-emerald-700 underline-offset-2 hover:underline dark:text-emerald-400"
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
