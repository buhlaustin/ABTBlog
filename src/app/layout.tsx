import type { Viewport } from "next";
import { DM_Sans, Geist_Mono, Syne } from "next/font/google";
import { GTM_HEAD_SCRIPT, GTM_NOSCRIPT_IFRAME_SRC } from "@/lib/gtm";
import { rootSiteMetadata } from "@/lib/seo";
import "./globals.css";

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const syne = Syne({
  variable: "--font-syne",
  subsets: ["latin"],
  weight: ["600", "700", "800"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#ffffff",
};

export const metadata = rootSiteMetadata();

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${dmSans.variable} ${syne.variable} ${geistMono.variable} h-full`}
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: GTM_HEAD_SCRIPT,
          }}
        />
        <script
          dangerouslySetInnerHTML={{
            __html:
              'document.documentElement.classList.add("reveal-enhanced")',
          }}
        />
      </head>
      <body className="flex min-h-full flex-col">
        <noscript>
          <iframe
            src={GTM_NOSCRIPT_IFRAME_SRC}
            height="0"
            width="0"
            style={{ display: "none", visibility: "hidden" }}
            title="Google Tag Manager"
          />
        </noscript>
        {children}
      </body>
    </html>
  );
}
