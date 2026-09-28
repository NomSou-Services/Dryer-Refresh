import Image from "next/image";
import Link from "next/link";

import { ButtonLink } from "@/components/ui/button-link";
import { Container } from "@/components/ui/container";
import { siteConfig } from "@/config/site";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-surface">
      <Container className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3 py-3">
        <Link
          href="/"
          className="shrink-0 rounded-sm focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-focus"
        >
          <Image
            src={siteConfig.assets.logoHorizontal}
            alt="Dryer Refresh"
            width={636}
            height={278}
            priority
            className="h-11 w-auto sm:h-14"
          />
        </Link>

        <nav aria-label="Primary">
          <ul className="flex flex-wrap items-center justify-end gap-2">
            <li>
              <ButtonLink href={siteConfig.phoneHref} variant="outline">
                Call
              </ButtonLink>
            </li>
            <li>
              <ButtonLink href="#contact" className="whitespace-nowrap">
                Request free inspection
              </ButtonLink>
            </li>
          </ul>
        </nav>
      </Container>
    </header>
  );
}
