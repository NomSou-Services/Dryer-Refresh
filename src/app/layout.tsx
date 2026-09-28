import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import type { ReactNode } from "react";

import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { JsonLd } from "@/components/seo/json-ld";
import { siteConfig } from "@/config/site";
import designTokens from "../../design/tokens.json";

import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  title: {
    default: siteConfig.title,
    template: `%s | ${siteConfig.name}`,
  },
  description: siteConfig.description,
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    siteName: siteConfig.name,
    url: siteConfig.url,
    title: siteConfig.title,
    description: siteConfig.description,
    images: [
      {
        url: siteConfig.assets.shareImage,
        width: 1254,
        height: 1254,
        alt: "Dryer Refresh logo",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: siteConfig.title,
    description: siteConfig.description,
    images: [siteConfig.assets.shareImage],
  },
  icons: {
    icon: [{ url: siteConfig.assets.logoAppIcon, type: "image/png" }],
    apple: [{ url: siteConfig.assets.logoAppIcon, type: "image/png" }],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: designTokens.colors.accent,
  colorScheme: "light",
};

const structuredData = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebSite",
      name: siteConfig.name,
      url: siteConfig.url,
      description: siteConfig.description,
    },
    {
      "@type": "LocalBusiness",
      name: siteConfig.legalName,
      image: new URL(siteConfig.assets.shareImage, siteConfig.url).toString(),
      url: siteConfig.url,
      telephone: "+1-507-884-3161",
      email: siteConfig.email,
      founder: {
        "@type": "Person",
        name: siteConfig.owner,
        jobTitle: siteConfig.ownerRole,
      },
      address: {
        "@type": "PostalAddress",
        addressLocality: "Rochester",
        addressRegion: "MN",
        addressCountry: "US",
      },
      areaServed: [
        "Rochester, MN",
        "Owatonna, MN",
        "Minneapolis, MN",
        "Saint Paul, MN",
      ],
      sameAs: [siteConfig.facebook],
      description: siteConfig.description,
    },
  ],
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en" className={inter.variable}>
      <body>
        <a
          href="#main-content"
          className="sr-only fixed left-4 top-4 z-50 rounded bg-brand px-4 py-2 text-brand-foreground focus:not-sr-only focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan"
        >
          Skip to content
        </a>
        <JsonLd data={structuredData} />
        <SiteHeader />
        <main id="main-content">{children}</main>
        <SiteFooter />
      </body>
    </html>
  );
}
