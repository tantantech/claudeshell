"use client";

import { useEffect, useRef } from "react";
import { useTheme } from "next-themes";

export function MatrixRain() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { resolvedTheme } = useTheme();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    const chars = "01アイウエオカキクケコ";
    const fontSize = 16;
    const columns = Math.floor(canvas.width / fontSize);
    // Only use ~30% of columns for a sparse, elegant rain
    const activeColumns = new Set<number>();
    while (activeColumns.size < Math.floor(columns * 0.25)) {
      activeColumns.add(Math.floor(Math.random() * columns));
    }
    const drops: number[] = Array.from({ length: columns }, () =>
      Math.random() * -80
    );

    let animId: number;

    const draw = () => {
      const isDark = resolvedTheme === "dark";

      if (!isDark) {
        // Light mode: clear canvas completely each frame, draw very faint chars
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      } else {
        // Dark mode: semi-transparent fade for trail effect
        ctx.fillStyle = "rgba(3, 8, 6, 0.12)";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }

      ctx.font = `${fontSize}px JetBrains Mono, monospace`;

      for (const i of activeColumns) {
        const char = chars[Math.floor(Math.random() * chars.length)];
        const x = i * fontSize;
        const y = drops[i] * fontSize;

        const alpha = isDark
          ? 0.03 + Math.random() * 0.06
          : 0.04 + Math.random() * 0.04;

        ctx.fillStyle = isDark
          ? `rgba(0, 255, 65, ${alpha})`
          : `rgba(13, 150, 104, ${alpha})`;

        ctx.fillText(char, x, y);

        if (y > canvas.height && Math.random() > 0.98) {
          drops[i] = 0;
        }
        drops[i]++;
      }

      animId = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", resize);
    };
  }, [resolvedTheme]);

  return (
    <canvas
      ref={canvasRef}
      id="matrix-canvas"
      className="opacity-15 dark:opacity-50"
      aria-hidden="true"
    />
  );
}
