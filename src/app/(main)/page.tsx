import Image from "next/image";
import Link from "next/link";
import { BookShelf } from "@/components/book-shelf";
import { JsonLd } from "@/components/json-ld";
import { Reveal } from "@/components/reveal";
import { WorkCard } from "@/components/work-card";
import { getAllPosts } from "@/lib/blog";
import { novuxFlagship, profile, siteConfig, ventures } from "@/lib/profile";
import { pageMetadata, personJsonLd } from "@/lib/seo";
import { workItems } from "@/lib/work-registry";

export const metadata = pageMetadata({
  title: "Austin Buhl · Games and classroom software",
  description:
    "Austin Buhl builds games and classroom software in Knoxville. Dynasty: College Basketball is in Early Access, ClassQuip is the company, and this site holds the browser projects and the writing.",
  path: "/",
  absoluteTitle: true,
});

const latestPostCount = 3;

const primaryButton =
  "btn-press inline-flex min-h-11 w-full items-center justify-center rounded-full bg-foreground px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-zinc-800 active:bg-zinc-700 sm:w-auto";

const secondaryButton =
  "btn-press inline-flex min-h-11 w-full items-center justify-center rounded-full border border-border bg-white px-5 py-2.5 text-sm font-semibold text-foreground transition hover:bg-surface active:bg-surface-raised sm:w-auto";

