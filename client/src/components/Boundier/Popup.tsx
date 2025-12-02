import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ScanResult } from '@/lib/boundier-logic';
import { cn } from '@/lib/utils';
import { Trash2 } from 'lucide-react';

interface BoundierPopupProps {
  isOpen: boolean;
  history: ScanResult[];
  onClearHistory: () => void;
  onClose: () => void;
}

export function BoundierPopup({ isOpen, history, onClearHistory, onClose }: BoundierPopupProps) {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: -10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: -10 }}
        transition={{ duration: 0.1 }}
        className="absolute top-14 right-4 w-[320px] z-[1000]"
      >
        <div className="glass-panel rounded-xl overflow-hidden flex flex-col max-h-[500px]">
          {/* Header */}
          <div className="p-4 border-b border-white/10 flex items-center justify-between bg-[#000543]/80">
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 bg-[#0038FF] flex items-center justify-center rounded text-xs font-bold text-white">b</div>
              <h2 className="font-sans text-white font-bold text-sm tracking-wide">BOUNDIER</h2>
            </div>
            <div className="text-[10px] text-white/40 uppercase tracking-wider">History</div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-2 space-y-2 min-h-[200px] max-h-[360px] custom-scrollbar bg-[#000543]/40">
            {history.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-32 text-white/30 text-xs text-center px-8">
                <p>No scans yet.</p>
                <p className="mt-1">Interactions will appear here.</p>
              </div>
            ) : (
              history.map((scan) => (
                <div key={scan.id} className="bg-white/5 hover:bg-white/10 transition-colors rounded-lg p-3 border border-white/5">
                  <div className="flex justify-between items-start mb-1">
                    <span className="text-[10px] text-white/40">{new Date(scan.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                    <span className="text-[10px] px-1.5 py-0.5 bg-[#0038FF]/20 text-[#0038FF] rounded uppercase font-medium tracking-wide border border-[#0038FF]/30">
                      {scan.dominantHook}
                    </span>
                  </div>
                  
                  <p className="text-xs text-white/90 leading-snug mb-2 font-light">
                    {scan.interpretation}
                  </p>
                  
                  {/* Influence Bar */}
                  <div className="h-1 w-full bg-white/10 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-[#0038FF]" 
                      style={{ width: `${scan.influence * 100}%` }}
                    />
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          <div className="p-3 border-t border-white/10 bg-[#000543]/80">
            <button 
              onClick={onClearHistory}
              className="w-full py-2 px-4 bg-[#0038FF] hover:bg-[#0038FF]/90 text-white text-xs font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              <Trash2 size={12} />
              Clear History
            </button>
          </div>
        </div>
        
        {/* Backdrop close trigger */}
        <div className="fixed inset-0 z-[-1]" onClick={onClose} />
      </motion.div>
    </AnimatePresence>
  );
}
