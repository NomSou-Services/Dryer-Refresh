import Image from "next/image";

import { Container } from "@/components/ui/container";
import { siteConfig } from "@/config/site";

type WhyItMattersProps = {
  title: string;
  hazard: string;
  body: string;
  bullets: readonly string[];
  closing: string;
};

export function WhyItMatters({
  title,
  hazard,
  body,
  bullets,
  closing,
}: WhyItMattersProps) {
  return (
    <section
      id="why"
      className="scroll-mt-24 bg-brand py-10 text-brand-foreground sm:py-14"
      aria-labelledby="why-heading"
    >
      <Container className="flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
        <div className="max-w-3xl">
          <h2
            id="why-heading"
            className="text-3xl font-extrabold tracking-tight text-brand-foreground"
          >
            {title}
          </h2>
          <p className="mt-4 text-sm leading-7 text-silver sm:text-base">
            <strong className="mr-1 inline rounded-md border-l-4 border-destructive bg-safety px-2 py-0.5 font-bold text-foreground">
              {hazard}
            </strong>{" "}
            {body}
          </p>
          <ul className="mt-5 grid gap-3 sm:grid-cols-2 sm:gap-x-8">
            {bullets.map((item) => (
              <li key={item} className="flex gap-2 text-sm leading-6 sm:text-base">
                <span
                  className="mt-2 size-2 shrink-0 rounded-full bg-cyan"
                  aria-hidden="true"
                />
                <span>{item}</span>
              </li>
            ))}
          </ul>
          <p className="mt-5 text-sm leading-6 text-silver sm:text-base">{closing}</p>
        </div>
        <Image
          src={siteConfig.assets.logoDark}
          alt="Dryer Refresh"
          width={345}
          height={282}
          className="h-24 w-auto self-start lg:h-28"
        />
      </Container>
    </section>
  );
}
