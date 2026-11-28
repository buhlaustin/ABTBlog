import Image from "next/image";
import { amazonAuthorUrl, books, type Book } from "@/lib/books";

function hasText(value: string | undefined): value is string {
  return typeof value === "string" && value.length > 0;
}

function BookCover({ book, featured }: { book: Book; featured?: boolean }) {
  if (!hasText(book.cover)) return null;

  return (
    <Image
      src={book.cover}
      alt=""
      width={940}
      height={1500}
      className={
        featured
          ? "h-auto w-44 max-w-full border border-border sm:w-full"
          : "h-auto w-28 max-w-full border border-border"
      }
    />
  );
}

function BookCopy({ book, featured }: { book: Book; featured?: boolean }) {
  return (
    <div className="min-w-0">
      <h3
        className={
          featured
            ? "font-display text-4xl font-semibold leading-none tracking-tight text-foreground sm:text-5xl"
            : "font-display text-[1.65rem] font-semibold leading-tight tracking-tight text-foreground"
        }
      >
        {book.title}
      </h3>
      <p className="mt-3 text-sm leading-relaxed text-muted">{book.note}</p>
      {hasText(book.href) ? (
        <p className="mt-4 text-sm text-foreground underline decoration-border underline-offset-4">
          On Amazon
        </p>
      ) : null}
    </div>
  );
}

function BookCard({ book, featured }: { book: Book; featured?: boolean }) {
  const body = (
    <>
      <BookCover book={book} featured={featured} />
      <BookCopy book={book} featured={featured} />
    </>
  );

  const layout = featured
    ? "grid items-center gap-6 sm:grid-cols-[minmax(0,13.5rem)_1fr]"
    : "flex max-w-xs flex-col items-start gap-4";

  if (!hasText(book.href)) {
    return <article className={layout}>{body}</article>;
  }

  return (
    <a
      href={book.href}
      target="_blank"
      rel="noopener noreferrer"
      className={`${layout} group rounded-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-foreground`}
    >
      {body}
    </a>
  );
}

export function BookShelf() {
  const featured = books.filter((book) => book.featured);
  const rest = books.filter((book) => !book.featured);

  return (
    <div>
      <h2
        id="books-heading"
        className="font-display text-4xl font-semibold tracking-tight text-foreground sm:text-5xl"
      >
        Books
      </h2>
      <div className="mt-8 space-y-10">
        {featured.map((book) => (
          <BookCard key={book.title} book={book} featured />
        ))}
      </div>
      {rest.length > 0 ? (
        <div className="mt-10 grid gap-8 border-t border-border pt-8 sm:grid-cols-2">
          {rest.map((book) => (
            <BookCard key={book.title} book={book} />
          ))}
        </div>
      ) : null}
      <p className="mt-8">
        <a
          href={amazonAuthorUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm text-foreground underline decoration-border underline-offset-4 hover:decoration-foreground"
        >
          All books on Amazon
        </a>
      </p>
    </div>
  );
}
