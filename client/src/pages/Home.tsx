import { motion } from 'framer-motion';
import logo from '@assets/logo_1764702653665.png';

export default function Home() {
  return (
    <div className="min-h-screen bg-[#000543] text-white flex flex-col items-center justify-center p-8 font-sans overflow-hidden relative">
      {/* Background glow effects */}
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-[#0038FF] opacity-10 blur-[150px] rounded-full" />
      <div className="absolute bottom-0 right-1/4 w-[400px] h-[400px] bg-[#0038FF] opacity-10 blur-[150px] rounded-full" />
      
      <div className="relative z-10 max-w-4xl w-full">
        {/* Logo Section */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="flex flex-col items-center mb-16"
        >
          <img src={logo} alt="Boundier" className="h-24 mb-8" />
          <h1 className="text-5xl md:text-6xl font-bold tracking-tight mb-6 text-center">
            <span className="text-[#0038FF]">[</span>boundier<span className="text-[#0038FF]">_</span>
          </h1>
          <p className="text-xl md:text-2xl text-white/70 text-center max-w-2xl font-light">
            Analyze what changes you while you consume content
          </p>
        </motion.div>

        {/* Info Cards */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="grid md:grid-cols-3 gap-6 mb-12"
        >
          <div className="glass-panel rounded-2xl p-6 border border-white/10">
            <div className="text-[#0038FF] text-3xl font-bold mb-2">Influence</div>
            <p className="text-sm text-white/60 leading-relaxed">
              Measures emotional pressure combined with your fixation intensity on content
            </p>
          </div>
          
          <div className="glass-panel rounded-2xl p-6 border border-white/10">
            <div className="text-[#0038FF] text-3xl font-bold mb-2">Distortion</div>
            <p className="text-sm text-white/60 leading-relaxed">
              Detects certainty framing and one-sided narratives that bypass critical thinking
            </p>
          </div>
          
          <div className="glass-panel rounded-2xl p-6 border border-white/10">
            <div className="text-[#0038FF] text-3xl font-bold mb-2">Echo Drift</div>
            <p className="text-sm text-white/60 leading-relaxed">
              Tracks repeated responses to similar emotional patterns over time
            </p>
          </div>
        </motion.div>

        {/* Installation Instructions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="glass-panel rounded-2xl p-8 border border-white/10"
        >
          <h2 className="text-2xl font-bold mb-6 flex items-center gap-3">
            <span className="text-[#0038FF]">→</span> Installation
          </h2>
          
          <ol className="space-y-4 text-white/80">
            <li className="flex gap-4">
              <span className="text-[#0038FF] font-bold min-w-[2rem]">01</span>
              <span>Download the <code className="px-2 py-1 bg-white/10 rounded text-sm">extension/</code> folder from this project</span>
            </li>
            <li className="flex gap-4">
              <span className="text-[#0038FF] font-bold min-w-[2rem]">02</span>
              <span>Open Chrome and navigate to <code className="px-2 py-1 bg-white/10 rounded text-sm">chrome://extensions</code></span>
            </li>
            <li className="flex gap-4">
              <span className="text-[#0038FF] font-bold min-w-[2rem]">03</span>
              <span>Enable <strong>Developer mode</strong> (toggle in top-right corner)</span>
            </li>
            <li className="flex gap-4">
              <span className="text-[#0038FF] font-bold min-w-[2rem]">04</span>
              <span>Click <strong>Load unpacked</strong> and select the extension folder</span>
            </li>
            <li className="flex gap-4">
              <span className="text-[#0038FF] font-bold min-w-[2rem]">05</span>
              <span>Visit X.com, Twitter.com, or Reddit.com to start analyzing</span>
            </li>
          </ol>
        </motion.div>

        {/* Feature Highlights */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.6 }}
          className="mt-12 text-center"
        >
          <div className="inline-flex flex-wrap gap-4 justify-center text-sm text-white/50">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-[#0038FF] rounded-full" />
              <span>Client-side only</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-[#0038FF] rounded-full" />
              <span>No external APIs</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-[#0038FF] rounded-full" />
              <span>Complete privacy</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-[#0038FF] rounded-full" />
              <span>Lightweight heuristics</span>
            </div>
          </div>
        </motion.div>

        {/* Footer */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.8 }}
          className="mt-16 text-center text-white/30 text-xs"
        >
          <p>Boundier does not analyze what you're looking for — it analyzes what changes you while you consume content.</p>
        </motion.div>
      </div>
    </div>
  );
}
