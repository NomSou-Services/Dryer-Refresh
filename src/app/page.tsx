import { ContactBand } from "@/components/sections/cta";
import { FeatureGrid } from "@/components/sections/feature-grid";
import { Hero } from "@/components/sections/hero";
import { ServiceArea } from "@/components/sections/service-area";
import { WhyItMatters } from "@/components/sections/why-it-matters";
import { homeContent } from "@/data/home";

export default function HomePage() {
  return (
    <>
      <Hero {...homeContent.hero} />
      <FeatureGrid id="services" {...homeContent.services} />
      <WhyItMatters {...homeContent.why} />
      <ServiceArea {...homeContent.area} />
      <ContactBand {...homeContent.contact} />
    </>
  );
}
