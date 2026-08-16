import { Hanken_Grotesk } from "next/font/google";
import "./globals.css";
import { ViewTransitions } from "next-view-transitions";
import SmoothScroll from "@/components/SmoothScroll";
import FollowCursor from "@/components/ui/FollowCursor";
import FloatingMenu from "@/components/ui/FloatingMenu";
import SiteFooter from "@/components/sections/SiteFooter";
import { ContentProvider } from "@/components/ContentProvider";
import { getSiteContent } from "@/lib/sanity/getSiteContent";

const hanken = Hanken_Grotesk({
  subsets: ["latin"],
  weight: ["300", "400", "500"],
  variable: "--font-hanken",
});

/**
 * Sanity is the source of truth for every page, and this layout holds the one
 * fetch that feeds all of them via ContentProvider. Without an explicit window
 * here the whole tree is prerendered once at build time on the host, and only
 * a working /api/revalidate webhook can ever unfreeze it — which is precisely
 * how published edits went live locally but never on the deployment.
 *
 * This is the time-based floor, not the primary mechanism: the webhook still
 * gives near-instant updates. It just guarantees staleness is bounded even if
 * the webhook is misconfigured or removed.
 */
export const revalidate = 60;

const DEFAULT_TITLE = "Priyanshu Roy — Brand Designer & Web Developer";
const DEFAULT_DESCRIPTION =
  "Most sites look like templates. Mine don't. Identity and execution, together.";

export async function generateMetadata() {
  const content = await getSiteContent();
  return {
    title: content?.settings?.seoTitle ?? DEFAULT_TITLE,
    description: content?.settings?.seoDescription ?? DEFAULT_DESCRIPTION,
  };
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const content = await getSiteContent();

  return (
    <ViewTransitions>
      <html
        lang="en"
        className={`h-full antialiased ${hanken.variable}`}
        suppressHydrationWarning
      >
        <body
          className="min-h-full flex flex-col bg-white text-black font-sans font-light"
          suppressHydrationWarning
        >
          <ContentProvider value={content}>
            <SmoothScroll>
              {children}
              <SiteFooter />
            </SmoothScroll>
            <FollowCursor zIndex={10050} />
            <FloatingMenu />
          </ContentProvider>
        </body>
      </html>
    </ViewTransitions>
  );
}
