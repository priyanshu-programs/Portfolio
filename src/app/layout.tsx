import { Hanken_Grotesk } from "next/font/google";
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
            Pre-paint gate for the home intro. This MUST stay a raw <script>
            tag. Do not "modernize" it back to next/script.

            It was a `<Script strategy="beforeInteractive">` and that is exactly
            why the page flashed. Next does not emit that as an executable
            inline script — it compiles it into a deferred queue entry:

              <script>(self.__next_s=self.__next_s||[]).push([0,{"children":"..."}])</script>

            That is a push onto an array with the code as a *string*. It runs
            only once the Next runtime bundle boots and drains __next_s, i.e.
            around hydration — precisely the moment this gate exists to
            pre-empt. So `intro-armed` landed after the browser had already
            painted the finished white homepage.

            `beforeInteractive` guarantees ordering relative to Next's own
            modules ("downloaded before any Next.js module", "does not block
            page hydration"). It is not a pre-paint guarantee. A plain <script>
            rendered by a Server Component goes into the HTML verbatim and the
            parser executes it synchronously, blocking until it returns.

            Why first-child-of-<body> and not a hand-written <head>: Next owns
            <head> through the Metadata API (this layout uses generateMetadata)
            and the layout docs warn against adding one. This position is just
            as early — the render-blocking stylesheet in <head> is already
            applied by the time the parser reaches here, and .landing-intro-stage
            is not parsed until further down the body.

            No nonce: next.config.ts sends no `script-src`. If a real CSP is
            ever added there, this script needs the nonce or the intro gate
            silently stops working and the flash comes back.
          */}
          {/* eslint-disable-next-line @next/next/no-sync-scripts */}
          <script dangerouslySetInnerHTML={{ __html: ARM_SCRIPT }} />
          <ContentProvider value={content}>
            <SmoothScroll>
              {children}
              <SiteFooter />
            </SmoothScroll>
            {/*
              Keep DOM overlays outside the route subtree. Browser extensions
              may inspect or rewrite page content while React is unmounting a
              route; a stable host prevents those mutations from racing with
              deletion of route-owned nodes.
            */}
            <div id="app-overlay-root" aria-hidden="true" />
            <FollowCursor zIndex={10050} />
            <FloatingMenu />
            <RouteLoadingOverlay />
          </ContentProvider>
        </body>
      </html>
    </ViewTransitions>
  );
}
