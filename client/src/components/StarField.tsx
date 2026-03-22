import { useEffect, useRef } from "react";

interface StarFieldProps {
  className?: string;
}

interface Star {
  x: number;
  y: number;
  size: number;
  opacity: number;
  speed: number;
  color: string;
}

export default function StarField({ className = "" }: StarFieldProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const starsRef = useRef<Star[]>([]);
  const animRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const colors = ["#C9A227", "#E8D8F0", "#00CED1", "#ffffff", "#F5D06A"];

    const resize = () => {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
      starsRef.current = Array.from({ length: 120 }, () => ({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        size: Math.random() * 2.5 + 0.5,
        opacity: Math.random() * 0.7 + 0.1,
        speed: Math.random() * 0.3 + 0.05,
        color: colors[Math.floor(Math.random() * colors.length)],
      }));
    };

    resize();
    window.addEventListener("resize", resize);

    let time = 0;
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      time += 0.01;
      starsRef.current.forEach((star, i) => {
        const twinkle = Math.sin(time * star.speed * 5 + i) * 0.4 + 0.6;
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.size * twinkle, 0, Math.PI * 2);
        ctx.fillStyle = star.color;
        ctx.globalAlpha = star.opacity * twinkle;
        ctx.fill();
        // 金色星星加光暈
        if (star.color === "#C9A227" && star.size > 1.5) {
          const gradient = ctx.createRadialGradient(star.x, star.y, 0, star.x, star.y, star.size * 4 * twinkle);
          gradient.addColorStop(0, "rgba(201,162,39,0.3)");
          gradient.addColorStop(1, "rgba(201,162,39,0)");
          ctx.beginPath();
          ctx.arc(star.x, star.y, star.size * 4 * twinkle, 0, Math.PI * 2);
          ctx.fillStyle = gradient;
          ctx.globalAlpha = 0.5;
          ctx.fill();
        }
      });
      ctx.globalAlpha = 1;
      animRef.current = requestAnimationFrame(animate);
    };
    animate();

    return () => {
      window.removeEventListener("resize", resize);
      cancelAnimationFrame(animRef.current);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className={`absolute inset-0 w-full h-full pointer-events-none ${className}`}
      aria-hidden="true"
    />
  );
}
