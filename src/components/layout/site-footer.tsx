import Image from "next/image";

import { Container } from "@/components/ui/container";
import { siteConfig } from "@/config/site";

export function SiteFooter() {
  return (
    <footer className="bg-brand py-6 text-brand-foreground">
      <Container className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <Image
          src={siteConfig.assets.logoDark}
          alt="Dryer Refresh"
          width={288}
          height={273}
          className="h-12 w-auto self-start sm:self-center"
        />
        <div className="text-sm text-silver sm:text-right">
          <p>Family-owned · Rochester, MN</p>
          <p className="mt-1">
            © {new Date().getFullYear()} {siteConfig.legalName}
            <span aria-hidden="true"> · </span>
            <a
              href={siteConfig.facebook}
              rel="noopener noreferrer"
              className="underline decoration-silver underline-offset-4 hover:text-cyan focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-cyan"
            >
              Facebook
            </a>
          </p>
        </div>
      </Container>
    </footer>
  );
}
