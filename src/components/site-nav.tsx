"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useState } from "react";
import { siteConfig } from "@/lib/site";

const nav = [
  { href: "/work/", label: "Work" },
  { href: "/blog/", label: "Blog" },
  { href: "/about/", label: "About" },
] as const;

const linkClass =
  "flex min-h-11 items-center rounded-lg px-3 py-2 text-muted transition hover:bg-surface-raised hover:text-foreground active:bg-surface-raised";

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
          href={siteConfig.github}
          className={linkClass}
          target="_blank"
          rel="noopener noreferrer"
        >
          GitHub
        </a>
      </nav>

      <button
        type="button"
        className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg border border-border bg-white text-foreground md:hidden"
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
            <>
              <path d="M6 6l12 12M18 6L6 18" />
            </>
          ) : (
            <>
              <path d="M4 7h16M4 12h16M4 17h16" />
            </>
          )}
        </svg>
      </button>

      {open ? (
        <div
          className="fixed inset-0 top-[calc(3.25rem+env(safe-area-inset-top,0px))] z-40 bg-black/20 md:hidden"
          aria-hidden
          onClick={() => setOpen(false)}
        />
      ) : null}

      <nav
        id={menuId}
        className={`absolute left-0 right-0 top-full z-50 border-b border-border bg-white/95 px-4 py-3 shadow-lg backdrop-blur-md transition md:hidden ${
          open
            ? "visible opacity-100"
            : "pointer-events-none invisible opacity-0"
        }`}
        aria-label="Primary mobile"
        aria-hidden={!open}
      >
        <ul className="flex flex-col gap-1">
          {nav.map((item) => (
            <li key={item.href}>
              <Link
                href={item.href}
                className={`${linkClass} w-full text-base font-semibold`}
                onClick={() => setOpen(false)}
              >
                {item.label}
              </Link>
            </li>
          ))}
          <li>
            <a
              href={siteConfig.github}
              className={`${linkClass} w-full text-base font-semibold`}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setOpen(false)}
            >
              GitHub ↗
            </a>
          </li>
        </ul>
      </nav>
    </>
  );
}