function formatPostDate(isoDate: string): string {
  const day = isoDate.slice(0, 10);
  return new Date(`${day}T00:00:00Z`).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

export default function HomePage() {
  const { hero } = profile;
  const posts = getAllPosts().slice(0, latestPostCount);

  return (
    <>
      <JsonLd data={personJsonLd()} />
      <main className="flex-1">
        <section className="relative border-b border-border">
          <div
            className="hero-mesh pointer-events-none absolute inset-0 bg-[linear-gradient(to_bottom,rgba(250,250,250,0)_0%,rgb(255_255_255)_85%),radial-gradient(ellipse_90%_60%_at_50%_-20%,rgba(37,99,235,0.12),transparent)]"
            aria-hidden
          />
          <div className="relative mx-auto grid max-w-5xl gap-6 px-safe py-8 sm:gap-10 sm:py-12 md:py-20 lg:grid-cols-[1fr_minmax(0,18rem)] lg:items-start lg:gap-14">
            <div className="min-w-0">
              <Reveal when="mount">
                <p className="font-mono text-xs leading-snug text-muted sm:text-sm">
                  {hero.tagline}
                </p>
              </Reveal>
              <Reveal when="mount" delayMs={60}>
                <h1 className="font-display mt-2 text-[1.65rem] font-bold leading-[1.15] tracking-tight text-foreground sm:mt-3 sm:text-4xl sm:leading-tight md:text-5xl">
                  {hero.headline}
                </h1>
              </Reveal>
              <Reveal when="mount" delayMs={120}>
                <p className="mt-4 max-w-2xl text-base leading-relaxed text-foreground sm:mt-6 sm:text-lg">
                  <span className="md:hidden">{hero.leadMobile}</span>
                  <span className="hidden md:inline">{hero.lead}</span>
                </p>
              </Reveal>
              <Reveal when="mount" delayMs={200}>
                <div className="cta-mobile-stack mt-6 sm:mt-8">
                  <Link href="/blog/" className={primaryButton}>
                    Read the blog
                  </Link>
                  <Link href="/work/" className={secondaryButton}>
                    Browse the lab
                  </Link>
                </div>
              </Reveal>
              <ul className="mt-5 flex flex-wrap gap-2 lg:hidden">
                <li>
                  <a
                    href={novuxFlagship.storeUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex min-h-10 items-center rounded-full border border-border bg-surface px-3.5 text-xs font-semibold text-foreground"
                  >
                    Dynasty on Google Play
                  </a>
                </li>
                <li>
                  <Link
                    href="/work/"
                    className="inline-flex min-h-10 items-center rounded-full border border-border bg-surface px-3.5 text-xs font-semibold text-foreground"
                  >
                    Lab
                  </Link>
                </li>
              </ul>
            </div>

            <aside className="hidden flex-col gap-3 lg:flex lg:pt-2">
              <Reveal
                when="mount"
                delayMs={180}
                className="lift-card flex items-center gap-3 rounded-2xl border border-border bg-white p-4 shadow-sm"
              >
                <Image
                  src={profile.avatarUrl}
                  alt=""
                  width={48}
                  height={48}
                  loading="eager"
                  className="h-12 w-12 rounded-xl border border-border object-cover"
                />
                <div className="min-w-0 text-sm leading-snug">
                  <p className="font-semibold text-foreground">{siteConfig.name}</p>
                  <p className="text-muted">{hero.tagline}</p>
                </div>
              </Reveal>
              <Reveal when="mount" delayMs={240}>
                <a
                  href={novuxFlagship.storeUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="lift-card flex min-h-11 items-center rounded-2xl border border-border bg-surface px-4 py-3 text-sm font-semibold text-foreground transition hover:border-zinc-300 hover:bg-surface-raised"
                >
                  Dynasty on Google Play →
                </a>
              </Reveal>
              <Reveal when="mount" delayMs={300}>
                <Link
                  href="/work/"
                  className="lift-card flex min-h-11 items-center rounded-2xl border border-border bg-surface px-4 py-3 text-sm font-semibold text-foreground transition hover:border-zinc-300 hover:bg-surface-raised"
                >
                  Browser games →
                </Link>
              </Reveal>
            </aside>
          </div>
        </section>

        <div className="mx-auto max-w-5xl px-safe pb-12 pt-10 sm:pb-24 sm:pt-16">
          <section className="mobile-section mb-10 sm:mb-16">
            <Reveal>
              <h2 className="font-display text-sm font-bold uppercase tracking-[0.15em] text-muted">
                Now
              </h2>
            </Reveal>
            <div className="mt-4 grid grid-cols-1 gap-3 sm:mt-6 sm:grid-cols-3 sm:gap-4">
              <Reveal>
                <a
                  href={novuxFlagship.storeUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="lift-card flex h-full flex-col rounded-2xl border border-border bg-surface p-4 sm:p-6"
                >
                  <h3 className="font-display text-base font-bold tracking-tight text-foreground sm:text-lg">
                    {novuxFlagship.name}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted">
                    Early Access on Google Play. Novux Games. You run a college
                    basketball program on your phone.
                  </p>
                </a>
              </Reveal>
              <Reveal delayMs={70}>
                <a
                  href={ventures.classQuip.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="lift-card flex h-full flex-col rounded-2xl border border-border bg-surface p-4 sm:p-6"
                >
                  <h3 className="font-display text-base font-bold tracking-tight text-foreground sm:text-lg">
                    {ventures.classQuip.name}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted">
                    The classroom company. I started it, and I still build the
                    product.
                  </p>
                </a>
              </Reveal>
              <Reveal delayMs={140}>
                <Link
                  href="/work/"
                  className="lift-card flex h-full flex-col rounded-2xl border border-border bg-surface p-4 sm:p-6"
                >
                  <h3 className="font-display text-base font-bold tracking-tight text-foreground sm:text-lg">
                    The lab
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted">
                    Browser games you can open from this site. Startup
                    Simulator, House of Strategy, and the rest.
                  </p>
                </Link>
              </Reveal>
            </div>
          </section>

          <section className="mobile-section mb-10 sm:mb-16">
            <Reveal className="mb-4 flex flex-col gap-3 sm:mb-6 sm:flex-row sm:items-end sm:justify-between">
              <h2 className="font-display text-xl font-bold tracking-tight sm:text-2xl">
                Blog
              </h2>
              <Link
                href="/blog/"
                className="text-sm font-semibold text-accent hover:text-blue-700"
              >
                All posts →
              </Link>
            </Reveal>
            <div className="grid gap-3 sm:gap-4 lg:grid-cols-3">
              {posts.map((post, index) => (
                <Reveal key={post.slug} delayMs={index * 60}>
                  <article className="lift-card flex h-full flex-col rounded-2xl border border-border bg-white p-4 shadow-sm sm:p-5">
                    <time
                      dateTime={post.date.slice(0, 10)}
                      className="font-mono text-[11px] uppercase tracking-wider text-muted"
                    >
                      {formatPostDate(post.date)}
                    </time>
                    <h3 className="font-display mt-2 text-[15px] font-bold leading-snug text-foreground sm:text-base">
                      <Link
                        href={`/blog/${post.slug}/`}
                        className="hover:text-accent"
                      >
                        {post.title}
                      </Link>
                    </h3>
                    <p className="mt-2 flex-1 text-sm leading-relaxed text-muted">
                      {post.description}
                    </p>
                    <Link
                      href={`/blog/${post.slug}/`}
                      className="mt-3 inline-flex min-h-10 items-center text-sm font-semibold text-accent hover:text-blue-700"
                    >
                      Read →
                    </Link>
                  </article>
                </Reveal>
              ))}
            </div>
          </section>

          <section className="mobile-section mb-10 sm:mb-16">
            <Reveal className="mb-4 flex flex-col gap-3 sm:mb-6 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 className="font-display text-xl font-bold tracking-tight sm:text-2xl">
                  Work
                </h2>
                <p className="mt-1 max-w-xl text-sm leading-relaxed text-muted">
                  The company, the phone game, and the browser projects I build
                  for myself.
                </p>
              </div>
              <Link
                href="/work/"
                className="text-sm font-semibold text-accent hover:text-blue-700"
              >
                All projects →
              </Link>
            </Reveal>
            <div className="grid gap-3 sm:gap-4 lg:grid-cols-3">
              <Reveal className="lg:col-span-2">
                <article className="lift-card flex h-full flex-col rounded-2xl border border-border bg-white p-5 shadow-sm sm:p-8">
                  <p className="font-mono text-[11px] font-medium uppercase tracking-wider text-muted">
                    Novux Games · Early Access
                  </p>
                  <h3 className="font-display mt-2 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                    {novuxFlagship.name}
                  </h3>
                  <p className="mt-3 max-w-xl flex-1 text-sm leading-relaxed text-muted sm:text-base">
                    You take over a college basketball program. Recruit, play
                    the season, and find out if the roster holds up next year.
                    It&apos;s on your phone, and it&apos;s live.
                  </p>
                  <div className="cta-mobile-stack mt-5">
                    <a
                      href={novuxFlagship.storeUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={primaryButton}
                    >
                      Google Play
                    </a>
                    <a
                      href={ventures.novuxGames.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={secondaryButton}
                    >
                      Novux Games
                    </a>
                  </div>
                </article>
              </Reveal>
              <Reveal delayMs={80}>
                <article className="lift-card flex h-full flex-col rounded-2xl border border-border bg-white p-5 shadow-sm sm:p-6">
                  <p className="font-mono text-[11px] font-medium uppercase tracking-wider text-muted">
                    Company
                  </p>
                  <h3 className="font-display mt-2 text-xl font-bold tracking-tight text-foreground">
                    {ventures.classQuip.name}
                  </h3>
                  <p className="mt-3 flex-1 text-sm leading-relaxed text-muted">
                    Classroom software I started and still build. Knoxville
                    company, schools on the other end of it.
                  </p>
                  <div className="mt-4 flex flex-col gap-2 text-sm font-semibold">
                    <a
                      href={ventures.classQuip.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-accent hover:text-blue-700"
                    >
                      classquip.com →
                    </a>
                    <Link
                      href="/case-studies/classquip/"
                      className="text-accent hover:text-blue-700"
                    >
                      Case study →
                    </Link>
                  </div>
                </article>
              </Reveal>
            </div>
            <div className="mt-4 grid gap-3 sm:mt-6 sm:grid-cols-2 sm:gap-4">
              {workItems.map((item, index) => (
                <Reveal key={item.slug} delayMs={index * 40}>
                  <WorkCard item={item} />
                </Reveal>
              ))}
            </div>
          </section>

          <section className="mobile-section mb-10 sm:mb-16">
            <Reveal>
              <h2 className="font-display text-xl font-bold tracking-tight sm:text-2xl">
                Earlier stories
              </h2>
              <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted">
                Older work, from before the games and the company. Nightwave is
                the novel. The other two are short stories.
              </p>
            </Reveal>
            <div className="mt-4 sm:mt-6">
              <BookShelf />
            </div>
          </section>

          <Reveal>
            <section className="flex flex-col gap-4 rounded-2xl border border-border bg-surface px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
              <p className="text-sm leading-relaxed text-muted">
                <span className="font-semibold text-foreground">
                  I also take on some consulting work.
                </span>{" "}
                Details are on the services page.
              </p>
              <Link href="/services/" className={secondaryButton}>
                Services
              </Link>
            </section>
          </Reveal>
        </div>
      </main>
    </>
  );
}
