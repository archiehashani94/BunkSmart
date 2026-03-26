"use client";
import { useEffect, useState, useRef } from "react";

export default function AnimatedNumber({
  value,
  suffix = "",
  duration = 800,
  className = "",
}) {
  const [displayValue, setDisplayValue] = useState(0);
  const prevValue = useRef(0);

  useEffect(() => {
    const start = prevValue.current;
    const end = value;
    const startTime = Date.now();

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = start + (end - start) * eased;
      setDisplayValue(Math.round(current * 10) / 10);

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        setDisplayValue(end);
        prevValue.current = end;
      }
    };

    animate();
  }, [value, duration]);

  return (
    <span className={className}>
      {Number.isInteger(value)
        ? Math.round(displayValue)
        : displayValue.toFixed(1)}
      {suffix}
    </span>
  );
}
