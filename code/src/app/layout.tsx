import type { Metadata } from "next";
import "./globals.css";
import { I18nProvider } from "@/i18n/I18nProvider";

const TITLE = "RoomToSave — RRSP & FHSA contribution planner";
const DESCRIPTION =
  "Work out exactly how much to put into your RRSP and FHSA to cut this year's tax bill. Built for Canadian filers, including Quebec's RL-1, QPP2 and RAMQ.";

/*
 * Absolute base for the OG/Twitter image URLs. Social scrapers need an absolute
 * URL, so this has to match the deployed origin. Set NEXT_PUBLIC_SITE_URL in the
 * Cloudflare Pages build settings once the real URL is known; the fallback only
 * keeps local builds from warning.
 */
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://roomtosave.pages.dev";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: TITLE,
  description: DESCRIPTION,
  applicationName: "RoomToSave",
  // Portfolio stage: keep it out of search results. Delete this block (or flip
  // to index) when the tool is ready for a public, indexable launch.
  robots: { index: false, follow: false },
  openGraph: {
    type: "website",
    siteName: "RoomToSave",
    title: TITLE,
    description: DESCRIPTION,
    url: SITE_URL,
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen font-sans antialiased">
        <I18nProvider>{children}</I18nProvider>
      </body>
    </html>
  );
}
