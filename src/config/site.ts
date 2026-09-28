const fallbackUrl = "http://localhost:43123";

function resolveSiteUrl(): string {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (!configured) return fallbackUrl;

  let parsed: URL;
  try {
    parsed = new URL(configured);
  } catch {
    throw new Error(
      "NEXT_PUBLIC_SITE_URL must be an absolute http(s) origin, for example https://your-project.vercel.app",
    );
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new Error("NEXT_PUBLIC_SITE_URL must use http: or https:.");
  }

  return parsed.origin;
}

export const siteConfig = {
  name: "Dryer Refresh",
  legalName: "Dryer Refresh LLC",
  title: "Dryer Vent Cleaning in Rochester MN | Dryer Refresh",
  description:
    "Family-owned dryer and vent cleaning in Rochester, Owatonna, Minneapolis, Saint Paul, and central–SE Minnesota. Free inspections. Call 507-884-3161.",
  url: resolveSiteUrl(),
  phoneDisplay: "507-884-3161",
  phoneHref: "tel:+15078843161",
  email: "dryerrefresh@gmail.com",
  emailHref: "mailto:dryerrefresh@gmail.com",
  owner: "Lalee Xiong",
  ownerRole: "Owner/Operator",
  location: "Rochester, MN",
  facebook: "https://www.facebook.com/people/Dryer-Refresh/61564209920117/",
  assets: {
    logoHorizontal: "/brand/logo-horizontal.png",
    logoDark: "/brand/logo-dark.png",
    logoBadge: "/brand/logo-badge.png",
    logoIcon: "/brand/logo-icon.png",
    logoAppIcon: "/brand/logo-app-icon.png",
    mascotHero: "/brand/mascot-hero.webp",
    shareImage: "/brand/logo-main.webp",
  },
} as const;
