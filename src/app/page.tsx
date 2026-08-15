"use client";

import Hero from "@/components/sections/Hero";
import AboutWork from "@/components/sections/AboutWork";
import Services from "@/components/sections/Services";
import CtaCollage from "@/components/sections/CtaCollage";
import PageWrapper from "@/components/transition/PageWrapper";
import LandingIntro from "@/components/transition/LandingIntro";

export default function Home() {
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
          <CtaCollage />
        </main>
      </PageWrapper>
    </>
  );
}
