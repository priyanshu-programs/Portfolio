"use client";

import React, { useEffect, useRef } from "react";
import Image from "next/image";
import { Renderer, Texture, Program, Geometry, Mesh, Vec2, Flowmap } from "ogl";

const vertex = `
  attribute vec2 uv;
  attribute vec2 position;
  varying vec2 vUv;
  void main() {
      vUv = uv;
      gl_Position = vec4(position, 0, 1);
  }
`;

const fragment = `
  precision highp float;
  precision highp int;
  uniform sampler2D tWater;
  uniform sampler2D tFlow;
  uniform float uTime;
  varying vec2 vUv;
  uniform vec2 uScale;
  uniform vec2 uAnchor;
  uniform vec2 uResolution;

  void main() {
      vec3 flow = texture2D(tFlow, vUv).rgb;

      // object-position, as the fixed point of the uScale expansion: the UV
      // that maps to itself. (0.5, 0.0) is centre/bottom — the original
      // hard-coded behaviour; (0.5, 1.0) anchors the image's top edge instead,
      // letting surplus height fall off the bottom.
      vec2 myUV = (vUv - uAnchor) * uScale + uAnchor;
      
      // Chromatic aberration on the flow distortion
      // Balanced premium RGB split
      float strength = 0.5; 
      vec2 uvR = myUV - flow.xy * strength * 0.92;
      vec2 uvG = myUV - flow.xy * strength * 1.00;
      vec2 uvB = myUV - flow.xy * strength * 1.08;

      vec4 texR = texture2D(tWater, uvR);
      vec4 texG = texture2D(tWater, uvG);
      vec4 texB = texture2D(tWater, uvB);

      // Boundary checks to prevent wrapping artifacts
      if (uvR.x < 0.0 || uvR.x > 1.0 || uvR.y < 0.0 || uvR.y > 1.0) texR = vec4(0.0);
      if (uvG.x < 0.0 || uvG.x > 1.0 || uvG.y < 0.0 || uvG.y > 1.0) texG = vec4(0.0);
      if (uvB.x < 0.0 || uvB.x > 1.0 || uvB.y < 0.0 || uvB.y > 1.0) texB = vec4(0.0);

      gl_FragColor = vec4(texR.r, texG.g, texB.b, max(max(texR.a, texG.a), texB.a));
  }
`;

/** How the picture is mapped into its box, mirroring the CSS `object-fit`
 *  values of the same name. Both render paths honour this identically — the
 *  WebGL `uScale`/`uAnchor` pair in `resize()` and the fallback <img>'s
 *  object-fit/-position — and LandingIntro re-derives the same mapping twice:
 *  to fit its centre panel onto the painted rect (`getPaintedPortraitRect`) and
 *  to paint that panel with a matching crop. Changing one means changing all. */
export type LiquidImageFit = "contain" | "cover";

/** Which point of the *image* is pinned to the same point of the box — the
 *  fixed point of the crop, i.e. CSS `object-position`. Fractions of the
 *  image's own width/height, x from the left, y from the BOTTOM (matching the
 *  shader's UV space, where y=0 is the bottom edge).
 *
 *  It exists because a centred crop is the wrong default for an off-centre
 *  subject: the hero portrait's head spans x≈0.17–0.65 while the shoulders run
 *  nearly the full frame, so cropping symmetrically eats into the face. Pulling
 *  the anchor left takes the crop out of the empty shoulder instead. */
export interface LiquidImageFocus {
  x?: number;
  y?: number;
}

const DEFAULT_FOCUS: Required<LiquidImageFocus> = { x: 0.5, y: 0.0 };

interface LiquidImageProps {
  src: string;
  alt: string;
  className?: string;
  /** Defaults to `contain`, which is what every caller wanted before the hero
   *  needed to fill a full-viewport box on small screens. */
  fit?: LiquidImageFit;
  /** Defaults to centre-x / bottom-y — the original hard-coded behaviour. */
  focus?: LiquidImageFocus;
  /** Overrides the responsive `sizes` hint for the fallback <img>. Only matters
   *  on the non-WebGL path, where the picture is a real <Image fill>. */
  sizes?: string;
}

/** Fired on the container once the picture is actually on screen — the first
 *  WebGL draw has landed, or the fallback <img> has completed. Consumers that
 *  reveal this element need that guarantee: the canvas is transparent until its
 *  texture (a *separate* fetch) loads and a frame is drawn, so "mounted" and
 *  "painted" are far apart on a slow network. */
export const LIQUID_IMAGE_READY_EVENT = "liquid-image:ready";

