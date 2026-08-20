"use client";

import PageWrapper from "@/components/transition/PageWrapper";
import TopNav from "@/components/ui/TopNav";
import AboutStage from "@/components/sections/AboutStage";
import AboutAchievements from "@/components/sections/AboutAchievements";
import { useSiteContent } from "@/components/ContentProvider";

const DEFAULT_NAME = "Priyanshu Roy";

export default function AboutPage() {
  const content = useSiteContent();
  const name = content?.settings?.name ?? DEFAULT_NAME;

  return (
    <PageWrapper>
      {/* Deliberately a plain block, not a flex column: the stage below pins,
          and a flex parent collapses the pin-spacer's padding so the trigger
          gets no scroll range. Matches how the home page hosts its pins. */}
      <main className="relative block bg-cream">
        {/* The stage is cream at every breakpoint now, so the nav sits on a
            background that never changes. A difference blend here would invert
            it against nothing; flat ink is what stays legible. */}
        <div className="absolute inset-x-0 top-0 z-40 text-ink mix-blend-normal">
          <TopNav name={name} variant="simple" blend={false} />
        </div>

        <AboutStage />
        <AboutAchievements />
      </main>
    </PageWrapper>
  );
}
