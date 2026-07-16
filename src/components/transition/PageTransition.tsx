"use client";

import { useLayoutEffect, useRef } from "react";
import { useTransition } from "./TransitionContext";

export default function PageTransition() {
  const stageRef = useRef<HTMLDivElement>(null);
  const snapshotRef = useRef<HTMLDivElement>(null);
  const sheetRef = useRef<HTMLDivElement>(null);
  const topCurtainRef = useRef<HTMLDivElement>(null);
  const bandRef = useRef<HTMLDivElement>(null);
  const bottomCurtainRef = useRef<HTMLDivElement>(null);
  const counterRef = useRef<HTMLDivElement>(null);
  const counterTextRef = useRef<HTMLParagraphElement>(null);
  const {
    registerStageRef,
    registerSnapshotRef,
    registerSheetRef,
    registerTopCurtainRef,
    registerBandRef,
    registerBottomCurtainRef,
    registerCounterRef,
    registerCounterTextRef,
  } = useTransition();

  useLayoutEffect(() => {
    registerStageRef(stageRef.current);
    registerSnapshotRef(snapshotRef.current);
    registerSheetRef(sheetRef.current);
    registerTopCurtainRef(topCurtainRef.current);
    registerBandRef(bandRef.current);
    registerBottomCurtainRef(bottomCurtainRef.current);
    registerCounterRef(counterRef.current);
    registerCounterTextRef(counterTextRef.current);

    return () => {
      registerStageRef(null);
      registerSnapshotRef(null);
      registerSheetRef(null);
      registerTopCurtainRef(null);
      registerBandRef(null);
      registerBottomCurtainRef(null);
      registerCounterRef(null);
      registerCounterTextRef(null);
    };
  }, [
    registerBandRef,
    registerBottomCurtainRef,
    registerCounterRef,
    registerCounterTextRef,
    registerSheetRef,
    registerSnapshotRef,
    registerStageRef,
    registerTopCurtainRef,
  ]);

  return (
    <div ref={stageRef} className="page-transition-stage" aria-hidden="true">
      <div ref={snapshotRef} className="page-transition-snapshot" />
      <div ref={topCurtainRef} className="page-transition-curtain page-transition-curtain-top" />

      <div ref={counterRef} className="page-transition-counter">
        <p ref={counterTextRef}>100</p>
      </div>

      <div ref={sheetRef} className="page-transition-sheet" />
      <div ref={bandRef} className="page-transition-band" />

      <div
        ref={bottomCurtainRef}
        className="page-transition-curtain page-transition-curtain-bottom"
      />
    </div>
  );
}
