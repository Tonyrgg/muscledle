import type { Metadata } from "next";
import { Oswald, Roboto_Condensed } from "next/font/google";
import "./globals.css";

const robotoCondensed = Roboto_Condensed({
  variable: "--font-roboto-condensed",
  subsets: ["latin"],
});

const oswald = Oswald({
  variable: "--font-oswald",
  subsets: ["latin"],
});

const META_TITLE = "Liftle \u2014 Guess the exercise";
const META_DESCRIPTION = "Daily fitness guessing game. Can you identify the exercise?";

export const metadata: Metadata = {
  title: META_TITLE,
  description: META_DESCRIPTION,
  openGraph: {
    title: META_TITLE,
    siteName: "Liftle",
    description: META_DESCRIPTION,
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: META_TITLE,
    description: META_DESCRIPTION,
  },
  icons: {
    icon: "/icon.png",
    shortcut: "/icon.png",
    apple: "/icon.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${robotoCondensed.variable} ${oswald.variable} h-full antialiased`}>
      <head>
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1"
        />
      </head>
      <body className="min-h-full bg-background text-on-background font-body">{children}</body>
    </html>
  );
}