/** Mirrors the event as state, so a listener that attaches late — after the
 *  paint already happened — can still tell. The event alone would be missed. */
export const LIQUID_IMAGE_READY_ATTR = "data-liquid-ready";

// The WebGL texture must be same-origin (or CORS-readable). Remote images
// (e.g. Sanity CDN URLs) are routed through our same-origin proxy so the
// texture read doesn't taint the canvas; local /images/... paths are already
// same-origin and used directly.
const toTextureSrc = (src: string) =>
  /^https?:\/\//.test(src) ? `/api/image?url=${encodeURIComponent(src)}` : src;

const canCreateWebGLContext = () => {
  if (typeof window === "undefined") {
    return false;
  }

  const testCanvas = document.createElement("canvas");

  try {
    return Boolean(
      testCanvas.getContext("webgl2") ||
        testCanvas.getContext("webgl") ||
        testCanvas.getContext("experimental-webgl")
    );
  } catch {
    return false;
  }
};

export default function LiquidImage({
  src,
  alt,
  className,
  fit = "contain",
  focus,
  sizes,
}: LiquidImageProps) {
  const focusX = focus?.x ?? DEFAULT_FOCUS.x;
  const focusY = focus?.y ?? DEFAULT_FOCUS.y;
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fallbackRef = useRef<HTMLDivElement>(null);
  /* `fit`/`focus` are read through a ref rather than listed as effect
     dependencies. They change when the viewport crosses the lg breakpoint, and
     rebuilding the effect there would tear down and re-create the WebGL context
     — a blank canvas for a frame, plus a fresh texture fetch, on every
     rotation. The resize path below simply consults this.

     `refitRef` is how a change reaches the canvas without that teardown: the
     breakpoint flip also resizes the box, which fires the ResizeObserver, but
     that is incidental rather than guaranteed — a caller could change the focus
     alone. The effect below calls it explicitly. */
  const fitRef = useRef<{ fit: LiquidImageFit; x: number; y: number }>({
    fit,
    x: focusX,
    y: focusY,
  });
  fitRef.current = { fit, x: focusX, y: focusY };

  const refitRef = useRef<(() => void) | null>(null);
  useEffect(() => {
    refitRef.current?.();
  }, [fit, focusX, focusY]);

  useEffect(() => {
    if (!containerRef.current || !canvasRef.current) return;

    const container = containerRef.current;
    const canvas = canvasRef.current;
    const fallback = fallbackRef.current;
    canvas.style.removeProperty("display");

    // A previous run may have marked this container ready; this run repaints
    // from scratch, so the guarantee has to be re-earned.
    container.removeAttribute(LIQUID_IMAGE_READY_ATTR);

    let didSignalReady = false;
    /** Announce "there are pixels on screen now" exactly once per run. */
    const markReady = () => {
      if (didSignalReady) return;
      didSignalReady = true;
      container.setAttribute(LIQUID_IMAGE_READY_ATTR, "");
      container.dispatchEvent(
        new CustomEvent(LIQUID_IMAGE_READY_EVENT, { bubbles: false })
      );
    };

    // Show fallback by default; hide it once WebGL canvas is confirmed working
    const showFallback = () => {
      canvas.style.display = "none";
      if (fallback) fallback.style.display = "";
      // The fallback <img> is now the visible layer, so readiness is *its*
      // load state — which `complete` already answers for a cached or
      // finished decode.
      const img = fallback?.querySelector("img");
      if (!img || img.complete) {
        markReady();
      } else {
        img.addEventListener("load", markReady, { once: true });
        // A broken fallback still has to release anything waiting on us,
        // otherwise a consumer gated on this event would wait forever.
        img.addEventListener("error", markReady, { once: true });
      }
    };

    const hideFallback = () => {
      if (fallback) fallback.style.display = "none";
    };

    if (!canCreateWebGLContext()) {
      showFallback();
      return;
    }

    let renderer: Renderer;
    const originalConsoleError = console.error;

    try {
      console.error = (...args: Parameters<typeof console.error>) => {
        if (args[0] === "unable to create webgl context") {
          return;
        }

        originalConsoleError(...args);
      };

      renderer = new Renderer({
        canvas,
        dpr: Math.min(window.devicePixelRatio || 1, 2),
        alpha: true,
      });
    } catch {
      showFallback();
      return;
    } finally {
      console.error = originalConsoleError;
    }

    if (!renderer.gl) {
      showFallback();
      return;
    }

    // WebGL is working — hide the fallback <Image> so it doesn't show behind the canvas
    hideFallback();

    const gl = renderer.gl;

    const lastMouse = new Vec2();
    const mouse = new Vec2(-1);
    const velocity = new Vec2();
    let needsUpdate = false;
    // Render gating: the loop only draws while there is recent pointer input
    // (plus a short settle window for the ripple to dissipate), when the base
    // image needs a (re)draw, and when the element is on-screen. This keeps the
    // GPU idle instead of rendering every frame forever.
    let settleFrames = 0;
    let dirty = true; // base image needs an initial/refreshed draw
    let onScreen = true;
    const SETTLE = 90; // ~1.5s @60fps for the ripple to fully fade

    const flowmap = new Flowmap(gl, {
      falloff: 0.3, // Visible but controlled ripple radius
      dissipation: 0.96, // Smooth decay that lasts long enough to be seen
      alpha: 0.9 // Stronger opacity for a clearer effect
    });

    const geometry = new Geometry(gl, {
      position: { size: 2, data: new Float32Array([-1, -1, 3, -1, -1, 3]) },
      uv: { size: 2, data: new Float32Array([0, 0, 2, 0, 0, 2]) }
    });

    const texture = new Texture(gl, {
      minFilter: gl.LINEAR,
      magFilter: gl.LINEAR,
      wrapS: gl.CLAMP_TO_EDGE,
      wrapT: gl.CLAMP_TO_EDGE,
    });

    const program = new Program(gl, {
      vertex,
      fragment,
      uniforms: {
        uTime: { value: 0 },
        tWater: { value: texture },
        uResolution: { value: new Vec2(window.innerWidth, window.innerHeight) },
        uScale: { value: new Vec2(1, 1) },
        // Centre/bottom by default — see the shader and `resize()`.
        uAnchor: { value: new Vec2(0.5, 0.0) },
        tFlow: flowmap.uniform
      },
      transparent: true
    });

    const mesh = new Mesh(gl, { geometry, program });

    const img = new window.Image();
    // crossOrigin MUST be set before src, or a cross-origin image (e.g. a
    // Sanity CDN URL) loads without CORS, taints the WebGL texture, and
    // texImage2D throws a SecurityError — leaving a blank canvas.
    img.crossOrigin = "anonymous";
    img.onload = () => {
      texture.image = img;
      resize();
    };
    // If the texture image can't load, fall back to the plain <Image> rather
    // than showing an empty canvas.
    img.onerror = () => {
      showFallback();
    };
    img.src = toTextureSrc(src);

    const resize = () => {
      if (!container) return;
      const width = container.clientWidth;
      const height = container.clientHeight;

      if (!width || !height) return;

      renderer.setSize(width, height);
      program.uniforms.uResolution.value.set(width, height);

      if (img.width && img.height) {
        const imageAspect = img.width / img.height;
        const canvasAspect = width / height;
        let scaleX = 1, scaleY = 1;

        /* uScale expands the sampled UV range, so a value > 1 on an axis pulls
           in *more* than the box (letterboxing that axis) and a value < 1
           samples a sub-rect (cropping it). Contain scales the axis the box has
           to spare; cover scales the other one. The branches are exact mirrors,
           which is why they read as swapped assignments. */
        if (fitRef.current.fit === "cover") {
          if (canvasAspect > imageAspect) {
            scaleX = 1;
            scaleY = imageAspect / canvasAspect;
          } else {
            scaleX = canvasAspect / imageAspect;
            scaleY = 1;
          }
        } else if (canvasAspect > imageAspect) {
          scaleX = canvasAspect / imageAspect;
          scaleY = 1;
        } else {
          scaleX = 1;
          scaleY = imageAspect / canvasAspect;
        }
        program.uniforms.uScale.value.set(scaleX, scaleY);

        /* The fixed point of that expansion — object-position, with y measured
           from the BOTTOM (y=0) as this UV space does.

           Deliberately NOT clamped into the "safe" [scale/2, 1-scale/2] band.
           That band is where the sampled window stays wholly inside the image,
           but clamping to it silently overrides the caller at exactly the
           values worth asking for: at a phone aspect the band is [0.30, 0.70],
           so a focus of 0.27 would be pinned to 0.30 and quietly reframed. The
           shader's own boundary checks already blank any out-of-range sample,
           so the unclamped value is safe as well as honest — and it is what
           keeps this in step with the fallback's CSS object-position, which
           applies no such clamp either. */
        program.uniforms.uAnchor.value.set(
          fitRef.current.x,
          fitRef.current.y
        );
      }

      dirty = true; // size/texture changed — redraw the base image once
    };

    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(container);
    window.addEventListener('resize', resize);
    // Lets a fit/focus change re-run the mapping without rebuilding the context.
    refitRef.current = resize;
    resize();

    const updateMouse = (e: MouseEvent | TouchEvent) => {
      let clientX, clientY;
      if ('touches' in e) {
        clientX = e.touches[0].clientX;
        clientY = e.touches[0].clientY;
      } else {
        clientX = e.clientX;
        clientY = e.clientY;
      }

      const rect = container.getBoundingClientRect();
      const x = clientX - rect.left;
      const y = clientY - rect.top;

      mouse.set(x / rect.width, 1.0 - y / rect.height);

      if (lastMouse.x === -1 && lastMouse.y === -1) {
        lastMouse.copy(mouse);
      }

      const deltaX = mouse.x - lastMouse.x;
      const deltaY = mouse.y - lastMouse.y;

      lastMouse.copy(mouse);

      // Scaled up slightly to ensure movement creates a noticeable ripple
      velocity.set(deltaX * 2.0, deltaY * 2.0);
      needsUpdate = true;
    };

    lastMouse.set(-1, -1);

    container.addEventListener('mousemove', updateMouse);
    container.addEventListener('touchstart', updateMouse, { passive: false });
    container.addEventListener('touchmove', updateMouse, { passive: false });

    // Pause rendering entirely while the element is scrolled out of view.
    const intersectionObserver = new IntersectionObserver(
      (entries) => {
        onScreen = entries[0].isIntersecting;
        if (onScreen) dirty = true; // repaint base image when it returns
      },
      { threshold: 0 }
    );
    intersectionObserver.observe(container);

    let reqId: number;
    const update = (t: number) => {
      reqId = requestAnimationFrame(update);

      if (needsUpdate) settleFrames = SETTLE;

      const active = settleFrames > 0;
      // Nothing to draw: off-screen, or idle with the ripple already faded and
      // no pending base-image redraw.
      if (!onScreen || (!active && !dirty)) {
        needsUpdate = false;
        return;
      }
      if (active) settleFrames--;

      if (!needsUpdate) {
        mouse.set(-1);
        velocity.set(0);
      }
      needsUpdate = false;

      flowmap.aspect = canvas.width / canvas.height;
      flowmap.mouse.copy(mouse);
      // Lerp a bit slower when mouse stops to let the velocity settle smoothly
      flowmap.velocity.lerp(velocity, velocity.len() ? 0.15 : 0.08);
      flowmap.update();

      program.uniforms.uTime.value = t * 0.01;

      renderer.render({ scene: mesh });
      dirty = false;
      // First frame with the texture actually bound. Before this the canvas is
      // transparent, so signalling any earlier would be a lie.
      if (texture.image) markReady();
    };
    reqId = requestAnimationFrame(update);

    return () => {
      refitRef.current = null;
      resizeObserver.disconnect();
      intersectionObserver.disconnect();
      window.removeEventListener('resize', resize);
      container.removeEventListener('mousemove', updateMouse);
      container.removeEventListener('touchstart', updateMouse);
      container.removeEventListener('touchmove', updateMouse);
      cancelAnimationFrame(reqId);
    };
  }, [src]);

  return (
    <div
      ref={containerRef}
      className={`relative overflow-hidden ${className || ''}`}
      role="img"
      aria-label={alt}
    >
      {/* Fallback image — only visible when WebGL is unavailable */}
      <div ref={fallbackRef} className="absolute inset-0">
        <Image
          src={src}
          alt=""
          fill
          sizes={
            sizes ?? "(max-width: 640px) 95vw, (max-width: 1024px) 80vw, 750px"
          }
          className={fit === "cover" ? "object-cover" : "object-contain"}
          /* Inline rather than a Tailwind class because the focal x is an
             arbitrary fraction (0.27 for the hero) that isn't on the utility
             scale.

             The percentage IS the anchor: CSS aligns the P% point of the image
             with the P% point of the box, which is the same fixed-point mapping
             the shader's uAnchor expresses — so the two paths agree exactly, as
             long as neither clamps (see the uAnchor note in resize()). The y is
             flipped only because this UV space measures from the bottom while
             object-position measures from the top. */
          style={{
            objectPosition: `${focusX * 100}% ${(1 - focusY) * 100}%`,
          }}
          aria-hidden="true"
        />
      </div>
      <canvas
        ref={canvasRef}
        className="relative z-10 block w-full h-full pointer-events-auto"
        aria-hidden="true"
      />
    </div>
  );
}
