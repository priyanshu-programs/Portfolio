'use client';

import React, { useEffect } from 'react';

interface FollowCursorProps {
  color?: string;
  zIndex?: number;
  particles?: number;
  rate?: number;
}

const FollowCursor: React.FC<FollowCursorProps> = ({
  color = '#ffffff',
  zIndex = 9999,
  particles = 15, // Number of trailing blobs
  rate = 0.4, // How closely they follow each other
}) => {
  useEffect(() => {
    if (window.matchMedia('(pointer: coarse)').matches) {
      return;
    }

    let canvas: HTMLCanvasElement;
    let context: CanvasRenderingContext2D | null;
    const overlayRoot = document.getElementById('app-overlay-root');
    let animationFrame = 0;
    let running = false;
    let lastFrameAt = 0;
    let width = window.innerWidth;
    let height = window.innerHeight;
    let cursor = { x: width / 2, y: height / 2 };
    let particlesArray: Particle[] = [];
    let cursorsInitted = false;
    let isHovering = false;

    const prefersReducedMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)'
    );

    // The original main dot
    class Dot {
      position: { x: number; y: number };
      width: number; // base width
      renderedWidth: number; // smoothly scaling width
      lag: number;

      constructor(x: number, y: number, width: number, lag: number) {
        this.position = { x, y };
        this.width = width;
        this.renderedWidth = width;
        this.lag = lag;
      }
    }

    // Trailing particles behind the main dot
    class Particle {
      position: { x: number; y: number };
      renderedSize: number = 0;

      constructor(x: number, y: number) {
        this.position = { x, y };
      }
    }

    const dot = new Dot(width / 2, height / 2, 10, 10);

    const onMouseMove = (e: MouseEvent) => {
      cursor.x = e.clientX;
      cursor.y = e.clientY;

      const target = e.target as HTMLElement;
      if (target) {
        // Detect if hovering over a clickable element
        const isClickable =
          target.closest('a, button, [role="button"], input, select, textarea') !== null ||
          window.getComputedStyle(target).cursor === 'pointer';
        isHovering = isClickable;
      }

      if (!cursorsInitted) {
        cursorsInitted = true;
        for (let i = 0; i < particles; i++) {
          particlesArray.push(new Particle(cursor.x, cursor.y));
        }
      }

      // Wake the render loop if it paused after settling.
      startLoop();
    };

    const onWindowResize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      if (canvas) {
        // Assigning width/height resets the 2D context and blanks the canvas, so
        // the loop must repaint even if the cursor had already settled.
        canvas.width = width;
        canvas.height = height;
        startLoop();
      }
    };

    const updateDot = (): boolean => {
      const ctx = context;
      if (!ctx) return false;

      ctx.clearRect(0, 0, width, height);

      // 1. Move the main dot towards the mouse with lag
      dot.position.x += (cursor.x - dot.position.x) / dot.lag;
      dot.position.y += (cursor.y - dot.position.y) / dot.lag;

      // Smoothly scale the main dot up by 2.5x when hovering
      const targetDotWidth = isHovering ? dot.width * 2.5 : dot.width;
      dot.renderedWidth += (targetDotWidth - dot.renderedWidth) * 0.2;

      ctx.fillStyle = color;

      // Draw the main blob constantly
      ctx.beginPath();
      ctx.arc(
        dot.position.x,
        dot.position.y,
        dot.renderedWidth,
        0,
        2 * Math.PI
      );
      ctx.fill();
      ctx.closePath();

      // 2. Update the trailing particles following the main dot
      let x = dot.position.x;
      let y = dot.position.y;

      particlesArray.forEach((particle, index) => {
        const nextParticle = particlesArray[index + 1] || particlesArray[0];

        particle.position.x = x;
        particle.position.y = y;

        // Target size is always relative to the main dot's rendered width
        const targetSize = Math.max(
          0.5,
          dot.renderedWidth * (1 - (index + 1) / particles)
        );

        // Smoothly interpolate renderedSize towards targetSize
        particle.renderedSize += (targetSize - particle.renderedSize) * 0.2;

        // Draw trailing blob
        if (particle.renderedSize > 0.1) {
          ctx.beginPath();
          ctx.arc(
            particle.position.x,
            particle.position.y,
            particle.renderedSize,
            0,
            2 * Math.PI
          );
          ctx.fill();
          ctx.closePath();
        }

        // Calculate next position
        x += (nextParticle.position.x - particle.position.x) * rate;
        y += (nextParticle.position.y - particle.position.y) * rate;
      });

      // Report whether anything is still visibly moving, so the loop can pause
      // once the cursor and its trail have settled.
      const dxToCursor = cursor.x - dot.position.x;
      const dyToCursor = cursor.y - dot.position.y;
      const targetWidth = isHovering ? dot.width * 2.5 : dot.width;
      return (
        Math.hypot(dxToCursor, dyToCursor) > 0.5 ||
        Math.abs(targetWidth - dot.renderedWidth) > 0.5
      );
    };

    let idleFrames = 0;
    let forceFrames = 0;
    const IDLE_LIMIT = 30; // pause ~0.5s after the cursor + trail settle
    // If the loop claims to be running but hasn't painted for this long, the
    // pending rAF callback was silently dropped (OS sleep, minimize, bfcache) and
    // will never fire. Treat it as dead and restart rather than blocking forever.
    const STALL_MS = 1000;

    const loop = () => {
      lastFrameAt = performance.now();

      const active = updateDot();
      // Always paint a couple of frames after a wake: the canvas backing store may
      // have been purged while hidden, or blanked by a resize, and updateDot()
      // reports "settled" immediately when the dot has already converged.
      if (forceFrames > 0) forceFrames--;
      idleFrames = active || forceFrames > 0 ? 0 : idleFrames + 1;

      if (idleFrames > IDLE_LIMIT) {
        // settled — stop until the next mouse move
        running = false;
        animationFrame = 0;
        return;
      }
      animationFrame = requestAnimationFrame(loop);
    };

    const startLoop = () => {
      if (prefersReducedMotion.matches || document.visibilityState !== 'visible') {
        return;
      }
      if (running) {
        if (performance.now() - lastFrameAt < STALL_MS) return; // genuinely running
        // Stalled: drop the phantom frame id and fall through to restart.
        if (animationFrame) cancelAnimationFrame(animationFrame);
        animationFrame = 0;
      }
      idleFrames = 0;
      forceFrames = 2;
      running = true;
      lastFrameAt = performance.now();
      animationFrame = requestAnimationFrame(loop);
    };

    const stopLoop = () => {
      if (animationFrame) cancelAnimationFrame(animationFrame);
      animationFrame = 0;
      running = false;
    };

    const onWake = () => startLoop();

    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        startLoop();
      } else {
        stopLoop();
      }
    };

    const init = () => {
      if (prefersReducedMotion.matches) {
        console.log('Reduced motion enabled, cursor effect skipped.');
        return;
      }
      if (!overlayRoot) return;

      canvas = document.createElement('canvas');
      context = canvas.getContext('2d');
      canvas.style.position = 'fixed';
      canvas.style.top = '0';
      canvas.style.left = '0';
      canvas.style.pointerEvents = 'none';
      canvas.style.mixBlendMode = 'difference';
      canvas.width = width;
      canvas.height = height;
      canvas.style.zIndex = zIndex ? zIndex.toString() : '';
      overlayRoot.appendChild(canvas);

      window.addEventListener('mousemove', onMouseMove);
      window.addEventListener('resize', onWindowResize);
      document.addEventListener('visibilitychange', onVisibilityChange);
      // Extra wake paths for the cases visibilitychange misses: alt-tab / window
      // refocus, and bfcache restore via the browser back button.
      window.addEventListener('focus', onWake);
      window.addEventListener('pageshow', onWake);
      startLoop();
    };

    const destroy = () => {
      if (canvas?.parentNode === overlayRoot) canvas.remove();
      stopLoop();
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('resize', onWindowResize);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      window.removeEventListener('focus', onWake);
      window.removeEventListener('pageshow', onWake);
    };

    prefersReducedMotion.onchange = () => {
      if (prefersReducedMotion.matches) {
        destroy();
      } else {
        init();
      }
    };

    init();

    return () => {
      destroy();
    };
  }, [color, zIndex, particles, rate]);

  return null;
};

export default FollowCursor;
