import { useEffect, useRef, useState } from "react";

interface ConfettiProps {
  active: boolean;
  duration?: number;
}

const COLORS = [
  'hsl(45, 100%, 50%)',   // gold
  'hsl(0, 84%, 60%)',     // red
  'hsl(120, 60%, 50%)',   // green
  'hsl(210, 80%, 60%)',   // blue
  'hsl(280, 70%, 60%)',   // purple
  'hsl(45, 100%, 70%)',   // light gold
];

export const Confetti = ({ active, duration = 3000 }: ConfettiProps) => {
  const [particles, setParticles] = useState<
    { id: number; left: string; color: string; delay: string; size: number; rotation: number }[]
  >([]);

  useEffect(() => {
    if (!active) {
      setParticles([]);
      return;
    }

    const newParticles = Array.from({ length: 40 }, (_, i) => ({
      id: i,
      left: `${Math.random() * 100}%`,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      delay: `${Math.random() * 1}s`,
      size: 6 + Math.random() * 8,
      rotation: Math.random() * 360,
    }));

    setParticles(newParticles);

    const timer = setTimeout(() => setParticles([]), duration);
    return () => clearTimeout(timer);
  }, [active, duration]);

  if (particles.length === 0) return null;

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none z-50">
      {particles.map((p) => (
        <div
          key={p.id}
          className="confetti-particle"
          style={{
            left: p.left,
            top: '-10px',
            width: `${p.size}px`,
            height: `${p.size}px`,
            backgroundColor: p.color,
            animationDelay: p.delay,
            transform: `rotate(${p.rotation}deg)`,
            borderRadius: Math.random() > 0.5 ? '50%' : '2px',
          }}
        />
      ))}
    </div>
  );
};

export default Confetti;
