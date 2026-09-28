import Link from "next/link";

import { Container } from "@/components/ui/container";
import { siteConfig } from "@/config/site";

export default function NotFound() {
  return (
    <section className="bg-dominant py-24 text-dominant-foreground">
      <Container>
        <p className="text-sm font-semibold text-accent">404</p>
        <h1 className="mt-3 text-4xl font-bold tracking-tight text-brand">
          Page not found
        </h1>
        <p className="mt-4 max-w-xl text-muted-foreground">
          That page isn’t on this site. Head home, or call {siteConfig.phoneDisplay}.
        </p>
        <Link
          href="/"
          className="mt-7 inline-flex min-h-11 items-center rounded-full bg-accent px-5 py-3 text-sm font-bold text-accent-foreground shadow-sm transition hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan"
        >
          Return home
        </Link>
      </Container>
    </section>
  );
}
