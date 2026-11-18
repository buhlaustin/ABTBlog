import Link from "next/link";
import { servicesContact } from "@/lib/services";

export function MobileBottomBar() {
  return (
    <div
      className="mobile-bottom-bar fixed inset-x-0 bottom-0 z-40 border-t border-border bg-white/95 pb-[env(safe-area-inset-bottom,0px)] shadow-[0_-8px_24px_rgba(24,24,27,0.08)] backdrop-blur-md md:hidden"
      role="navigation"
      aria-label="Quick actions"
    >
      <div className="mx-auto grid max-w-5xl grid-cols-3 gap-1 px-2 py-2">
        <a
          href={servicesContact.bookingUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="btn-press flex min-h-11 flex-col items-center justify-center rounded-xl bg-foreground px-2 text-center text-[11px] font-semibold leading-tight text-white"
        >
          Book call
        </a>
        <Link
          href="/services/#offers"
          className="btn-press flex min-h-11 flex-col items-center justify-center rounded-xl border border-border bg-surface px-2 text-center text-[11px] font-semibold leading-tight text-foreground"
        >
          Offers
        </Link>
        <Link
          href="/contact/"
          className="btn-press flex min-h-11 flex-col items-center justify-center rounded-xl border border-border bg-surface px-2 text-center text-[11px] font-semibold leading-tight text-foreground"
        >
          Contact
        </Link>
      </div>
    </div>
  );
}