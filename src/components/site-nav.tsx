"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useState } from "react";
import { createPortal } from "react-dom";
import { profile } from "@/lib/profile";
import { servicesContact } from "@/lib/services";
import { siteConfig } from "@/lib/site";

const nav = [
  { href: "/services/", label: "Services" },
  { href: "/case-studies/", label: "Case studies" },
  { href: "/blog/", label: "Blog" },
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
  const [mounted, setMounted] = useState(false);
  const menuId = useId();
  const pathname = usePathname();

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    document.documentElement.classList.toggle("mobile-menu-open", open);
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.documentElement.classList.remove("mobile-menu-open");
      document.body.style.overflow = "";
    };
  }, [open]);

  const mobileSheet = (
    <>
      <div
        className={`fixed inset-0 z-[80] bg-zinc-950/45 transition-opacity duration-300 md:hidden ${
          open
            ? "pointer-events-auto opacity-100"
            : "pointer-events-none opacity-0"
        }`}
        aria-hidden={!open}
        onClick={() => setOpen(false)}
      />
      <nav
        id={menuId}
        className={`fixed inset-x-0 bottom-0 z-[90] flex max-h-[min(85dvh,32rem)] flex-col rounded-t-2xl border border-b-0 border-border bg-white shadow-2xl transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] md:hidden ${
          open ? "translate-y-0" : "translate-y-full pointer-events-none"
        }`}
        aria-label="Primary mobile"
        aria-hidden={!open}
        {...(!open ? { inert: true as const } : {})}
      >
        <div
          className="mx-auto mt-2.5 h-1 w-10 shrink-0 rounded-full bg-border"
          aria-hidden
        />
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
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

        <ul className="mobile-menu-list flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto overscroll-contain px-3 py-2">
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
                  className={`flex min-h-11 w-full items-center rounded-xl px-3 text-[15px] font-semibold transition ${
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
              className="flex min-h-11 w-full items-center rounded-xl px-3 text-[15px] font-semibold text-foreground transition hover:bg-surface"
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
              className="flex min-h-11 w-full items-center rounded-xl px-3 text-[15px] font-semibold text-foreground transition hover:bg-surface"
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setOpen(false)}
            >
              GitHub ↗
            </a>
          </li>
        </ul>

        <div className="shrink-0 border-t border-border p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <div className="flex flex-col gap-2">
            <a
              href={servicesContact.bookingUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={`${contactCtaClass} w-full`}
              onClick={() => setOpen(false)}
            >
              Book a 20-minute call
            </a>
            <div className="grid grid-cols-2 gap-2">
              <a
                href={`tel:${servicesContact.phoneTel}`}
                className={`${secondaryCtaClass} w-full`}
                onClick={() => setOpen(false)}
              >
                Call
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
        </div>
      </nav>
    </>
  );

  return (
    <>
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

      <div className="flex items-center md:hidden">
        <button
          type="button"
          className="inline-flex min-h-10 min-w-10 items-center justify-center rounded-full border border-border bg-white text-foreground"
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

      {mounted ? createPortal(mobileSheet, document.body) : null}
    </>
  );
}