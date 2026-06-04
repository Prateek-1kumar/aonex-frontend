import type { Metadata } from "next";
import LandingNav       from "@/components/landing/LandingNav";
import LandingHero      from "@/components/landing/LandingHero";
import LandingTicker    from "@/components/landing/LandingTicker";
import LandingPlatform  from "@/components/landing/LandingPlatform";
import LandingHowItWorks from "@/components/landing/LandingHowItWorks";
import LandingTerminal  from "@/components/landing/LandingTerminal";
import LandingMetrics   from "@/components/landing/LandingMetrics";
import LandingDemoCTA   from "@/components/landing/LandingDemoCTA";
import LandingFooter    from "@/components/landing/LandingFooter";
import LandingScripts   from "@/components/landing/LandingScripts";

export const metadata: Metadata = {
  title: "Aonex | Autonomous Commerce Engine",
  description: "From raw data to market revenue in one engine. Aonex ingests supplier data, enriches it with agentic AI, benchmarks it, and distributes it across global marketplaces.",
};

export default function Home() {
  return (
    <div className="bg-ld-bg text-ld-text font-dm-sans overflow-x-hidden">
      <LandingNav />
      <LandingHero />
      <LandingTicker />
      <LandingPlatform />
      <LandingHowItWorks />
      <LandingTerminal />
      <LandingMetrics />
      <LandingDemoCTA />
      <LandingFooter />
      <LandingScripts />
    </div>
  );
}
