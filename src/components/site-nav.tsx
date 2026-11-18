"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useState } from "react";
import { profile } from "@/lib/profile";
import { servicesContact } from "@/lib/services";
import { siteConfig } from "@/lib/site";

const nav = [
  { href: "/services/", label: "Services" },
  { href: "/case-studies/", label: "Case studies" },
  { href: "/blog/", label: "Writing" },
  { href: "/about/", label: "About" },
  { href: "/work/", label: "Lab" },
] as const;

const linkClass =
  "flex min-h-11 items-center rounded-lg px-3 py-2 text-muted transition hover:bg-surface-raised hover:text-foreground active:bg-surface-raised";

const contactCtaClass =
  "btn-press inline-flex min-h-11 shrink-0 items-center justify-center rounded-full bg-foreground px-4 py-2 text-sm font-semibold text-white transition hover:bg-zinc-800";

const secondaryCtaClass =
  "btn-press inline-flex min-h-11 shrink-0 items-center justify-center rounded-full border border-border bg-white px-4 py-2 text-sm font-semibold text-foreground transition hover:bg-surface";

export function SiteNav() {
  const [open, setOpen] = useState(false);
  const menuId = useId();
  const pathname = usePathname();

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <>
      {/* Desktop */}
      <nav
        className="hidden items-center gap-0.5 text-sm font-medium md:flex"
        aria-label="Primary"
      >
        {nav.map((item) => (
          <Link key={item.href} href={item.href} className={linkClass}>
            {item.label}
          </Link>
        ))}
        <a
          href={profile.linkedIn}
          className={linkClass}
          target="_blank"
          rel="noopener noreferrer"
        >
          LinkedIn
        </a>
        <a
          href={siteConfig.github}
          className={linkClass}
          target="_blank"
          rel="noopener noreferrer"
        >
          GitHub
        </a>
        <a
          href={`mailto:${servicesContact.email}`}
          className={`${secondaryCtaClass} ml-1`}
        >
          Email
        </a>
        <a
          href={`tel:${servicesContact.phoneTel}`}
          className={secondaryCtaClass}
        >
          Call
        </a>
        <a
          href={servicesContact.bookingUrl}
          target="_blank"
          rel="noopener noreferrer"
          className={`${contactCtaClass} ml-1`}
        >
          Book a call
        </a>
      </nav>

      {/* Mobile toolbar */}
      <div className="flex items-center gap-1.5 md:hidden">
        <a
          href={servicesContact.bookingUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="btn-press inline-flex min-h-11 shrink-0 items-center justify-center rounded-full bg-foreground px-3 py-2 text-xs font-semibold text-white"
        >
          Book a call
        </a>
        <button
          type="button"
          className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-full border border-border bg-white text-foreground"
          aria-expanded={open}
          aria-controls={menuId}
          onClick={() => setOpen((v) => !v)}
        >
          <span className="sr-only">{open ? "Close menu" : "Open menu"}</span>
          <svg
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            aria-hidden
          >
            {open ? (
              <path d="M6 6l12 12M18 6L6 18" />
            ) : (
              <>
                <path d="M4 7h16M4 12h16M4 17h16" />
              </>
            )}
          </svg>
        </button>
      </div>

      <div
        className={`mobile-menu-backdrop fixed inset-0 z-40 bg-zinc-950/40 backdrop-blur-[2px] transition-opacity duration-300 md:hidden ${
          open
            ? "pointer-events-auto opacity-100"
            : "pointer-events-none opacity-0"
        }`}
        aria-hidden={!open}
        onClick={() => setOpen(false)}
      />

      <nav
        id={menuId}
        className={`mobile-menu-panel fixed bottom-0 right-0 top-0 z-50 flex w-[min(100%,21rem)] flex-col border-l border-border bg-white/98 shadow-2xl backdrop-blur-xl transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] md:hidden ${
          open ? "translate-x-0" : "translate-x-full pointer-events-none"
        }`}
        aria-label="Primary mobile"
        aria-hidden={!open}
        inert={!open}
      >
        <div className="flex items-center justify-between border-b border-border px-5 py-4 pt-[max(1rem,env(safe-area-inset-top))]">
          <p className="font-display text-sm font-bold tracking-tight text-foreground">
            Menu
          </p>
          <button
            type="button"
            className="inline-flex min-h-10 min-w-10 items-center justify-center rounded-full border border-border bg-surface text-foreground"
            onClick={() => setOpen(false)}
          >
            <span className="sr-only">Close menu</span>
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              aria-hidden
            >
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>

        <ul
          className={`mobile-menu-list flex flex-1 flex-col gap-1 overflow-y-auto px-4 py-4 ${open ? "mobile-menu-list--open" : ""}`}
        >
          {nav.map((item) => {
            const base = item.href.replace(/\/$/, "");
            const active =
              pathname === item.href ||
              pathname === base ||
              pathname.startsWith(`${base}/`);
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={`flex min-h-12 w-full items-center rounded-xl px-4 text-base font-semibold transition ${
                    active
                      ? "bg-surface-raised text-foreground"
                      : "text-foreground hover:bg-surface"
                  }`}
                  onClick={() => setOpen(false)}
                >
                  {item.label}
                </Link>
              </li>
            );
          })}
          <li>
            <a
              href={profile.linkedIn}
              className="flex min-h-12 w-full items-center rounded-xl px-4 text-base font-semibold text-foreground transition hover:bg-surface"
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setOpen(false)}
            >
              LinkedIn ↗
            </a>
          </li>
          <li>
            <a
              href={siteConfig.github}
              className="flex min-h-12 w-full items-center rounded-xl px-4 text-base font-semibold text-foreground transition hover:bg-surface"
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setOpen(false)}
            >
              GitHub ↗
            </a>
          </li>
        </ul>

        <div className="border-t border-border p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <p className="mb-3 text-center font-mono text-[11px] uppercase tracking-wider text-muted">
            Get in touch
          </p>
          <div className="cta-mobile-stack">
            <a
              href={servicesContact.bookingUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={`${contactCtaClass} w-full`}
              onClick={() => setOpen(false)}
            >
              Book a call
            </a>
            <a
              href={`tel:${servicesContact.phoneTel}`}
              className={`${secondaryCtaClass} w-full`}
              onClick={() => setOpen(false)}
            >
              Call {servicesContact.phoneDisplay}
            </a>
            <a
              href={`mailto:${servicesContact.email}`}
              className={`${secondaryCtaClass} w-full`}
              onClick={() => setOpen(false)}
            >
              Email
            </a>
          </div>
        </div>
      </nav>
    </>
  );
}