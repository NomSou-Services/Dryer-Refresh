import type { MetadataRoute } from "next";

import { siteConfig } from "@/config/site";
import designTokens from "../../design/tokens.json";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: siteConfig.legalName,
    short_name: siteConfig.name,
    description: siteConfig.description,
    start_url: "/",
    display: "standalone",
    background_color: designTokens.colors.background,
    theme_color: designTokens.colors.accent,
    icons: [
      {
        src: siteConfig.assets.logoAppIcon,
        sizes: "222x207",
        type: "image/png",
      },
      {
        src: "/brand/logo-icon.png",
        sizes: "222x209",
        type: "image/png",
      },
    ],
  };
}
