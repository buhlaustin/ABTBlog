import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import {
  openSourceHighlights,
  profile,
  siteConfig,
} from "@/lib/profile";
import { workItems } from "@/lib/work-registry";
import { WorkCard } from "@/components/work-card";

export const metadata: Metadata = {
  title: "About",
  description: `${siteConfig.name} — ${profile.role} at ${profile.company}, based in ${siteConfig.location}. Edtech, research simulations, games, and open source.`,
};

function AboutSection({
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

export default function AboutPage() {
  const featuredWork = workItems.filter((item) => item.featured);

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-12 sm:px-6 sm:py-16">
      <header className="flex flex-col gap-6 sm:flex-row sm:items-start sm:gap-8">
        <Image
          src={profile.avatarUrl}
          alt=""
          width={112}
          height={112}
          className="h-28 w-28 shrink-0 rounded-2xl border border-border bg-surface object-cover shadow-sm"
          priority
        />
        <div className="min-w-0">
          <h1 className="font-display text-4xl font-bold tracking-tight">
            {siteConfig.name}
          </h1>
          <p className="mt-2 font-mono text-sm text-muted">
            {siteConfig.location}
          </p>
          <p className="mt-4 text-lg leading-relaxed text-foreground">
            {profile.tagline}
          </p>
          <p className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-sm">
            <a
              href={siteConfig.github}
              className="font-semibold text-accent underline-offset-2 hover:underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              GitHub @
              {siteConfig.githubUsername}
            </a>
            <a
              href={profile.companyUrl}
              className="font-semibold text-accent underline-offset-2 hover:underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              {profile.company}
            </a>
          </p>
        </div>
      </header>

      <div className="mt-14">
        <AboutSection title="ClassQuip">
          <p>
            I&apos;m {profile.role} at{" "}
            <a
              href={profile.companyUrl}
              className="font-medium text-accent underline-offset-2 hover:underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              {profile.company}
            </a>
            . {profile.bio} ClassQuip is focused on giving teachers and students
            a virtual classroom that feels purposeful—not a patchwork of
            disconnected tools.
          </p>
          <p>
            The team ships in the open under{" "}
            <a
              href={profile.githubOrg.url}
              className="font-medium text-accent underline-offset-2 hover:underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              {profile.githubOrg.name} on GitHub
            </a>
            .
          </p>
        </AboutSection>

        <AboutSection title="Background">
          <p>
            Before ClassQuip I worked at{" "}
            <strong className="font-medium text-foreground">
              {profile.previousEmployer}
            </strong>
            , where I learned what large-scale online learning looks like in
            production—scheduling, live instruction, and the operational weight
            behind every virtual class. That experience shapes how I think about
            reliability, clarity for educators, and products that have to work on
            a school-day clock.
          </p>
        </AboutSection>

        <AboutSection title="What I build outside work">
          <p>
            I like projects that sit at different altitudes: playful games,
            research-grade simulations, and small devtools that remove friction.
            A few themes show up again and again—autonomous agents (whether AI
            houseguests or particle systems), browser-first experiences, and
            Python when the problem is numerical or scientific.
          </p>
          <ul className="list-none space-y-6 pl-0">
            {openSourceHighlights.map((project) => (
              <li
                key={project.href}
                className="rounded-xl border border-border bg-surface p-5"
              >
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <a
                    href={project.href}
                    className="font-display text-lg font-bold text-foreground underline-offset-2 hover:text-accent hover:underline"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {project.name}
                  </a>
                  <span className="font-mono text-[11px] text-muted">
                    {project.languages.join(" · ")}
                  </span>
                </div>
                <p className="mt-2 text-sm leading-relaxed">{project.blurb}</p>
                {project.sitePath ? (
                  <p className="mt-3 text-sm">
                    <Link
                      href={project.sitePath}
                      className="font-semibold text-accent hover:text-blue-700"
                    >
                      On this site →
                    </Link>
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
        </AboutSection>

        <AboutSection title="Featured on austinbuhltech.com">
          <p>
            Some of the projects above are playable or documented here—not
            everything in my GitHub, but the ones I want to share in one place.
          </p>
          <div className="mt-6 grid gap-6 sm:grid-cols-2 [&>*]:text-foreground">
            {featuredWork.map((item) => (
              <WorkCard key={item.slug} item={item} />
            ))}
          </div>
          <p className="mt-6">
            <Link
              href="/work/"
              className="font-semibold text-accent hover:text-blue-700"
            >
              Browse all work →
            </Link>
          </p>
        </AboutSection>

        <AboutSection title="This site">
          <p>
            <strong className="font-medium text-foreground">
              austinbuhltech.com
            </strong>{" "}
            is my personal home on the web: long-form{" "}
            <Link href="/blog/" className="text-accent hover:underline">
              writing
            </Link>
            , an index of{" "}
            <Link href="/work/" className="text-accent hover:underline">
              projects
            </Link>
            , and hosted experiences you can launch without cloning a repo.
          </p>
        </AboutSection>

        <AboutSection title="Say hello">
          <p>
            The fastest way to see what I&apos;m building is{" "}
            <a
              href={siteConfig.github}
              className="font-medium text-accent underline-offset-2 hover:underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              GitHub
            </a>
            . For ClassQuip, reach out through{" "}
            <a
              href={profile.companyUrl}
              className="font-medium text-accent underline-offset-2 hover:underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              classquip.com
            </a>
            .
          </p>
        </AboutSection>
      </div>
    </main>
  );
}
