import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto flex max-w-lg flex-1 flex-col justify-center px-4 py-16 text-center sm:px-6">
      <h1 className="font-display text-4xl font-bold tracking-tight">404</h1>
      <p className="mt-3 text-muted">That route doesn&apos;t exist.</p>
      <Link
        href="/"
        className="mt-8 inline-flex self-center rounded-full bg-foreground px-5 py-2.5 text-sm font-semibold text-white hover:bg-zinc-800"
      >
        Back home
      </Link>
    </main>
  );
}
