import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ResumeTimeline } from "@/components/resume-timeline";
import {
  openSourceHighlights,
  profile,
  siteConfig,
} from "@/lib/profile";
import {
  classQuipIntro,
  focusAreas,
  resumeGroups,
} from "@/lib/resume";
import { workItems } from "@/lib/work-registry";
import { WorkCard } from "@/components/work-card";

export const metadata: Metadata = {
  title: "About",
  description: `${siteConfig.name} — ${profile.role} at ${profile.company}, based in ${siteConfig.location}. Edtech, research simulations, games, and open source.`,
};

function AboutSection({
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
            <a
              href={profile.linkedIn}
              className="font-semibold text-accent underline-offset-2 hover:underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              LinkedIn
            </a>
            <a
              href={`mailto:${profile.email}`}
              className="font-semibold text-accent underline-offset-2 hover:underline"
            >
              Email
            </a>
          </p>
        </div>
      </header>

      <div className="mt-14">
        <AboutSection title="ClassQuip">
          <p>
            I&apos;m {profile.role} &amp; Chief Architect at{" "}
            <a
              href={profile.companyUrl}
              className="font-medium text-accent underline-offset-2 hover:underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              {profile.company}
            </a>
            . {classQuipIntro.headline}
          </p>
          <p className="text-sm">
            <strong className="font-medium text-foreground">ClassQuip</strong>{" "}
            equips every teacher with a smarter classroom—live video, real-time
            participation analytics, interactive polls, instant breakout groups,
            and moderated chat in one high-performance platform.
          </p>
          <ul className="list-disc space-y-2 pl-5 text-sm">
            {classQuipIntro.platformBullets.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
          <p className="text-sm">{classQuipIntro.architectNote}</p>
          <p className="text-sm">
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

        <AboutSection title="Experience">
          <div className="text-foreground">
            <ResumeTimeline groups={resumeGroups} />
          </div>
        </AboutSection>

        <AboutSection title="Focus areas">
          <div className="overflow-x-auto rounded-xl border border-border">
            <table className="w-full min-w-[280px] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-border bg-surface">
                  <th className="px-4 py-3 font-semibold text-foreground">
                    Area
                  </th>
                  <th className="px-4 py-3 font-semibold text-foreground">
                    What I care about
                  </th>
                </tr>
              </thead>
              <tbody>
                {focusAreas.map((row) => (
                  <tr
                    key={row.area}
                    className="border-b border-border last:border-b-0"
                  >
                    <td className="px-4 py-3 align-top font-medium text-foreground">
                      {row.area}
                    </td>
                    <td className="px-4 py-3 text-muted">{row.detail}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </AboutSection>

        <AboutSection title="What I build outside work">
          <p>
            Open-source and side projects from my public GitHub—games,
            research-grade simulations, and small devtools.
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
            <a
              href={`mailto:${profile.email}`}
              className="font-medium text-accent underline-offset-2 hover:underline"
            >
              {profile.email}
            </a>
            {" · "}
            <a
              href={profile.linkedIn}
              className="font-medium text-accent underline-offset-2 hover:underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              LinkedIn
            </a>
            {" · "}
            <a
              href={siteConfig.github}
              className="font-medium text-accent underline-offset-2 hover:underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              GitHub
            </a>
            . For ClassQuip, visit{" "}
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
