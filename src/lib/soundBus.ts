/**
 * Interface sound effects — the whole engine.
 *
 * Module scope rather than React state, for the same reason `routeLoading.ts`
 * gives: the components that publish a sound are frequently unmounted by the
 * very interaction that published it. `SmartLink` plays `nav-click` and is then
 * torn down by the navigation it just started; `FloatingMenu`'s links do both at
 * once. A hook-owned AudioContext would be closed mid-gesture.
 *
 * Nothing here imports React, and `playSound` never triggers a render.
 *
 * Sound is ON for everyone, with no in-page control. That is a deliberate
 * product decision and it puts all the weight of "I do not want this" on a
 * single signal: `prefers-reduced-motion: reduce`, which `playSound` treats as a
 * hard gate. If a mute control is ever added back, that gate should soften to a
 * default-setter — a visitor who sets `reduce` and then explicitly asks for
 * sound should get it. Until then it is the only way out.
 */

export type SoundName =
  | "nav-click"
  | "projects-click"
  | "hover-tick"
  | "menu-open"
  | "menu-close"
  | "submit"
  | "success"
  | "error";

type SoundSpec = {
  /** Root-absolute, matching the "/images/menu-home.webp" convention. */
  src: string;
  /** Linear gain, baked per clip so the source files can stay normalized and
   *  rebalancing is a code edit rather than a re-export. Normally 0–1, but a
   *  clip whose source is mastered quiet may exceed 1 to make up the gap — see
   *  `projects-click`. Values above ~1.1 risk clipping on a hot source, so
   *  raise one only by ear, and only for a clip you have actually listened to. */
  gain: number;
  /** Minimum ms between two plays of this name. 0 disables throttling. */
  throttleMs: number;
  /** Fetched during the idle pass, vs decoded on first use. */
  eager: boolean;
  /** Suppressed entirely on coarse pointers — see the bail in `playSound`. */
  pointerGated: boolean;
};

/**
 * Attack ramp applied to every clip. Long enough to kill the discontinuity
 * click at the start of a buffer, short enough that the onset still reads as
 * instant — perceptibly softening a transient takes roughly 10ms, and interface
 * feedback that sounds soft sounds late.
 */
const ATTACK_SECONDS = 0.003;

/** Trims every clip to a common ceiling; the per-spec gains balance against it. */
const MASTER_GAIN = 0.9;

export const SOUND_MANIFEST: Record<SoundName, SoundSpec> = {
  "nav-click": { src: "/audio/nav-click.mp3", gain: 0.35, throttleMs: 60, eager: true, pointerGated: false },
  /* Opening a case study, in place of the generic nav-click. Not eager: it can
     only fire from /work, so preloading it on every page would be waste. The
     hover that precedes any real card click gives the fetch its head start. */
  /* Louder than nav-click by design: opening a case study is the site's most
     consequential navigation, and the audio hierarchy should say so.

     Above 1 deliberately, and the only spec here that is. Source clips are
     normalized to ~-18 dBFS peak (see public/audio/README.md), so a gain of 1
     was never the clipping ceiling — it was just the balancing convention the
     other clips happen to sit inside. At 1.6 this peaks around 0.18 linear
     after MASTER_GAIN, with ample headroom left. */
  "projects-click": { src: "/audio/projects-click.mp3", gain: 1.6, throttleMs: 60, eager: false, pointerGated: false },
  "hover-tick": { src: "/audio/hover-tick.mp3", gain: 0.18, throttleMs: 90, eager: true, pointerGated: true },
  /* TEMPORARY: both point at nav-click.mp3 because menu-open.mp3 and
     menu-close.mp3 have not been sourced yet, and a missing file is silent —
     which is indistinguishable from broken wiring. Borrowing a clip that exists
     makes the hamburger audible now and proves the wiring.

     Swap these two `src` values back to their own files once the real clips
     land. Nothing else needs to change; the gains below are already tuned for
     what those clips should be, and open/close deliberately differ so the two
     directions do not sound identical once they have their own audio. */
  "menu-open": { src: "/audio/nav-click.mp3", gain: 0.3, throttleMs: 0, eager: true, pointerGated: false },
  "menu-close": { src: "/audio/nav-click.mp3", gain: 0.28, throttleMs: 0, eager: true, pointerGated: false },
  submit: { src: "/audio/submit.mp3", gain: 0.35, throttleMs: 200, eager: false, pointerGated: false },
  success: { src: "/audio/success.mp3", gain: 0.4, throttleMs: 0, eager: false, pointerGated: false },
  error: { src: "/audio/error.mp3", gain: 0.4, throttleMs: 0, eager: false, pointerGated: false },
};

