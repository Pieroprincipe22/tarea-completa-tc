import { marketing } from "@/content/marketing";
import { Header } from "@/components/marketing/Header";
import { Footer } from "@/components/marketing/Footer";
import { Hero } from "@/components/marketing/Hero";
import { Features } from "@/components/marketing/Features";
import { HowItWorks } from "@/components/marketing/HowItWorks";
import { Pricing } from "@/components/marketing/Pricing";
import { FAQ } from "@/components/marketing/FAQ";
import { CTA } from "@/components/marketing/CTA";

export default function Page() {
  return (
    <main>
      <Header nav={marketing.nav} />
      <Hero data={marketing.hero} />

      <section id="producto">
        <Features items={marketing.features} />
      </section>

      <section id="casos">
        <HowItWorks items={marketing.howItWorks} />
      </section>

      <section id="precios">
        <Pricing plans={marketing.pricing} />
      </section>

      <section id="faq">
        <FAQ items={marketing.faqs} />
      </section>

      <section id="demo">
        <CTA />
      </section>

      <Footer data={marketing.footer} />
    </main>
  );
}