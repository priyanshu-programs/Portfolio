"use client";

import { useEffect, useRef, useState, type HTMLAttributes } from "react";
import { Geometry, Mesh, Program, Renderer, Texture, Vec2 } from "ogl";

// ─── Vertex Shader ───────────────────────────────────────────────────────────
// A full-screen triangle — no model/view/projection needed.
const vertex = `
  attribute vec2 uv;
  attribute vec2 position;
  varying vec2 vUv;

  void main() {
    vUv = uv;
    gl_Position = vec4(position, 0.0, 1.0);
  }
`;

// ─── Fragment Shader ──────────────────────────────────────────────────────────
// Codegrid-style *pixelated* text-hover effect:
//   • vUv is snapped to a coarse grid (floor(vUv * uGrid)) so the text distorts
//     in discrete BLOCKS — this crisp snapping is what stops it reading as a
//     smooth "liquid wobble".
//   • Blocks near the cursor are pushed opposite to the mouse's per-frame
//     movement, so the distortion trails the cursor.
//   • A chromatic-aberration RGB split scales with displacement strength and
//     mouse speed, then settles to a clean, sharp resting state.
const fragment = `
  precision highp float;

  uniform sampler2D tText;
  uniform vec2      uMouse;       // current mouse, UV space (0..1)
  uniform vec2      uPrevMouse;   // previous-frame mouse, UV space
  uniform float     uHover;       // 0..1 hover fade
  uniform float     uAberration;  // rises with mouse speed, decays at rest
  uniform vec2      uGrid;        // block resolution (wider than tall)
  varying vec2      vUv;

  void main() {
    // Snap to a coarse grid → the signature "pixelated" block displacement.
    vec2 gridUv     = floor(vUv * uGrid) / uGrid;
    vec2 cellCenter = gridUv + 0.5 / uGrid;

    // Direction the cursor moved this frame, and how close this block sits to it.
    // Clamped to a small max length: uMouse/uPrevMouse are UV-space (0..1 across
    // the WHOLE signature), so a fast mouse jump can otherwise produce a
    // displacement large enough to slide a chunk of the glyph across the
    // untouched rest of the same texture — reading as "two overlapping
    // signatures" instead of a localized glitch. Clamping keeps the shove small.
    vec2  rawDir   = uMouse - uPrevMouse;
    vec2  mouseDir = length(rawDir) > 0.05 ? normalize(rawDir) * 0.05 : rawDir;

    // Tight radius — a compact cursor-local patch, not "the whole signature".
    float dist     = distance(cellCenter, uMouse);
    float strength = smoothstep(0.14, 0.0, dist) * uHover;

    // Push the block a few grid cells at most; aberration widens the RGB
    // split with displacement strength.
    vec2  uv = vUv - strength * mouseDir * 0.9;
    float a  = strength * uAberration * 0.015;

    vec4 cR = texture2D(tText, uv + vec2(a, 0.0));
    vec4 cG = texture2D(tText, uv);
    vec4 cB = texture2D(tText, uv - vec2(a, 0.0));

    // Union of the three displaced samples so the silhouette never punches holes.
    float alpha = max(cG.a, max(cR.a, cB.a));

    gl_FragColor = vec4(cR.r, cG.g, cB.b, alpha);
  }
`;

// ─── Types ────────────────────────────────────────────────────────────────────
type ShaderSignatureTextProps = Omit<HTMLAttributes<HTMLSpanElement>, "children"> & {
  text: string;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Returns false when WebGL is unavailable (e.g. hardened browsers, some CI). */
const canCreateWebGLContext = (): boolean => {
  if (typeof window === "undefined") return false;
  const canvas = document.createElement("canvas");
  try {
    return Boolean(
      canvas.getContext("webgl2") ||
        canvas.getContext("webgl") ||
        canvas.getContext("experimental-webgl")
    );
  } catch {
    return false;
  }
};

/**
 * Renders `text` onto an off-screen canvas with the same computed styles as
 * `source` and returns the canvas element.
 *
 * Key fixes vs the old version:
 *  • textBaseline = "middle"  → centres the glyph in the bitmap so the text
 *    sits in the vertical centre and there is no extra top/bottom padding that
 *    would shift the perceived position after the Y-flip.
 *  • The canvas is sized to the container's pixel dimensions (×dpr) so the
 *    texture exactly matches the WebGL viewport with no scaling artefacts.
 */
const drawTextTexture = (text: string, source: HTMLElement): HTMLCanvasElement => {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const rect = source.getBoundingClientRect();
  const width  = Math.max(2, Math.ceil(rect.width));
  const height = Math.max(2, Math.ceil(rect.height));
  const computed  = window.getComputedStyle(source);
  const fontSize  = Number.parseFloat(computed.fontSize) || 160;

  const canvas = document.createElement("canvas");
  canvas.width  = Math.ceil(width  * dpr);
  canvas.height = Math.ceil(height * dpr);

  const ctx = canvas.getContext("2d");
  if (!ctx) return canvas;

  // Scale all draw calls so 1 CSS pixel == 1 physical pixel.
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, width, height);

  ctx.imageSmoothingEnabled  = true;
  ctx.imageSmoothingQuality  = "high";
  // Draw in ink colour — same as the CSS --color-ink token (#1d222e).
  // This makes the text visible on the cream footer background without
  // needing mix-blend-difference tricks.
  ctx.fillStyle              = "#1d222e";
  ctx.textAlign              = "center";
  // "middle" keeps the glyph centred in the bitmap's height; this is the
  // baseline choice that works correctly after the texture Y-flip below.
  ctx.textBaseline           = "middle";
  ctx.font = `${computed.fontStyle} ${computed.fontWeight} ${fontSize}px ${computed.fontFamily}`;

  ctx.fillText(text, width / 2, height / 2);

  return canvas;
};

