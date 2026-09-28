import Image from "next/image";

import { ButtonLink } from "@/components/ui/button-link";
import { Container } from "@/components/ui/container";
import { siteConfig } from "@/config/site";

type HeroProps = {
  titleLead: string;
  titleAccent: string;
  titleTail: string;
  description: string;
  primaryCta: { label: string; href: string };
  secondaryCta: { label: string; href: string };
  trust: string;
};

export function Hero({
  titleLead,
  titleAccent,
  titleTail,
  description,
  primaryCta,
  secondaryCta,
  trust,
}: HeroProps) {
  return (
    <section
      className="hero-wash bg-dominant py-10 text-dominant-foreground sm:py-14 lg:py-16"
      aria-labelledby="hero-heading"
    >
      <Container>
        <div className="grid items-center gap-8 lg:grid-cols-12 lg:gap-10">
          <div className="lg:col-span-7">
            <h1
              id="hero-heading"
              className="text-4xl font-extrabold leading-none tracking-tight text-foreground sm:text-5xl"
            >
              <span className="block">{titleLead}</span>
              <span className="mt-2 block text-accent">{titleAccent}</span>
              <span className="mt-2 block">{titleTail}</span>
            </h1>
            <p className="mt-5 max-w-xl text-base leading-7 text-muted-foreground sm:text-lg">
              {description}
            </p>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <ButtonLink href={primaryCta.href} className="w-full sm:w-auto">
                {primaryCta.label}
              </ButtonLink>
              <ButtonLink
                href={secondaryCta.href}
                variant="ink"
                className="w-full sm:w-auto"
              >
                {secondaryCta.label}
              </ButtonLink>
            </div>
            <p className="mt-4 text-sm text-muted-foreground">{trust}</p>
          </div>

          <div className="flex justify-center lg:col-span-5 lg:justify-end">
            <Image
              src={siteConfig.assets.mascotHero}
              alt="Dryer Refresh mascot wearing a black beanie with the Dryer Refresh logo"
              width={1024}
              height={1198}
              priority
              className="h-auto w-full max-w-xs rounded-2xl shadow-glow sm:max-w-sm"
            />
          </div>
        </div>
      </Container>
    </section>
  );
}
