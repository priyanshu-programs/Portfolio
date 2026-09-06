"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { initSoundBus, resumeSoundContext } from "@/lib/soundBus";
import { LANDING_INTRO_DONE_EVENT } from "@/components/transition/LandingIntro";

/**
 * Owns the sound bus's lifecycle. Renders nothing — the name describes its
 * position among the overlay siblings in the root layout, not a React context.
 * Call sites import `playSound` from the bus directly, so there is no provider
 * value to hand down and no re-render when a sound plays.
 */
export default function SoundProvider() {
  const pathname = usePathname();

  useEffect(() => {
    /* The eager preload must not land inside the landing intro. That sequence is
       the heaviest moment on the site — GSAP Flip, the OGL canvas and the shader
       button all contend for the main thread — and four extra fetches there buy
       nothing, because the visitor cannot click anything until it finishes.
       Elsewhere the idle callback alone is enough. */
    let deferPreloadUntil: Promise<void> | undefined;

    if (pathname === "/") {
      deferPreloadUntil = new Promise<void>((resolve) => {
        const done = () => {
          window.removeEventListener(LANDING_INTRO_DONE_EVENT, done);
          window.clearTimeout(timer);
          resolve();
        };
        /* The intro only mounts on an armed load, so on a soft navigation back
           to "/" the event never fires at all. The timeout is the real path as
           often as it is the fallback. */
        const timer = window.setTimeout(done, 4000);
        window.addEventListener(LANDING_INTRO_DONE_EVENT, done);
      });
    }

    const teardown = initSoundBus({ deferPreloadUntil });

    /* Firefox and Safari suspend the AudioContext when a document enters
       bfcache and do not reliably resume it on restore. Without this, the Back
       that follows the 404 round-trip described in useMediaQuery's docblock
       returns to a page where every sound is silently dropped — the toggle still
       reads "on", which makes it look like a bug in the toggle. */
    const onPageShow = (event: PageTransitionEvent) => {
      if (event.persisted) resumeSoundContext();
    };
    window.addEventListener("pageshow", onPageShow);

    return () => {
      window.removeEventListener("pageshow", onPageShow);
      teardown();
    };
    /* Mount-once. `pathname` is read for the initial route only; re-running this
       on every navigation would close and rebuild the AudioContext mid-session
       and burn through Chrome's concurrent-context cap. */
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}
