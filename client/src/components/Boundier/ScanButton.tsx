import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface ScanButtonProps {
  isVisible: boolean;
  onClick: () => void;
}

export function ScanButton({ isVisible, onClick }: ScanButtonProps) {
  return (
    <AnimatePresence>
      {isVisible && (
        <motion.button
          initial={{ opacity: 0, scale: 0.8, x: 20 }}
          animate={{ opacity: 1, scale: 1, x: 0 }}
          exit={{ opacity: 0, scale: 0.8, x: 20 }}
          whileHover={{ scale: 1.05, boxShadow: "0 0 20px #0038FF" }}
          whileTap={{ scale: 0.95 }}
          onClick={onClick}
          className="fixed right-4 top-1/2 -translate-y-1/2 z-[9900] 
                     bg-[#0038FF]/45 backdrop-blur-md border border-white/20
                     text-white font-bold tracking-wider text-xs uppercase
                     px-4 py-8 rounded-lg shadow-[0_0_12px_#0038FF88]
                     flex flex-col items-center justify-center gap-2
                     transition-all duration-300 group overflow-hidden"
          style={{ writingMode: 'vertical-rl' }}
        >
          <span className="relative z-10">Scan</span>
          
          {/* Pulse Effect */}
          <div className="absolute inset-0 bg-[#0038FF] opacity-0 group-hover:opacity-20 transition-opacity duration-500" />
          <motion.div 
            className="absolute inset-0 border border-white/50 rounded-lg"
            animate={{ opacity: [0.2, 0.5, 0.2], scale: [1, 1.05, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
          />
        </motion.button>
      )}
    </AnimatePresence>
  );
}
