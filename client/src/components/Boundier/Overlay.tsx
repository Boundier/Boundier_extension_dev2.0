import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ScanResult } from '@/lib/boundier-logic';
import { X } from 'lucide-react';

interface BoundierOverlayProps {
  isOpen: boolean;
  result: ScanResult | null;
  onClose: () => void;
}

export function BoundierOverlay({ isOpen, result, onClose }: BoundierOverlayProps) {
  return (
    <AnimatePresence>
      {isOpen && result && (
        <>
          {/* Overlay Panel */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed top-0 right-0 h-screen w-[320px] z-[9999] pointer-events-auto"
          >
            <div className="h-full w-full glass-panel flex flex-col p-6 text-white font-sans relative overflow-hidden">
              
              {/* Glow Effect Background */}
              <div className="absolute top-[-20%] right-[-20%] w-[300px] h-[300px] bg-[#0038FF] opacity-20 blur-[100px] rounded-full pointer-events-none" />
              
              {/* Header */}
              <div className="flex justify-between items-start mb-8 relative z-10">
                <div>
                  <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
                    <span className="text-[#0038FF]">[</span>
                    boundier
                    <span className="text-[#0038FF]">_</span>
                  </h1>
                  <div className="text-[10px] uppercase tracking-[0.2em] text-white/50 mt-1 ml-1">
                    Current Influence Snapshot
                  </div>
                </div>
                <button 
                  onClick={onClose}
                  className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/10 transition-colors text-white/70 hover:text-white"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Scores */}
              <div className="space-y-8 relative z-10">
                
                {/* Influence Score - Main Hero */}
                <div className="space-y-2">
                  <div className="flex justify-between items-end">
                    <label className="text-sm font-medium text-white/80">Influence</label>
                    <span className="text-4xl font-light text-[#0038FF]">
                      {Math.round(result.influence * 100)}
                    </span>
                  </div>
                  <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${result.influence * 100}%` }}
                      transition={{ delay: 0.2, duration: 0.8, ease: "easeOut" }}
                      className="h-full bg-[#0038FF] shadow-[0_0_10px_#0038FF]" 
                    />
                  </div>
                  <p className="text-[10px] text-white/40 leading-relaxed">
                    Combined metric of emotional pressure and your dwell intensity.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-4 border-t border-white/10">
                  {/* Distortion */}
                  <div className="space-y-2">
                    <label className="text-xs uppercase tracking-wider text-white/50">Distortion</label>
                    <div className="text-2xl font-light">{Math.round(result.distortion * 100)}</div>
                    <div className="h-1 w-full bg-white/10 rounded-full overflow-hidden">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${result.distortion * 100}%` }}
                        transition={{ delay: 0.3, duration: 0.8 }}
                        className="h-full bg-white/80" 
                      />
                    </div>
                  </div>

                  {/* Echo Drift */}
                  <div className="space-y-2">
                    <label className="text-xs uppercase tracking-wider text-white/50">Echo Drift</label>
                    <div className="text-2xl font-light">{Math.round(result.echoDrift * 100)}</div>
                    <div className="h-1 w-full bg-white/10 rounded-full overflow-hidden">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${result.echoDrift * 100}%` }}
                        transition={{ delay: 0.4, duration: 0.8 }}
                        className="h-full bg-white/60" 
                      />
                    </div>
                  </div>
                </div>

                {/* Interpretation */}
                <div className="pt-6 border-t border-white/10">
                  <div className="p-4 bg-white/5 rounded-lg border border-white/5 backdrop-blur-sm">
                    <p className="text-sm font-light leading-relaxed text-white/90">
                      "{result.interpretation}"
                    </p>
                  </div>
                  <div className="mt-3 flex gap-2 flex-wrap">
                     <span className="text-[10px] px-2 py-1 bg-[#0038FF]/20 text-[#0038FF] rounded border border-[#0038FF]/30">
                      {result.dominantHook.toUpperCase()}
                    </span>
                  </div>
                </div>

              </div>
              
              {/* Footer Decoration */}
              <div className="absolute bottom-6 left-6 text-[10px] text-white/20 font-mono">
                ID: {result.id.slice(0, 8)}
              </div>
            </div>
          </motion.div>

          {/* Backdrop (Optional - allows clicking outside to close) */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/20 backdrop-blur-[2px] z-[9998]"
          />
        </>
      )}
    </AnimatePresence>
  );
}
