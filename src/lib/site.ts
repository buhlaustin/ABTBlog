export const siteConfig = {
  name: "Austin Buhl",
  /** Default `<title>` and Open Graph title for the homepage (no domain name). */
  defaultTitle: "Austin Buhl · Games, classroom software, and writing",
  /** Appended by root layout for inner pages: `%s · Austin Buhl`. */
  description:
    "I'm Austin, a builder in Knoxville. This is my personal site: what I've made, what I'm working on now, and what I'm writing.",
  url: "https://austinbuhltech.com",
  locale: "en_US",
  github: "https://github.com/buhlaustin",
  githubUsername: "buhlaustin",
  twitter: "https://x.com/buhlaustin",
  twitterUsername: "buhlaustin",
  location: "Knoxville, TN",
  logoSignature: "/abuhl-signature.svg",
  favicon: "/ab-favicon.svg",
  ogImage: "/social-open-graph.png",
  ogImageAlt: "Austin Buhl, software developer",
  rss: {
    channelTitle: "Austin Buhl",
    channelDescription:
      "Writing on software engineering, edtech, personal browser projects, and life as a founder.",
  },
} as const;
