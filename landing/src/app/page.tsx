import { MatrixRain } from "@/components/landing/matrix-rain";
import { Nav } from "@/components/landing/nav";
import { Hero } from "@/components/landing/hero";
import { TerminalDemo } from "@/components/landing/terminal-demo";
import { Features } from "@/components/landing/features";
import { HowItWorks } from "@/components/landing/how-it-works";
import { Architecture } from "@/components/landing/architecture";
import { CTA } from "@/components/landing/cta";
import { Footer } from "@/components/landing/footer";
import { FadeIn } from "@/components/landing/fade-in";

export default function Home() {
  return (
    <div className="relative min-h-screen overflow-hidden grid-bg noise">
      {/* Matrix rain background */}
      <MatrixRain />

      {/* Navigation */}
      <Nav />

      {/* Main content */}
      <main className="relative z-10 flex-1">
        <Hero />

        <FadeIn>
          <section id="demo" className="relative z-10 pb-16 px-4 sm:px-6">
            <TerminalDemo />
          </section>
        </FadeIn>

        <FadeIn>
          <Features />
        </FadeIn>

        <FadeIn>
          <HowItWorks />
        </FadeIn>

        <FadeIn>
          <Architecture />
        </FadeIn>

        <FadeIn>
          <CTA />
        </FadeIn>
      </main>

      <Footer />
    </div>
  );
}
