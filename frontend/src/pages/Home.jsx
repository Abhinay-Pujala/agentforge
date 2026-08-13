import CTA from "../components/home/CTA";
import FeaturesSection from "../components/home/FeaturesSection";
import Footer from "../components/home/Footer";
import Hero from "../components/home/Hero";
import HowItWorksSection from "../components/home/HowItWorksSection";
import IntroSection from "../components/home/IntroSection";
import Navbar from "../components/home/NavBar";
import WhyAgentForgeSection from "../components/home/WhyAgentForgeSection";

export default function Home() {
  return (
    <main className="min-h-screen bg-slate-950">
      <Navbar />
      <Hero />
      <IntroSection />
      <FeaturesSection />
      <HowItWorksSection />
      <WhyAgentForgeSection />
      <CTA />
      <Footer />
    </main>
  );
}
