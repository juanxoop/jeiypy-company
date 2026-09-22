import { Footer } from "@/components/layout/Footer";
import { Navbar } from "@/components/layout/Navbar";
import { FinalCta } from "@/sections/FinalCta";
import { Hero } from "@/sections/Hero";
import { Portfolio } from "@/sections/Portfolio";
import { Pricing } from "@/sections/Pricing";
import { Problem } from "@/sections/Problem";
import { Process } from "@/sections/Process";
import { Services } from "@/sections/Services";
import { siteConfig } from "@/config/site";

const organizationJsonLd = {
  "@context": "https://schema.org",
  "@type": "ProfessionalService",
  name: siteConfig.name,
  slogan: siteConfig.slogan,
  description: siteConfig.seo.description,
  url: siteConfig.url,
  logo: `${siteConfig.url}/icon.svg`,
  areaServed: { "@type": "Country", name: siteConfig.country },
  knowsAbout: ["Diseño web", "Landing pages", "Catálogos digitales", "SEO básico"],
};

export default function HomePage() {
  return (
    <>
      <Navbar />
      <main id="contenido">
        <Hero />
        <Problem />
        <Services />
        <Portfolio />
        <Pricing />
        <Process />
        <FinalCta />
      </main>
      <Footer />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd) }}
      />
    </>
  );
}
