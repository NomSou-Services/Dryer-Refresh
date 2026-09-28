import Image from "next/image";

import { Container } from "@/components/ui/container";
import { siteConfig } from "@/config/site";

type Feature = {
  title: string;
  description: string;
};

type FeatureGridProps = {
  id?: string;
  title: string;
  description?: string;
  features: readonly Feature[];
};

export function FeatureGrid({
  id,
  title,
  description,
  features,
}: FeatureGridProps) {
  return (
    <section
      id={id}
      className="scroll-mt-24 bg-surface py-10 text-secondary-foreground sm:py-14"
      aria-labelledby="services-heading"
    >
      <Container>
        <div className="max-w-3xl">
          <h2
            id="services-heading"
            className="text-3xl font-extrabold tracking-tight text-foreground"
          >
            {title}
          </h2>
          <span className="mt-3 block h-1 w-10 rounded-full bg-accent" aria-hidden="true" />
          {description ? (
            <p className="mt-4 leading-7 text-muted-foreground">{description}</p>
          ) : null}
        </div>

        <div className="mt-8 grid grid-cols-1 gap-3 xs:grid-cols-2 xl:grid-cols-5">
          {features.map((feature) => (
            <article
              key={feature.title}
              className="min-w-0 rounded-2xl border border-border bg-secondary p-4"
            >
              <Image
                src={siteConfig.assets.logoIcon}
                alt=""
                width={222}
                height={209}
                className="mb-3 h-10 w-10 object-contain"
              />
              <h3 className="text-sm font-bold text-foreground sm:text-base">
                {feature.title}
              </h3>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                {feature.description}
              </p>
            </article>
          ))}
        </div>
      </Container>
    </section>
  );
}
