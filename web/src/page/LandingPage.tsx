import Header from "../components/Header";
import Footer from "../components/Footer";
import Contact from "@/components/Contact";
import Seo from "@/components/Seo";
import HeroSection from "@/components/landing/HeroSection";
import WhySection from "@/components/landing/WhySection";
import AboutSection from "@/components/landing/AboutSection";
import ProcessSection from "@/components/landing/ProcessSection";
import ServicesSection from "@/components/landing/ServicesSection";
import KeyDatesSection from "@/components/landing/KeyDatesSection";
import TestimonialsSection from "@/components/landing/TestimonialsSection";
import { useScrollToHash } from "@/components/landing/hooks";

const LandingPage = () => {
  useScrollToHash();
  return (
    <div className="bg-white font-sans text-site-ink">
      <Seo
        title="Texas Property Tax Professionals - Lone Star Property Tax"
        description="Property tax protest and consulting for residential, commercial and business property owners across Texas. No savings, no fee."
      />
      <Header />
      <main id="main">
        <HeroSection />
        <WhySection />
        <AboutSection />
        <ProcessSection />
        <ServicesSection />
        <KeyDatesSection />
        <TestimonialsSection />
        <Contact />
      </main>
      <Footer />
    </div>
  );
};

export default LandingPage;