let ctx: AudioContext | null = null;
let initialized = false;

const buffers = new Map<SoundName, AudioBuffer>();
/** Keyed on the promise, not the resolved buffer, so two rapid hovers of the
 *  same link cannot start two fetches for one clip. */
const inFlight = new Map<SoundName, Promise<AudioBuffer | null>>();
const lastPlayedAt = new Map<SoundName, number>();

let reduceMq: MediaQueryList | null = null;
let coarseMq: MediaQueryList | null = null;

/* ── Audio graph ─────────────────────────────────────────────────────────── */

/**
 * The context is created on the first user gesture, never at import time.
 * Constructing one eagerly costs main-thread time on every page load — including
 * loads where sound is off and nothing will ever play — and browsers hand back a
 * `suspended` context anyway until a gesture arrives.
 */
function ensureContext(): AudioContext | null {
  if (ctx) return ctx;
  if (typeof window === "undefined") return null;

  const Ctor = window.AudioContext ?? (window as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;

  try {
    ctx = new Ctor();
  } catch {
    /* Chrome caps concurrent contexts (6 at time of writing). Hitting the cap
       throws; degrading to silence is correct and must not break the UI. */
    return null;
  }
  return ctx;
}

export function resumeSoundContext(): void {
  if (ctx && ctx.state === "suspended") {
    void ctx.resume().catch(() => {});
  }
}

async function ensureBuffer(name: SoundName): Promise<AudioBuffer | null> {
  const cached = buffers.get(name);
  if (cached) return cached;

  const pending = inFlight.get(name);
  if (pending) return pending;

  const audioCtx = ensureContext();
  if (!audioCtx) return null;

  const spec = SOUND_MANIFEST[name];
  const task = (async () => {
    try {
      const res = await fetch(spec.src);
      if (!res.ok) return null;
      const raw = await res.arrayBuffer();
      const decoded = await audioCtx.decodeAudioData(raw);
      buffers.set(name, decoded);
      return decoded;
    } catch {
      /* A missing or malformed clip must degrade to silence, never to a thrown
         error inside a click handler. The file may simply not be dropped in
         yet — see public/audio/README.md. */
      return null;
    } finally {
      inFlight.delete(name);
    }
  })();

  inFlight.set(name, task);
  return task;
}

/**
 * Fire-and-forget. Safe to call on the server (no-op), before the context is
 * unlocked, while muted, and from a component about to unmount. Never throws
 * and never returns a promise the caller has to handle.
 */
export function playSound(name: SoundName): void {
  if (typeof window === "undefined") return;

  const spec = SOUND_MANIFEST[name];
  if (!spec) return;

  /* The only opt-out. With no toggle in the UI, `prefers-reduced-motion: reduce`
     is the sole signal a visitor can send that they do not want this, so it is a
     hard gate rather than the default-setter it would be alongside a control.
     Audio startles belong to the same problem class the setting exists for.

     Read live rather than snapshotted — the OS setting can change mid-session. */
  if (reduceMq?.matches) return;

  /* Touch devices synthesize a `mouseenter` immediately before every tap, which
     would fire hover-tick and then submit as one double-noise. Same query and
     same reasoning as the coarse-pointer bail in FollowCursor.tsx. */
  if (spec.pointerGated && coarseMq?.matches) return;

  /* Leading-edge throttle, deliberately not a debounce: the first tick has to be
     immediate or the sound stops feeling attached to the pointer. Sweeping the
     cursor down the four menu links fires four mouseenters in ~150ms; 90ms turns
     that into texture instead of a burst. */
  if (spec.throttleMs > 0) {
    const now = performance.now();
    const last = lastPlayedAt.get(name) ?? -Infinity;
    if (now - last < spec.throttleMs) return;
    lastPlayedAt.set(name, now);
  }

  const audioCtx = ensureContext();
  if (!audioCtx) return;

  const buffer = buffers.get(name);
  if (!buffer) {
    /* Cache miss: start the fetch but play nothing. A clip arriving 200ms after
       the click that caused it reads as a glitch, not as feedback. The next
       interaction of this kind is the first audible one. */
    void ensureBuffer(name);
    return;
  }

  /* Not awaited. A source started on a context whose resume() settles a tick
     later still plays; only a context that never received a gesture stays
     silent. Awaiting here would add latency to every single sound. */
  if (audioCtx.state === "suspended") resumeSoundContext();

  try {
    const source = audioCtx.createBufferSource();
    source.buffer = buffer;

    /* Scheduled via AudioParam methods rather than assigning `gain.value`, per
       MDN's Web Audio best practices: the scheduling API is authoritative and
       takes precedence over direct assignment, so mixing the two is how ramps
       silently stop working later.

       The ramp is not decoration. Starting a buffer at full gain steps the
       waveform discontinuously from silence, and that step is itself a click —
       an artefact layered on top of the click these clips are meant to *be*,
       audible as a thin edge on the transient. A 3ms attack removes it while
       staying far below the ~10ms it would take to perceptibly soften the
       onset, which for interface feedback would read as lag. */
    const now = audioCtx.currentTime;
    const target = spec.gain * MASTER_GAIN;
    const gainNode = audioCtx.createGain();
    gainNode.gain.setValueAtTime(0, now);
    gainNode.gain.linearRampToValueAtTime(target, now + ATTACK_SECONDS);

    source.connect(gainNode);
    gainNode.connect(audioCtx.destination);

    /* Web Audio nodes are kept alive by the graph, not by JS references, so
       without this teardown a session of a few hundred clicks accumulates a few
       hundred live nodes hanging off `destination`. No pooling: BufferSourceNode
       is single-use by spec and cheap to allocate — the expensive thing is the
       buffer, and that one is shared. */
    source.addEventListener(
      "ended",
      () => {
        source.disconnect();
        gainNode.disconnect();
      },
      { once: true },
    );

    source.start();
  } catch {
    /* Never let audio break an interaction. */
  }
}

/* ── Preload ─────────────────────────────────────────────────────────────── */

function preloadEager(): void {
  (Object.keys(SOUND_MANIFEST) as SoundName[])
    .filter((name) => SOUND_MANIFEST[name].eager)
    .forEach((name) => void ensureBuffer(name));
}

function schedulePreload(deferUntil?: Promise<void>): void {
  const run = () => {
    /* Reduced-motion visitors will never hear any of these, so they should not
       pay to download them either. */
    if (reduceMq?.matches) return;
    const idle = (window as unknown as {
      requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number;
    }).requestIdleCallback;
    /* Safari still ships no requestIdleCallback. */
    if (idle) idle(() => preloadEager(), { timeout: 3000 });
    else window.setTimeout(preloadEager, 2000);
  };

  if (deferUntil) void deferUntil.then(run).catch(run);
  else run();
}

/* ── Lifecycle ───────────────────────────────────────────────────────────── */

/**
 * Called once by `SoundProvider`. Idempotent; returns a teardown.
 */
export function initSoundBus(opts?: { deferPreloadUntil?: Promise<void> }): () => void {
  if (typeof window === "undefined") return () => {};
  if (initialized) return () => {};
  initialized = true;

  reduceMq = window.matchMedia("(prefers-reduced-motion: reduce)");
  coarseMq = window.matchMedia("(pointer: coarse)");

  /* The unlock. AudioContext stays `suspended` until a gesture, and `capture`
     here is load-bearing: SmartLink's onClick and FloatingMenu's toggleMenu both
     run in the bubble phase, so a capture-phase listener on window has already
     resumed the context by the time those handlers call playSound. Registered in
     the bubble phase instead, the very first click on the site is silent. */
  const unlock = () => {
    const audioCtx = ensureContext();
    if (audioCtx?.state === "suspended") void audioCtx.resume().catch(() => {});
    teardownUnlock();
  };

  const unlockEvents: Array<keyof WindowEventMap> = ["pointerdown", "keydown", "touchstart"];
  const teardownUnlock = () => {
    unlockEvents.forEach((evt) => window.removeEventListener(evt, unlock, { capture: true }));
  };
  unlockEvents.forEach((evt) =>
    window.addEventListener(evt, unlock, { capture: true, passive: true, once: true }),
  );

  schedulePreload(opts?.deferPreloadUntil);

  return () => {
    teardownUnlock();

    /* Closing matters most in dev: Chrome caps concurrent AudioContexts, so a
       context leaked per Fast Refresh hits the ceiling after a handful of edits
       and every sound then fails silently. */
    if (ctx) {
      void ctx.close().catch(() => {});
      ctx = null;
    }
    buffers.clear();
    inFlight.clear();
    lastPlayedAt.clear();
    reduceMq = null;
    coarseMq = null;
    initialized = false;
  };
}
