import { Hanken_Grotesk } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import { ViewTransitions } from "next-view-transitions";
import SmoothScroll from "@/components/SmoothScroll";
import FollowCursor from "@/components/ui/FollowCursor";
import FloatingMenu from "@/components/ui/FloatingMenu";
import RouteLoadingOverlay from "@/components/transition/RouteLoadingOverlay";
import SiteFooter from "@/components/sections/SiteFooter";
import { ContentProvider } from "@/components/ContentProvider";
import { getSiteContent } from "@/lib/sanity/getSiteContent";
import { ARM_SCRIPT } from "@/lib/landingIntroArm";

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
      {/* `suppressHydrationWarning` on both elements below is load-bearing, not
          boilerplate: the arming script stamps a class on <html> before React
          hydrates, so the client's className cannot match the server HTML.
          Removing either attribute means a hydration warning on every armed
          load of the home page. */}
      <html
        lang="en"
        className={`h-full antialiased ${hanken.variable}`}
        suppressHydrationWarning
      >
        <body
          className="min-h-full flex flex-col bg-white text-black font-sans font-light"
          suppressHydrationWarning
        >
          {/*
            Pre-paint gate for the home intro. Keep this as a `beforeInteractive`
            script so it is scheduled before hydration and runs before the intro
            can paint.

            Why not a hand-written <head>: Next owns <head> through the Metadata
            API (this layout uses generateMetadata), and the layout docs
            explicitly warn against adding one. First-child-of-<body> is just as
            early, because the render-blocking stylesheet in <head> is already
            applied by the time the parser gets here.

            No nonce: next.config.ts sends no `script-src`. If a real CSP is
            ever added there, this script needs the nonce or the intro gate
            silently stops working and the flash comes back.
          */}
          <Script
            id="landing-intro-arm"
            strategy="beforeInteractive"
            dangerouslySetInnerHTML={{ __html: ARM_SCRIPT }}
          />
          <ContentProvider value={content}>
            <SmoothScroll>
              {children}
              <SiteFooter />
            </SmoothScroll>
            <FollowCursor zIndex={10050} />
            <FloatingMenu />
            <RouteLoadingOverlay />
          </ContentProvider>
        </body>
      </html>
    </ViewTransitions>
  );
}
