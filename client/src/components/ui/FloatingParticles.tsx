import { useEffect, useState } from "react";

export default function FloatingParticles() {
  const [particles, setParticles] = useState([]);

  useEffect(() => {
    const newParticles = Array.from({ length: 50 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 3 + 1,
      duration: Math.random() * 20 + 10,
      delay: Math.random() * 5,
      opacity: Math.random() * 0.3 + 0.1
    }));
    setParticles(newParticles);
  }, []);

  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
      {/* Gradient Orbs */}
      <div className="absolute top-1/4 -left-1/4 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl animate-pulse" />
      <div className="absolute bottom-1/4 -right-1/4 w-96 h-96 bg-amber-600/5 rounded-full blur-3xl animate-pulse" style={{ animationDelay: "2s" }} />
      <div className="absolute top-3/4 left-1/2 w-64 h-64 bg-white/5 rounded-full blur-3xl animate-pulse" style={{ animationDelay: "4s" }} />

      {/* Floating Particles */}
      {particles.map((particle) => (
        <div
          key={particle.id}
          className="absolute rounded-full bg-gradient-to-r from-amber-400/30 to-white/20"
          style={{
            left: `${particle.x}%`,
            top: `${particle.y}%`,
            width: `${particle.size}px`,
            height: `${particle.size}px`,
            opacity: particle.opacity,
            animation: `float ${particle.duration}s ease-in-out infinite`,
            animationDelay: `${particle.delay}s`
          }}
        />
      ))}

      <style>{`
        @keyframes float {
          0%, 100% {
            transform: translateY(0) translateX(0);
          }
          25% {
            transform: translateY(-30px) translateX(10px);
          }
          50% {
            transform: translateY(-10px) translateX(-10px);
          }
          75% {
            transform: translateY(-20px) translateX(5px);
          }
        }
      `}</style>
    </div>
  );
}
