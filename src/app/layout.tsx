import type { Metadata, Viewport } from "next";
import { Oswald, Roboto_Condensed } from "next/font/google";
import "./globals.css";
import { GlobalOverlays } from "@/components/app/global-overlays";

const robotoCondensed = Roboto_Condensed({
  variable: "--font-roboto-condensed",
  subsets: ["latin"],
  display: "swap",
});

const oswald = Oswald({
  variable: "--font-oswald",
  subsets: ["latin"],
  display: "swap",
});

const SITE_URL = "https://liftdle.com";
const META_TITLE = "Liftdle — The Daily Gym Guessing Game";
const META_DESCRIPTION =
  "Guess the hidden exercise using clues like muscle, equipment and movement type.";
const GOOGLE_SITE_VERIFICATION = process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION?.trim() ?? "";
const OG_IMAGE_PATH = "/og-image.png";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: META_TITLE,
  description: META_DESCRIPTION,
  alternates: {
    canonical: "/",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  openGraph: {
    title: META_TITLE,
    siteName: "Liftdle",
    description: META_DESCRIPTION,
    type: "website",
    url: SITE_URL,
    images: [
      {
        url: OG_IMAGE_PATH,
        width: 1200,
        height: 630,
        alt: META_TITLE,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: META_TITLE,
    description: META_DESCRIPTION,
    images: [OG_IMAGE_PATH],
  },
  icons: {
    icon: [
      { url: "/favicon/favicon.ico" },
      { url: "/favicon/favicon.svg", type: "image/svg+xml" },
      { url: "/favicon/favicon-96x96.png", sizes: "96x96", type: "image/png" },
      { url: "/favicon/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon/favicon-16x16.png", sizes: "16x16", type: "image/png" },
    ],
    shortcut: "/favicon/favicon.ico",
    apple: "/favicon/apple-touch-icon.png",
  },
  manifest: "/favicon/site.webmanifest",
  ...(GOOGLE_SITE_VERIFICATION
    ? {
        verification: {
          google: GOOGLE_SITE_VERIFICATION,
        },
      }
    : {}),
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${robotoCondensed.variable} ${oswald.variable} h-full antialiased`}
    >
      <body suppressHydrationWarning className="min-h-full bg-background text-on-background font-body">
        <GlobalOverlays />
        {children}
      </body>
    </html>
  );
}
