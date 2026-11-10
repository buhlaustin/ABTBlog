export const siteConfig = {
  name: "Austin Buhl",
  /** Default `<title>` and Open Graph title for the homepage (no domain name). */
  defaultTitle: "Austin Buhl — Software Engineer & Founder",
  /** Appended by root layout for inner pages: `%s · Austin Buhl`. */
  description:
    "Software engineer and founder in Knoxville, TN. ClassQuip (K–12 edtech), Novux Games (Dynasty: College Basketball on Android), plus personal projects and open source.",
  url: "https://austinbuhltech.com",
  locale: "en_US",
  github: "https://github.com/buhlaustin",
  githubUsername: "buhlaustin",
  location: "Knoxville, TN",
  logoSignature: "/abuhl-signature.svg",
  favicon: "/ab-favicon.svg",
  ogImage: "/social-open-graph.png",
  ogImageAlt:
    "Austin Buhl — software engineer and founder (ClassQuip, Novux Games) in Knoxville, TN",
  rss: {
    channelTitle: "Austin Buhl",
    channelDescription:
      "Writing on software engineering, edtech, personal browser projects, and life as a founder.",
  },
} as const;
