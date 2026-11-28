/**
 * Books on the homepage.
 * Leave `cover` or `href` unset to render a text-only card with no link.
 * Do not add a URL or image until it has been checked against a real page.
 */
export type Book = {
  title: string;
  /** One factual line under the title. */
  note: string;
  /** Path in /public, for example "/books/nightwave.jpg". */
  cover?: string;
  /** Confirmed store URL. */
  href?: string;
  featured?: boolean;
};

export const amazonAuthorUrl =
  "https://www.amazon.com/stores/Austin-Buhl/author/B09QH8H3DM/allbooks";

export const books: readonly Book[] = [
  {
    title: "Nightwave",
    note: "The novel. I wrote it before the games and the company.",
    cover: "/books/nightwave.jpg",
    href: "https://www.amazon.com/Nightwave-Book-One-Ilioneus-Chronicles-ebook/dp/B0BQC9CK42",
    featured: true,
  },
  {
    title: "Another Long Night",
    note: "Short story.",
    cover: "/books/another-long-night.jpg",
    href: "https://www.amazon.com/Another-Long-Night-Short-Story-ebook/dp/B0BDWQRZ84",
  },
  {
    title: "The Powerless Fight",
    note: "Short story.",
    cover: "/books/the-powerless-fight.jpg",
    href: "https://www.amazon.com/Powerless-Fight-Short-Story-ebook/dp/B09MZN56MC",
  },
];
