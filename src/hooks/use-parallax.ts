import { useEffect, useRef, useCallback } from "react";

interface ParallaxRefs {
  cyberDepth: React.RefObject<HTMLDivElement>;
  neuralOverlay: React.RefObject<HTMLDivElement>;
  gradientLayer: React.RefObject<HTMLDivElement>;
  starfield?: React.RefObject<HTMLDivElement>;
}

export function useParallax(refs: ParallaxRefs) {
  const target = useRef({ x: 0, y: 0 });
  const current = useRef({ x: 0, y: 0 });
  const scrollY = useRef(0);
  const rafId = useRef<number>(0);
  const isMobile = useRef(false);

  const lerp = useCallback((start: number, end: number, factor: number) => {
    return start + (end - start) * factor;
  }, []);

  useEffect(() => {
    isMobile.current = "ontouchstart" in window || navigator.maxTouchPoints > 0;

    const handleScroll = () => {
      scrollY.current = window.scrollY;
    };

    const handleMouseMove = (e: MouseEvent) => {
      const cx = e.clientX - window.innerWidth / 2;
      const cy = e.clientY - window.innerHeight / 2;
      target.current = { x: cx, y: cy };
    };

    const animate = () => {
      if (!isMobile.current) {
        current.current.x = lerp(current.current.x, target.current.x, 0.05);
        current.current.y = lerp(current.current.y, target.current.y, 0.05);
      }

      const { x, y } = current.current;
      const sy = scrollY.current;

      // Blur shapes: opposite direction + scroll parallax
      if (refs.cyberDepth.current) {
        const bx = isMobile.current ? 0 : -x * 0.025;
        const by = (isMobile.current ? 0 : -y * 0.025) + sy * 0.15;
        refs.cyberDepth.current.style.transform = `translate(${bx}px, ${-by}px)`;
      }

      // Neural dots: same direction + slower scroll
      if (refs.neuralOverlay.current) {
        const nx = isMobile.current ? 0 : x * 0.012;
        const ny = (isMobile.current ? 0 : y * 0.012) + sy * 0.08;
        refs.neuralOverlay.current.style.transform = `translate(${nx}px, ${-ny}px)`;
      }

      // Gradient: very subtle + scroll
      if (refs.gradientLayer.current) {
        const gx = isMobile.current ? 0 : x * 0.006;
        const gy = (isMobile.current ? 0 : y * 0.006) + sy * 0.05;
        refs.gradientLayer.current.style.transform = `translate(${gx}px, ${-gy}px)`;
      }

      // Starfield: slowest scroll for depth
      if (refs.starfield?.current) {
        const sx = isMobile.current ? 0 : x * 0.008;
        const syy = (isMobile.current ? 0 : y * 0.008) + sy * 0.1;
        refs.starfield.current.style.transform = `translate(${sx}px, ${-syy}px)`;
      }

      rafId.current = requestAnimationFrame(animate);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    if (!isMobile.current) {
      window.addEventListener("mousemove", handleMouseMove);
    }
    rafId.current = requestAnimationFrame(animate);

    return () => {
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("mousemove", handleMouseMove);
      cancelAnimationFrame(rafId.current);
    };
  }, [refs, lerp]);

  return isMobile.current;
}
