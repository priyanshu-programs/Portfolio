"use client";

import Hero from "@/components/sections/Hero";
import AboutWork from "@/components/sections/AboutWork";
import Services from "@/components/sections/Services";
import CtaCollage from "@/components/sections/CtaCollage";
import PageWrapper from "@/components/transition/PageWrapper";
import LandingIntro from "@/components/transition/LandingIntro";
import { useIsDesktop } from "@/lib/useMediaQuery";

export default function Home() {
  /* The CTA collage is a desktop set piece: it pins the viewport for +=200% of
     scroll to play a timeline choreographed against a 1058x526 frame, and it
     pulls in nine images to do it. Below `lg` it is gated out by not mounting
     rather than by `hidden lg:block`, because CSS would hide the markup while
     leaving both costs in place - the effect would still register a pinned
     ScrollTrigger against a zero-height element, and the images would still be
     requested. AboutWork's "one tree, toggled by Tailwind" note is about
     layout; this is a mount/unmount, which that note leaves open. */
  const isDesktop = useIsDesktop();

  return (
    <>
      <LandingIntro />
      <PageWrapper>
        <main className="page block">
          <Hero />
          <AboutWork />
          <div id="services">
            <Services />
          </div>
          {isDesktop && <CtaCollage />}
        </main>
      </PageWrapper>
    </>
  );
}
