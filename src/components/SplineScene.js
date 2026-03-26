"use client";

import Script from "next/script";

export default function SplineScene({ url }) {
  return (
    <>
      <Script
        src="https://unpkg.com/@splinetool/viewer@1.12.69/build/spline-viewer.js"
        type="module"
        strategy="afterInteractive"
      />
      {/* Wrapper div creates a stacking context at z-index 0,
          so the spline canvas can never paint above z-index 1+ siblings */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100vw",
          height: "100vh",
          zIndex: 0,
          pointerEvents: "none",
          overflow: "hidden",
          isolation: "isolate",
        }}
      >
        <spline-viewer
          url={url}
          background="transparent"
          style={{
            display: "block",
            width: "100%",
            height: "100%",
            background: "transparent",
            maskImage: "linear-gradient(to bottom, black 55%, transparent 100%)",
            WebkitMaskImage: "linear-gradient(to bottom, black 55%, transparent 100%)",
          }}
        />
      </div>
    </>
  );
}
