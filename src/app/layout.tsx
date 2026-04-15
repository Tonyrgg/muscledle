import type { Metadata } from "next";
import { Oswald, Roboto_Condensed } from "next/font/google";
import "./globals.css";
import { Analytics } from "@vercel/analytics/next";

const robotoCondensed = Roboto_Condensed({
  variable: "--font-roboto-condensed",
  subsets: ["latin"],
});

const oswald = Oswald({
  variable: "--font-oswald",
  subsets: ["latin"],
});

const META_TITLE = "Liftdle \u2014 Guess the exercise";
const META_DESCRIPTION =
  "Daily fitness guessing game. Can you identify the exercise?";

export const metadata: Metadata = {
  title: META_TITLE,
  description: META_DESCRIPTION,
  openGraph: {
    title: META_TITLE,
    siteName: "Liftdle",
    description: META_DESCRIPTION,
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: META_TITLE,
    description: META_DESCRIPTION,
  },
  icons: {
    icon: [
      { url: "/favicon.ico" },
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/favicon-96x96.png", sizes: "96x96", type: "image/png" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
    ],
    shortcut: "/favicon.ico",
    apple: "/apple-touch-icon.png",
  },
  manifest: "/site.webmanifest",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${robotoCondensed.variable} ${oswald.variable} h-full antialiased`}
    >
      <Analytics/>
      <body className="min-h-full bg-background text-on-background font-body">
        {children}
      </body>
    </html>
  );
}
