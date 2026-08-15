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
  uniform vec2 uResolution;

  void main() {
      vec3 flow = texture2D(tFlow, vUv).rgb;
      
      // We map the UVs for object-contain object-bottom
      vec2 myUV = (vUv - vec2(0.5, 0.0)) * uScale + vec2(0.5, 0.0);
      
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

interface LiquidImageProps {
  src: string;
  alt: string;
  className?: string;
}

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

export default function LiquidImage({ src, alt, className }: LiquidImageProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fallbackRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current || !canvasRef.current) return;

    const container = containerRef.current;
    const canvas = canvasRef.current;
    const fallback = fallbackRef.current;
    canvas.style.removeProperty("display");

    // Show fallback by default; hide it once WebGL canvas is confirmed working
    const showFallback = () => {
      canvas.style.display = "none";
      if (fallback) fallback.style.display = "";
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

        if (canvasAspect > imageAspect) {
          scaleX = canvasAspect / imageAspect;
          scaleY = 1;
        } else {
          scaleX = 1;
          scaleY = imageAspect / canvasAspect;
        }
        program.uniforms.uScale.value.set(scaleX, scaleY);
      }

      dirty = true; // size/texture changed — redraw the base image once
    };

    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(container);
    window.addEventListener('resize', resize);
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
    };
    reqId = requestAnimationFrame(update);

    return () => {
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
          sizes="(max-width: 640px) 95vw, (max-width: 1024px) 80vw, 750px"
          className="object-contain object-bottom"
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
