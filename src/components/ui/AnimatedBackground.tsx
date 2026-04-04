import React from 'react';
import { motion } from 'motion/react';
import { useTheme } from '../../providers/ThemeProvider';

/**
 * UI-01: Background Dinâmico e Animado (Premium)
 * Cria um efeito de gradientes que se movem suavemente.
 */

export const AnimatedBackground: React.FC = () => {
  const { theme } = useTheme();
  
  // Cor primária do whitelabel ou fallback
  const primaryColor = theme?.primary_color || '#6366f1';

  return (
    <div className="fixed inset-0 -z-10 overflow-hidden bg-slate-50">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_120%,rgba(120,119,198,0.3),rgba(255,255,255,0))]" />
      
      {/* Círculo Animado 1 */}
      <motion.div
        animate={{
          scale: [1, 1.2, 1],
          x: [0, 100, 0],
          y: [0, 50, 0],
        }}
        transition={{
          duration: 20,
          repeat: Infinity,
          ease: "linear"
        }}
        className="absolute -top-[10%] -left-[10%] w-[40%] h-[40%] rounded-full blur-[120px] opacity-20"
        style={{ backgroundColor: primaryColor }}
      />

      {/* Círculo Animado 2 */}
      <motion.div
        animate={{
          scale: [1.2, 1, 1.2],
          x: [0, -100, 0],
          y: [0, -50, 0],
        }}
        transition={{
          duration: 25,
          repeat: Infinity,
          ease: "linear"
        }}
        className="absolute -bottom-[10%] -right-[10%] w-[50%] h-[50%] rounded-full blur-[140px] opacity-20"
        style={{ backgroundColor: primaryColor }}
      />

      {/* Patterns Sutis */}
      <div className="absolute inset-0 opacity-[0.03]" 
        style={{ backgroundImage: 'radial-gradient(#000 1px, transparent 1px)', backgroundSize: '40px 40px' }} 
      />
    </div>
  );
};
