export const siteConfig = {
  name: "Austin Buhl",
  /** Default `<title>` and Open Graph title for the homepage (no domain name). */
  defaultTitle: "Austin Buhl — Software Engineer & Founder",
  /** Appended by root layout for inner pages: `%s · Austin Buhl`. */
  description:
    "Software engineer and founder in Knoxville, TN. Edtech integrations (LTI 1.3, OneRoster, WebRTC), web, and Android. ClassQuip and Novux Games.",
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
  ogImageAlt:
    "Austin Buhl — edtech integration engineer for LTI 1.3, OneRoster, and WebRTC classroom systems in Knoxville, TN",
  rss: {
    channelTitle: "Austin Buhl",
    channelDescription:
      "Writing on software engineering, edtech, personal browser projects, and life as a founder.",
  },
} as const;
