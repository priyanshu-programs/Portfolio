import { Oswald, Hanken_Grotesk } from "next/font/google";
import "./globals.css";
import TransitionProvider from "@/components/transition/TransitionContext";
import PageTransition from "@/components/transition/PageTransition";
import SmoothScroll from "@/components/SmoothScroll";
import FollowCursor from "@/components/ui/FollowCursor";
import FloatingMenu from "@/components/ui/FloatingMenu";

const transitionClickGuard = `
(function () {
  if (window.__transitionClickGuard) return;
  window.__transitionClickGuard = true;
  document.addEventListener("click", function (event) {
    if (
      event.defaultPrevented ||
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey
    ) {
      return;
    }

    var target = event.target;
    if (!target || !target.closest) return;

    var anchor = target.closest("a[data-transition-link='true']");
    if (
      !anchor ||
      anchor.hasAttribute("download") ||
      (anchor.target && anchor.target !== "_self")
    ) {
      return;
    }

    var url = new URL(anchor.href, window.location.href);
    if (url.origin !== window.location.origin) return;

    event.preventDefault();

    var href = url.pathname + url.search + url.hash;
    if (typeof window.__runTransitionNavigate === "function") {
      window.__runTransitionNavigate(href);
    } else {
      window.__pendingTransitionHref = href;
    }
  }, true);
})();
`;

const oswald = Oswald({
  subsets: ["latin"],
  weight: ["500", "600"],
  variable: "--font-oswald",
});

const hanken = Hanken_Grotesk({
  subsets: ["latin"],
  weight: ["300", "400", "500"],
  variable: "--font-hanken",
});

export const metadata = {
  title: "Priyanshu Roy — Brand Designer & Web Developer",
  description:
    "Most sites look like templates. Mine don't. Identity and execution, together.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`h-full antialiased ${oswald.variable} ${hanken.variable}`}
      suppressHydrationWarning
    >
      <body
        className="min-h-full flex flex-col bg-white text-black font-sans font-light"
        suppressHydrationWarning
      >
        <script dangerouslySetInnerHTML={{ __html: transitionClickGuard }} />
        <TransitionProvider>
          <SmoothScroll>
            {children}
          </SmoothScroll>
          <PageTransition />
          <FollowCursor zIndex={10050} />
          <FloatingMenu />
        </TransitionProvider>
      </body>
    </html>
  );
}
