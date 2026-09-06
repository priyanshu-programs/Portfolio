# Interface sound effects

Eight clips drive the whole system. Until the files exist here, everything
degrades to silence — `soundBus.ts` treats a failed fetch or decode as "no
sound" and never throws, so the site works exactly as it does today.

Filenames are the contract. `src/lib/soundBus.ts` looks up `SOUND_MANIFEST`
by these exact paths.

**Lowercase `.mp3`, always.** Windows treats `.MP3` and `.mp3` as the same
file, so a wrong-case name works perfectly in local dev — and then goes silent
on Vercel, which builds on a case-sensitive filesystem. Downloads often arrive
as `.MP3`; rename before dropping them in. This has bitten this folder once
already.

| File | Fires on | Duration | Gain | Throttle | Preloaded | Silent on touch |
|---|---|---|---|---|---|---|
| `nav-click.mp3` | Any internal link click (the default) | 60–90ms | 0.35 | 60ms | yes | no |
| `projects-click.mp3` | Opening a case study — a homepage row, a /work card, the next-project link, or the scroll handoff at the foot of a study | 80–150ms | 1.60 | 60ms | no | no |
| `hover-tick.mp3` | Menu link + liquid-metal button hover | 25–40ms | 0.18 | 90ms | yes | **yes** |
| `menu-open.mp3` | FloatingMenu opening | 180–260ms | 0.30 | — | yes | no |
| `menu-close.mp3` | FloatingMenu closing (button or Escape) | 150–220ms | 0.28 | — | yes | no |
| `submit.mp3` | LiquidMetalButton click — only when it is a real button, not when rendered `as` a link | 80–120ms | 0.35 | 200ms | no | no |
| `success.mp3` | Contact form accepted | 400–700ms | 0.40 | — | no | no |
| `error.mp3` | Contact form rejected | 250–400ms | 0.40 | — | no | no |

## Format

**MP3**, chosen for one practical reason: sound-effect libraries hand you MP3 or
WAV, and essentially none offer WebM/Opus. Opus would be meaningfully smaller
per byte, but at these durations the whole set is a few KB either way, so the
saving buys nothing and costs a conversion step on every future clip.

`decodeAudioData` handles MP3 everywhere, so there is no fallback file and no
`canPlayType` probe — one file per sound.

Changing format later means editing the `src` values in `SOUND_MANIFEST`
(`src/lib/soundBus.ts`) and nothing else; no other file references these paths.
Formats can even be mixed per clip if one source only exists as something else.

## Budget

Mono, 44.1kHz, MP3 at ~96kbps → roughly 1–9 KB each.

**Hard ceiling: 16 KB per file, 80 KB total.** Anything larger means the clip
has silence padding or is stereo. Mono is not a compromise here: UI ticks have
no stereo image, and it halves both decode work and buffer memory.

Note that MP3 encoders add a short silent padding frame at the start of the
file. It is a few milliseconds and inaudible for these clips, but it is why the
"trim leading silence" note below matters more than it would for WAV.

## Preparing the clips

- **Source all eight from one kit.** Mismatched timbres are more noticeable
  than no sound at all.
- **Trim leading silence to zero samples.** Any lead-in reads as input lag,
  because the sound is meant to feel simultaneous with the click.
- **Fade out over 2–5ms.** An abrupt cut produces its own audible click on top
  of the intended one. You do *not* need a matching fade-in: `soundBus.ts`
  applies a 3ms attack ramp to every clip at playback, which handles the
  start-of-buffer discontinuity for you.
- **Normalize to about −18 dBFS peak** and let the per-clip `gain` in
  `SOUND_MANIFEST` do the final balancing. Rebalancing is then a code edit
  rather than a re-export.

## Behaviour worth knowing

- **On by default, with no in-page control.** Sound plays for every visitor from
  their first interaction. There is no mute button.
- **`prefers-reduced-motion: reduce` is the only opt-out**, and it is a hard
  gate: those visitors hear nothing and download none of these files. Since
  there is no toggle, this is the single signal a visitor can send. If a mute
  control is added later, soften this gate in `soundBus.ts` so an explicit
  "yes" can override it.
- **First play of a non-preloaded clip is silent.** On a cache miss the bus
  starts the fetch and plays nothing, because audio arriving 200ms late reads as
  a glitch. The `submit`/`success`/`error`/`projects-click` clips are the ones
  this can affect, and each has slack before it matters — a work card is always
  hovered before it is clicked, which starts its fetch.
