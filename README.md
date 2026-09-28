# Dryer Refresh

Single landing page for Dryer Refresh LLC, a family-owned dryer and vent cleaning company in Rochester, Minnesota.

Built on the NomSou client starter: Next.js App Router, TypeScript, and Tailwind CSS. Visuals follow the branded wire (desktop 1440 and mobile 390) and Andy’s locked landing copy.

## Run locally

Node.js 20.9 or newer.

```bash
npm install
npm run dev -- --port 43123
```

Open [http://localhost:43123](http://localhost:43123).

Production check:

```bash
npm run lint
npm run typecheck
npm run build
```

Optional local canonical URL (defaults to `http://localhost:43123`):

```bash
cp .env.example .env.local
```

## Deploy on Vercel

`NEXT_PUBLIC_SITE_URL` is the public HTTPS origin. Metadata, the canonical link, Open Graph, Twitter cards, the sitemap, robots, and JSON-LD all read it from `src/config/site.ts`. Next.js inlines `NEXT_PUBLIC_*` at build time, so set the variable in the Vercel project before the production build.

1. On the first deploy, set it to the Vercel URL, for example `https://dryer-refresh.vercel.app`. No trailing slash.
2. When the client buys a domain and it is attached in Vercel, change the variable to that `https://` origin and redeploy.

If the variable is missing, those URLs fall back to `http://localhost:43123`. That fallback is only for local work.

Production responses also send `Strict-Transport-Security: max-age=63072000; includeSubDomains`. Local `next dev` does not.

## Calls and email

- Phone: [507-884-3161](tel:+15078843161)
- Email: [dryerrefresh@gmail.com](mailto:dryerrefresh@gmail.com)
- Owner: Lalee Xiong, Owner/Operator · Dryer Refresh LLC

Nav **Call** dials the shop. Nav **Request free inspection** and the hero secondary button scroll to the contact block, where the phone, email, and owner line live. The header stays sticky so the call action remains available on mobile.

## Brand tokens

Client palette only. Do not introduce NomSou navy or gold.

| Role | Hex | Use |
| --- | --- | --- |
| Primary | `#0090F8` | CTAs, links, “Safer home.” |
| Cyan | `#40D0F8` | Why-it-matters bullets and eyebrow |
| Ink | `#0B1A33` | Headings, dark band, footer |
| Silver | `#C0C8D0` | Borders, footer secondary text |
| Safety red | `#F80000` | Hazard accent only |
| Safety yellow | `#F8D078` | “Lint is highly flammable.” callout only |
| Page | `#FFFFFF` | Nav, services, contact |
| Wash | `#F3F8FC` | Service cards and service-area band |
| Glow | `#E8F6FE` | Hero wash |

Body copy uses ink-tinted `#3A4D63` from the branded wire so paragraphs stay readable. Silver is not used for small text on white.

Logos and the mascot live in `public/brand/`. Nav, icon, and dark-background marks had their flat mattes removed so they sit on white, wash, and ink without a boxed edge. Favicon sources are `logo-icon.png` and `logo-app-icon.png`.
