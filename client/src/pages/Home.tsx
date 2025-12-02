import { motion } from 'framer-motion';
import logo from '@assets/logo_1764702653665.png';

const fadeIn = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6 }
  }
};

const staggerContainer = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.15
    }
  }
};

export default function Home() {
  return (
    <div className="min-h-screen bg-[#000543] text-white flex flex-col items-center justify-center p-8 font-sans overflow-hidden relative">
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-[#0038FF] opacity-10 blur-[150px] rounded-full" />
      <div className="absolute bottom-0 right-1/4 w-[400px] h-[400px] bg-[#0038FF] opacity-10 blur-[150px] rounded-full" />

      <div className="relative z-10 max-w-4xl w-full">
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="flex flex-col items-center mb-16"
        >
          <img src={logo} alt="Boundier" className="h-24 mb-8" />
          <p className="text-xl md:text-2xl text-white/70 text-center max-w-2xl font-light">
            Analyze what changes you while you consume content
          </p>
        </motion.div>

        <section className="relative z-10 py-24 px-6 max-w-6xl mx-auto">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            variants={staggerContainer}
          >
            <motion.h2 variants={fadeIn} className="text-3xl md:text-4xl font-bold text-center mb-16">
              What Boundier Is
            </motion.h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

              {/* Card 1 */}
              <motion.div variants={fadeIn} className="glass-panel p-8 rounded-2xl flex flex-col gap-4 border border-white/10 hover:bg-white/10 transition-colors duration-300 group">
                <div className="h-12 w-12 rounded-full glass-panel border border-white/10 flex items-center justify-center text-blue-200 mb-2 group-hover:scale-110 transition-transform shadow-[0_0_15px_rgba(0,56,255,0.1)]">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
                </div>
                <h3 className="text-xl font-bold">Influence</h3>
                <p className="text-white/70 leading-relaxed">
                  Shows how content pulls your attention, shifts what you focus on, and gradually reshapes your sense of importance.
                </p>
              </motion.div>

              {/* Card 2 */}
              <motion.div variants={fadeIn} className="glass-panel p-8 rounded-2xl flex flex-col gap-4 border border-white/10 hover:bg-white/10 transition-colors duration-300 group">
                <div className="h-12 w-12 rounded-full glass-panel border border-white/10 flex items-center justify-center text-blue-200 mb-2 group-hover:scale-110 transition-transform shadow-[0_0_15px_rgba(0,56,255,0.1)]">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12h20"/><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>
                </div>
                <h3 className="text-xl font-bold">Distortion</h3>
                <p className="text-white/70 leading-relaxed">
                  Exposes emotional pressure, framing tactics, and narrative cues designed to make ideas feel true before you even think about them.
                </p>
              </motion.div>

              {/* Card 3 */}
              <motion.div variants={fadeIn} className="glass-panel p-8 rounded-2xl flex flex-col gap-4 border border-white/10 hover:bg-white/10 transition-colors duration-300 group">
                <div className="h-12 w-12 rounded-full glass-panel border border-white/10 flex items-center justify-center text-blue-200 mb-2 group-hover:scale-110 transition-transform shadow-[0_0_15px_rgba(0,56,255,0.1)]">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/></svg>
                </div>
                <h3 className="text-xl font-bold">Echo Drift</h3>
                <p className="text-white/70 leading-relaxed">
                  Detects when your feed stops giving you contrast, filters out opposing views, and begins reinforcing a single perspective repeatedly.
                </p>
              </motion.div>

            </div>
          </motion.div>
        </section>

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
