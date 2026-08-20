"use client";

import PageWrapper from "@/components/transition/PageWrapper";
import TopNav from "@/components/ui/TopNav";
import ContactStage from "@/components/sections/ContactStage";
import { useSiteContent } from "@/components/ContentProvider";

const DEFAULT_NAME = "Priyanshu Roy";

export default function ContactPage() {
  const content = useSiteContent();
  const name = content?.settings?.name ?? DEFAULT_NAME;

  return (
    <PageWrapper>
      <main className="relative block">
        {/* Background is now the animated Bloom Field mesh gradient inside
            ContactStage — no solid bg-cream needed on the wrapper. */}
        <div className="absolute inset-x-0 top-0 z-40 text-ink mix-blend-normal">
          <TopNav name={name} variant="simple" blend={false} />
        </div>

        <ContactStage />
      </main>
    </PageWrapper>
  );
}