// ─── Component ────────────────────────────────────────────────────────────────
export default function ShaderSignatureText({
  text,
  className = "",
  style,
  ...spanProps
}: ShaderSignatureTextProps) {
  const containerRef = useRef<HTMLSpanElement>(null);
  const canvasRef    = useRef<HTMLCanvasElement>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const container = containerRef.current;
    const canvas    = canvasRef.current;

    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    if (
      !container ||
      !canvas    ||
      prefersReducedMotion ||
      !canCreateWebGLContext()
    ) {
      return;
    }

    // ── Create renderer ──────────────────────────────────────────────────────
    let renderer: Renderer;
    const originalConsoleError = console.error;

    try {
      console.error = (...args: Parameters<typeof console.error>) => {
        if (args[0] === "unable to create webgl context") return;
        originalConsoleError(...args);
      };

      renderer = new Renderer({
        canvas,
        dpr:               Math.min(window.devicePixelRatio || 1, 2),
        alpha:             true,
        antialias:         true,
        premultipliedAlpha: false,
      });
    } catch {
      return;
    } finally {
      console.error = originalConsoleError;
    }

    if (!renderer.gl) return;

    const gl = renderer.gl;
    gl.clearColor(0, 0, 0, 0);

    // ── Full-screen triangle geometry ────────────────────────────────────────
    const geometry = new Geometry(gl, {
      position: { size: 2, data: new Float32Array([-1, -1, 3, -1, -1, 3]) },
      uv:       { size: 2, data: new Float32Array([ 0,  0, 2,  0,  0, 2]) },
    });

    // ── Texture ───────────────────────────────────────────────────────────────
    // flipY: true  →  OGL will flip the canvas image so row 0 of the bitmap
    // (top of the canvas) maps to UV Y=1 (top of the WebGL viewport).
    // Without this the text appears upside-down because Canvas2D and WebGL
    // use opposite Y-axis conventions.
    const texture = new Texture(gl, {
      minFilter:        gl.LINEAR,
      magFilter:        gl.LINEAR,
      wrapS:            gl.CLAMP_TO_EDGE,
      wrapT:            gl.CLAMP_TO_EDGE,
      generateMipmaps:  false,
      // SOLE orientation knob. Canvas2D is top-down, WebGL samples bottom-up;
      // this single flip makes the glyphs render upright. The pointer-Y flip in
      // setPointer() is its counterpart so the cursor UV matches. If the text
      // ever appears inverted, toggle THIS boolean only — never stack a 2nd flip.
      flipY:            true,
      premultiplyAlpha: false,
    });

    // ── Mouse state ───────────────────────────────────────────────────────────
    const mouse         = new Vec2(0.5, 0.5);
    const targetMouse   = new Vec2(0.5, 0.5);
    const previousMouse = new Vec2(0.5, 0.5);

    // ── Shader program ────────────────────────────────────────────────────────
    const program = new Program(gl, {
      vertex,
      fragment,
      uniforms: {
        tText:       { value: texture },
        uMouse:      { value: mouse },
        uPrevMouse:  { value: previousMouse },
        uHover:      { value: 0 },
        uAberration: { value: 0 },
        // Wider-than-tall grid — the script name is very wide, so more
        // horizontal cells keep the blocks roughly square.
        uGrid:       { value: new Vec2(70, 22) },
      },
      transparent: true,
      cullFace:    null,
      depthTest:   false,
      depthWrite:  false,
    });

    const mesh = new Mesh(gl, { geometry, program });

    // ── Animation state ───────────────────────────────────────────────────────
    let frameId    = 0;
    let hoverTarget = 0;
    let hover       = 0;
    let aberration  = 0;   // rises with mouse speed, decays at rest
    let isOnScreen  = true;
    let hasRendered = false;

    // ── Resize / texture update ───────────────────────────────────────────────
    const resize = () => {
      const w = container.clientWidth;
      const h = container.clientHeight;
      if (!w || !h) return;

      renderer.setSize(w, h);
      texture.image   = drawTextTexture(text, container);
      texture.needsUpdate = true;
      hasRendered = false;
    };

    // ── Pointer helpers ───────────────────────────────────────────────────────
    const setPointer = (event: PointerEvent) => {
      const rect = container.getBoundingClientRect();
      if (!rect.width || !rect.height) return;

      targetMouse.set(
        (event.clientX - rect.left)  / rect.width,
        // Flip Y so UV Y=0 is the bottom of the element, matching WebGL convention.
        1 - (event.clientY - rect.top) / rect.height
      );
    };

    const handlePointerEnter = (event: PointerEvent) => {
      setPointer(event);
      mouse.copy(targetMouse);
      previousMouse.copy(targetMouse);
      hoverTarget = 1;
    };

    const handlePointerMove = (event: PointerEvent) => {
      setPointer(event);
      hoverTarget = 1;
    };

    const handlePointerLeave = () => {
      hoverTarget = 0;
    };

    // ── Render loop ───────────────────────────────────────────────────────────
    const render = () => {
      // Park the loop while off-screen and already settled, rather than
      // re-scheduling a frame that does nothing. The footer sits below the fold
      // on every route, so an always-running rAF kept the main thread (and, on
      // laptops, the GPU) busy for a canvas nobody could see. The
      // IntersectionObserver restarts it on the way back in.
      if (!isOnScreen && hasRendered) {
        frameId = 0;
        return;
      }

      frameId = window.requestAnimationFrame(render);

      // Easing: snap quickly while hovering, drift slowly on leave.
      previousMouse.copy(mouse);
      mouse.lerp(targetMouse, hoverTarget ? 0.16 : 0.06);

      // Smooth hover scalar.
      hover += (hoverTarget - hover) * 0.10;

      // Per-frame mouse speed (UV units) drives the aberration: it rises fast
      // on movement and decays toward 0 at rest so the split settles cleanly.
      const speed = mouse.distance(previousMouse);
      const targetAberration = Math.min(speed * 45, 1.5);
      aberration += (targetAberration - aberration) * 0.15;

      program.uniforms.uHover.value      = hover;
      program.uniforms.uAberration.value = aberration;
      // uPrevMouse is updated implicitly (previousMouse is the same Vec2 ref).

      // Only submit a draw call when something has actually changed.
      if (!hasRendered || hover > 0.001 || hoverTarget > 0 || aberration > 0.001) {
        renderer.render({ scene: mesh });
        hasRendered = true;
      }
    };

    // ── Observers ─────────────────────────────────────────────────────────────
    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(container);

    const intersectionObserver = new IntersectionObserver(
      (entries) => {
        isOnScreen = entries[0]?.isIntersecting ?? true;
        if (isOnScreen) {
          hasRendered = false;
          // Restart the loop if `render` parked it while we were off-screen.
          // Guarded on frameId so a scroll that never left the viewport can't
          // start a second concurrent loop.
          if (frameId === 0) frameId = window.requestAnimationFrame(render);
        }
      },
      { threshold: 0 }
    );
    intersectionObserver.observe(container);

    // ── Bootstrap ─────────────────────────────────────────────────────────────
    // Wait for fonts so the canvas snapshot uses the correct glyphs.
    const boot = () => {
      resize();
      renderer.render({ scene: mesh });
      hasRendered = true;
      setIsReady(true);
      frameId = window.requestAnimationFrame(render);
    };

    if (document.fonts?.ready) {
      document.fonts.ready.then(boot);
    } else {
      boot();
    }

    // ── Event listeners ───────────────────────────────────────────────────────
    container.addEventListener("pointerenter", handlePointerEnter);
    container.addEventListener("pointermove",  handlePointerMove);
    container.addEventListener("pointerleave", handlePointerLeave);

    // ── Cleanup ───────────────────────────────────────────────────────────────
    return () => {
      resizeObserver.disconnect();
      intersectionObserver.disconnect();
      container.removeEventListener("pointerenter", handlePointerEnter);
      container.removeEventListener("pointermove",  handlePointerMove);
      container.removeEventListener("pointerleave", handlePointerLeave);
      window.cancelAnimationFrame(frameId);
    };
  }, [text]);

  return (
    <span
      {...spanProps}
      ref={containerRef}
      // No mix-blend-difference — the canvas draws ink-coloured glyphs on a
      // transparent background, which renders correctly over any background.
      className={`inline-block px-[0.04em] py-[0.18em] ${className}`}
      style={style}
    >
      {/* Hidden fallback text — visible only until WebGL is ready */}
      <span className={isReady ? "opacity-0" : "opacity-100"} aria-hidden>
        {text}
      </span>

      {/* WebGL canvas — overlays the fallback once initialised */}
      <canvas
        ref={canvasRef}
        aria-hidden="true"
        className={`absolute inset-0 h-full w-full transition-opacity duration-300 ${
          isReady ? "opacity-100" : "opacity-0"
        }`}
      />
    </span>
  );
}
