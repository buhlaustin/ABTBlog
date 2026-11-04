export const siteConfig = {
  name: "Austin Buhl",
  /** Default `<title>` and Open Graph title for the homepage (no domain name). */
  defaultTitle: "Austin Buhl — Knoxville, TN Software Engineer",
  /** Appended by root layout for inner pages: `%s · Austin Buhl`. */
  description:
    "Software engineer and indie game designer in Knoxville, TN. Real-time edtech, browser games, simulations, and open source.",
  url: "https://austinbuhltech.com",
  locale: "en_US",
  github: "https://github.com/buhlaustin",
  githubUsername: "buhlaustin",
  location: "Knoxville, TN",
  logoSignature: "/abuhl-signature.svg",
  favicon: "/ab-favicon.svg",
  ogImage: "/social-open-graph.png",
  ogImageAlt:
    "Austin Buhl — software engineer and indie game designer in Knoxville, TN",
  rss: {
    channelTitle: "Austin Buhl",
    channelDescription:
      "Writing on software engineering, edtech, browser games, and side projects by Austin Buhl.",
  },
} as const;
