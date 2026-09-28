import Image from "next/image";

import { Container } from "@/components/ui/container";
import { siteConfig } from "@/config/site";

type ServiceAreaProps = {
  title: string;
  description: string;
  rangePrompt: string;
  rangeCall: string;
  rangeRest: string;
  proofTitle: string;
  proofDetail: string;
};

export function ServiceArea({
  title,
  description,
  rangePrompt,
  rangeCall,
  rangeRest,
  proofTitle,
  proofDetail,
}: ServiceAreaProps) {
  return (
    <section
      id="service-area"
      className="scroll-mt-24 bg-secondary py-10 text-secondary-foreground sm:py-14"
      aria-labelledby="area-heading"
    >
      <Container>
        <h2
          id="area-heading"
          className="text-3xl font-extrabold tracking-tight text-foreground"
        >
          {title}
        </h2>
        <p className="mt-4 max-w-3xl leading-7 text-muted-foreground">{description}</p>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-muted-foreground">
          {rangePrompt}{" "}
          <a
            href={siteConfig.phoneHref}
            className="font-bold text-accent underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-focus"
          >
            {rangeCall}
          </a>{" "}
          {rangeRest}
        </p>

        <div className="mt-6 flex items-center gap-4 rounded-2xl border border-border bg-surface p-4 sm:gap-5 sm:p-5">
          <Image
            src={siteConfig.assets.logoBadge}
            alt="Dryer Refresh badge"
            width={315}
            height={276}
            className="h-16 w-auto sm:h-20"
          />
          <div>
            <h3 className="text-xl font-extrabold text-foreground sm:text-2xl">
              {proofTitle}
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">{proofDetail}</p>
          </div>
        </div>
      </Container>
    </section>
  );
}
