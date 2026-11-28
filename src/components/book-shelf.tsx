import Image from "next/image";
import { amazonAuthorUrl, books, type Book } from "@/lib/books";

function hasText(value: string | undefined): value is string {
  return typeof value === "string" && value.length > 0;
}

function Cover({ book, featured }: { book: Book; featured?: boolean }) {
  if (!hasText(book.cover)) return null;

  return (
    <Image
      src={book.cover}
      alt=""
      width={940}
      height={1500}
      className={
        featured
          ? "h-auto w-36 rounded-xl border border-border sm:w-full"
          : "h-auto w-28 rounded-xl border border-border"
      }
    />
  );
}

function BookFace({ book, featured }: { book: Book; featured?: boolean }) {
  const inner = (
    <>
      <Cover book={book} featured={featured} />
      <div className="min-w-0">
        <p className="font-mono text-[11px] font-medium uppercase tracking-wider text-muted">
          {featured ? "Novel" : "Short story"}
        </p>
        <h3
          className={
            featured
              ? "font-display mt-2 text-2xl font-bold tracking-tight text-foreground sm:text-3xl"
              : "font-display mt-2 text-xl font-bold tracking-tight text-foreground"
          }
        >
          {book.title}
        </h3>
        <p className="mt-2 text-sm leading-relaxed text-muted">{book.note}</p>
        {hasText(book.href) ? (
          <p className="mt-4 text-sm font-semibold text-accent">On Amazon →</p>
        ) : null}
      </div>
    </>
  );

  const className = featured
    ? "lift-card grid gap-5 rounded-2xl border border-border bg-white p-5 shadow-sm sm:grid-cols-[10.5rem_1fr] sm:items-center sm:p-6 md:col-span-2"
    : "lift-card flex h-full flex-col gap-4 rounded-2xl border border-border bg-white p-5 shadow-sm";

  if (!hasText(book.href)) {
    return <article className={className}>{inner}</article>;
  }

  return (
    <a
      href={book.href}
      target="_blank"
      rel="noopener noreferrer"
      className={`${className} hover:border-zinc-300`}
    >
      {inner}
    </a>
  );
}

export function BookShelf() {
  const featured = books.filter((book) => book.featured);
  const rest = books.filter((book) => !book.featured);

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {featured.map((book) => (
        <BookFace key={book.title} book={book} featured />
      ))}
      {rest.map((book) => (
        <BookFace key={book.title} book={book} />
      ))}
      <p className="md:col-span-2">
        <a
          href={amazonAuthorUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm font-semibold text-accent hover:text-blue-700"
        >
          All books on Amazon →
        </a>
      </p>
    </div>
  );
}
