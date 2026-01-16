import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "code.quest",
  description:
    "AI-guided programming quests with realtime feedback and curated challenge paths.",
  applicationName: "code.quest",
  metadataBase: new URL("https://quest-26h.pages.dev"),
  openGraph: {
    title: "code.quest",
    description:
      "Learn programming through AI-guided quests and realtime feedback.",
    url: "https://quest-26h.pages.dev",
    siteName: "code.quest",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "code.quest",
    description:
      "AI-guided programming quests with realtime feedback and curated challenge paths.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
