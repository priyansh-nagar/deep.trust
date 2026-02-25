import { useEffect, useRef, useCallback } from "react";

interface ParallaxRefs {
  cyberDepth: React.RefObject<HTMLDivElement>;
  neuralOverlay: React.RefObject<HTMLDivElement>;
  gradientLayer: React.RefObject<HTMLDivElement>;
}

export function useParallax(refs: ParallaxRefs) {
  const target = useRef({ x: 0, y: 0 });
  const current = useRef({ x: 0, y: 0 });
  const rafId = useRef<number>(0);
  const isMobile = useRef(false);

  const lerp = useCallback((start: number, end: number, factor: number) => {
    return start + (end - start) * factor;
  }, []);

  useEffect(() => {
    isMobile.current = "ontouchstart" in window || navigator.maxTouchPoints > 0;
    if (isMobile.current) return;

    const handleMouseMove = (e: MouseEvent) => {
      const cx = e.clientX - window.innerWidth / 2;
      const cy = e.clientY - window.innerHeight / 2;
      target.current = { x: cx, y: cy };
    };

    const animate = () => {
      current.current.x = lerp(current.current.x, target.current.x, 0.05);
      current.current.y = lerp(current.current.y, target.current.y, 0.05);

      const { x, y } = current.current;

      // Blur shapes: opposite direction, 0.025x speed
      if (refs.cyberDepth.current) {
        const bx = -x * 0.025;
        const by = -y * 0.025;
        refs.cyberDepth.current.style.transform = `translate(${bx}px, ${by}px)`;
      }

      // Neural dots: same direction, 0.012x speed
      if (refs.neuralOverlay.current) {
        const nx = x * 0.012;
        const ny = y * 0.012;
        refs.neuralOverlay.current.style.transform = `translate(${nx}px, ${ny}px)`;
      }

      // Gradient: very subtle, 0.006x speed
      if (refs.gradientLayer.current) {
        const gx = x * 0.006;
        const gy = y * 0.006;
        refs.gradientLayer.current.style.transform = `translate(${gx}px, ${gy}px)`;
      }

      rafId.current = requestAnimationFrame(animate);
    };

    window.addEventListener("mousemove", handleMouseMove);
    rafId.current = requestAnimationFrame(animate);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      cancelAnimationFrame(rafId.current);
    };
  }, [refs, lerp]);

  return isMobile.current;
}
