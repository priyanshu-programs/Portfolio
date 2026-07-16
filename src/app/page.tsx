"use client";

import Hero from "@/components/sections/Hero";
import AboutWork from "@/components/sections/AboutWork";
import Services from "@/components/sections/Services";
import CtaCollage from "@/components/sections/CtaCollage";
import Footer from "@/components/sections/Footer";
import PageWrapper from "@/components/transition/PageWrapper";

export default function Home() {
  return (
    <PageWrapper>
      <main className="page block">
        <Hero />
        <AboutWork />
        <div id="services">
          <Services />
        </div>
        <CtaCollage />
        <Footer />
      </main>
    </PageWrapper>
  );
}
