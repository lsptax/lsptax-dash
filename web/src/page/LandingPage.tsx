import Hero from "../components/Hero";
import FeatureArray from "../components/FeatureArray";
import About from "../components/About";
import WorkProcess from "../components/WorkProcess";
import Services from "../components/Services";
import FeatureStrip from "../components/FeatureStrip";
// import WhyUs from "../components/WhyUs";
import KeyDates from "../components/KeyDates";
import Testimonials from "../components/Testimonials";
import Header from "../components/Header";
import Footer from "../components/Footer";
import Contact from "@/components/Contact";

const LandingPage = () => {
  return (
    <>
      <Header />
      <main id="main">
      <Hero />
      <FeatureArray />
      <About />
      <WorkProcess />
      <Services />
      <FeatureStrip />
      {/* <WhyUs /> */}
      <KeyDates />
      <Testimonials />
      <Contact/>
      <Footer />
      </main>
    </>
  );
}

export default LandingPage