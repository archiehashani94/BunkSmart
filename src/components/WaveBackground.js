"use client";

import { useEffect, useRef } from "react";

export default function WaveBackground() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    let animId;
    let mouseX = 0;
    let mouseY = 0;
    let targetMouseX = 0;
    let targetMouseY = 0;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    const handleMouse = (e) => {
      targetMouseX = (e.clientX / window.innerWidth - 0.5) * 2;
      targetMouseY = (e.clientY / window.innerHeight - 0.5) * 2;
    };
    window.addEventListener("mousemove", handleMouse);

    const waves = [
      { color: "0, 212, 170", amplitude: 22, frequency: 0.003, speed: 0.002, yOffset: 0.22, opacity: 0.2, width: 1.2 },
      { color: "56, 189, 248", amplitude: 18, frequency: 0.004, speed: 0.0015, yOffset: 0.4, opacity: 0.18, width: 1 },
      { color: "124, 58, 237", amplitude: 15, frequency: 0.0035, speed: 0.001, yOffset: 0.55, opacity: 0.12, width: 1.5 },
      { color: "0, 212, 170", amplitude: 20, frequency: 0.002, speed: 0.0018, yOffset: 0.68, opacity: 0.15, width: 0.8 },
      { color: "56, 189, 248", amplitude: 12, frequency: 0.005, speed: 0.002, yOffset: 0.8, opacity: 0.2, width: 0.8 },
    ];

    let time = 0;

    const draw = () => {
      const { width, height } = canvas;

      // Smooth mouse lerp
      mouseX += (targetMouseX - mouseX) * 0.03;
      mouseY += (targetMouseY - mouseY) * 0.03;

      // Clear with dark navy
      ctx.fillStyle = "#0a0f1e";
      ctx.fillRect(0, 0, width, height);

      // Draw each wave
      for (const wave of waves) {
        ctx.beginPath();
        ctx.strokeStyle = `rgba(${wave.color}, ${wave.opacity})`;
        ctx.lineWidth = wave.width;

        const parallaxX = mouseX * 10;
        const parallaxY = mouseY * 6;

        for (let x = -10; x <= width + 10; x += 3) {
          const baseY = height * wave.yOffset + parallaxY;
          const y =
            baseY +
            Math.sin((x + parallaxX) * wave.frequency + time * wave.speed * 60) *
              wave.amplitude +
            Math.sin((x + parallaxX) * wave.frequency * 0.5 + time * wave.speed * 30) *
              wave.amplitude * 0.4;

          if (x === -10) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
        }
        ctx.stroke();
      }

      // Bottom fade gradient overlay
      const fadeGrad = ctx.createLinearGradient(0, height * 0.6, 0, height);
      fadeGrad.addColorStop(0, "rgba(10, 15, 30, 0)");
      fadeGrad.addColorStop(1, "rgba(10, 15, 30, 1)");
      ctx.fillStyle = fadeGrad;
      ctx.fillRect(0, height * 0.6, width, height * 0.4);

      time += 0.15;
      animId = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", resize);
      window.removeEventListener("mousemove", handleMouse);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        zIndex: 0,
        pointerEvents: "none",
        display: "block",
      }}
    />
  );
}
