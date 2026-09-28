import type { Metadata } from "next";

import { siteConfig } from "@/config/site";

type CreateMetadataInput = {
  title?: string;
  description?: string;
  path?: string;
};

export function createMetadata({
  title,
  description = siteConfig.description,
  path = "/",
}: CreateMetadataInput = {}): Metadata {
  const canonical = new URL(path, siteConfig.url).toString();
  const resolvedTitle = title
    ? `${title} | ${siteConfig.name}`
    : siteConfig.name;

  return {
    title: resolvedTitle,
    description,
    alternates: {
      canonical,
    },
    openGraph: {
      type: "website",
      url: canonical,
      siteName: siteConfig.name,
      title: resolvedTitle,
      description,
    },
    twitter: {
      card: "summary_large_image",
      title: resolvedTitle,
      description,
    },
  };
}
