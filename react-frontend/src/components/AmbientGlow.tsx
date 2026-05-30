import { useEffect } from 'react';
import { motion, useMotionValue, useSpring } from 'framer-motion';

export default function AmbientGlow() {
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  // 增加物理阻尼，让光晕有一点"拖尾"的液体感
  const smoothX = useSpring(mouseX, { stiffness: 50, damping: 20 });
  const smoothY = useSpring(mouseY, { stiffness: 50, damping: 20 });

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      mouseX.set(e.clientX);
      mouseY.set(e.clientY);
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [mouseX, mouseY]);

  return (
    <motion.div
      className="pointer-events-none fixed inset-0 z-[1]"
      style={{
        background: 'transparent',
        // 使用非常克制的荧光绿/白渐变，透明度极低
        backgroundImage: `radial-gradient(600px circle at calc(${smoothX}px) calc(${smoothY}px), rgba(16, 185, 129, 0.03), transparent 80%)`,
      }}
    />
  );
}