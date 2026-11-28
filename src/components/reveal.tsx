"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

type RevealProps = {
  children: ReactNode;
  className?: string;
  /** Stagger offset applied before the enter transition runs. */
  delayMs?: number;
  /** `mount` for above-the-fold hero blocks; default scroll-into-view. */
  when?: "scroll" | "mount";
};

export function Reveal({
  children,
  className = "",
  delayMs = 0,
  when = "scroll",
}: RevealProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const reduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    if (reduced) {
      const id = window.setTimeout(() => setVisible(true), 0);
      return () => window.clearTimeout(id);
    }

    if (when === "mount") {
      const id = window.setTimeout(() => setVisible(true), 40 + delayMs);
      return () => window.clearTimeout(id);
    }

    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          window.setTimeout(() => setVisible(true), delayMs);
          observer.disconnect();
        }
      },
      { threshold: 0.06, rootMargin: "0px 0px -6% 0px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [when, delayMs]);

  const delayStyle =
    delayMs > 0 ? ({ transitionDelay: `${delayMs}ms` } as const) : undefined;

  return (
    <div
      ref={ref}
      className={`reveal${visible ? " reveal--in" : ""}${className ? ` ${className}` : ""}`}
      style={delayStyle}
    >
      {children}
    </div>
  );
}