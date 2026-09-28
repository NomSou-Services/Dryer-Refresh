import { ButtonLink } from "@/components/ui/button-link";
import { Container } from "@/components/ui/container";
import { siteConfig } from "@/config/site";

type ContactBandProps = {
  title: string;
  note: string;
  cta: string;
};

/**
 * Contact sits on the dominant canvas.
 * Dark brand surfaces (`bg-brand` / `text-brand-foreground`) are the
 * why-it-matters band and the footer, matching the approved wire.
 */
export function ContactBand({ title, note, cta }: ContactBandProps) {
  return (
    <section
      id="contact"
      className="scroll-mt-24 bg-dominant py-10 text-dominant-foreground sm:py-14"
      aria-labelledby="contact-heading"
    >
      <Container className="flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-center">
        <div>
          <h2
            id="contact-heading"
            className="text-3xl font-extrabold tracking-tight text-foreground"
          >
            {title}
          </h2>
          <a
            href={siteConfig.phoneHref}
            className="mt-3 inline-block text-2xl font-extrabold text-accent underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-focus sm:text-3xl"
          >
            {siteConfig.phoneDisplay}
          </a>
          <div className="mt-2">
            <a
              href={siteConfig.emailHref}
              className="text-muted-foreground underline decoration-silver underline-offset-4 hover:text-accent focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-focus"
            >
              {siteConfig.email}
            </a>
          </div>
          <p className="mt-3 text-sm text-muted-foreground">
            {siteConfig.owner}, {siteConfig.ownerRole} · {siteConfig.legalName}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">{note}</p>
        </div>
        <ButtonLink href={siteConfig.phoneHref} className="w-full sm:w-auto">
          {cta}
        </ButtonLink>
      </Container>
    </section>
  );
}
