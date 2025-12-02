// Boundier - Content Script
// Handles text extraction, analysis, and UI injection.

(function() {
  // --- CONFIG ---
  const CONFIG = {
    DWELL_TRIGGER: 5000, // 5 seconds
    FIXATION_CAP: 60, // 60 seconds max for normalization
    PRESSURE_THRESHOLD: 0.6,
    FIXATION_THRESHOLD: 0.6,
    SILENT_SCAN_RISE: 0.3 // +30% dwell time
  };

  // --- STATE ---
  let state = {
    startTime: Date.now(),
    dwellTime: 0,
    lastScrollY: window.scrollY,
    scrollBacks: 0,
    isScanning: false,
    scanButtonVisible: false,
    hasScannedCurrentPage: false,
    interactionTimer: null,
    analysisLoop: null
  };

  // --- HEURISTICS ---
  const EMOTIONAL_WORDS = [
    "insane", "destroyed", "humiliated", "crushed", "disaster", "exposed", 
    "shocking", "brutal", "nightmare", "betrayal", "dominated", "obliterated", 
    "pathetic", "owned", "ratioed", "canceled", "calling out", "vs"
  ];

  const CERTAINTY_PHRASES = [
    "everyone knows", "the truth is", "this proves", "no one talks about", 
    "what they don't tell you", "wake up", "no debate", "obviously", "undeniable",
    "always", "never", "everyone", "no one", "all of them"
  ];

  const HEDGING_WORDS = [
    "maybe", "possibly", "might", "could", "likely", "perhaps", "seems"
  ];

  const HOOK_TYPES = {
    outrage: ["insane", "betrayal", "destroyed", "disaster", "nightmare"],
    fear: ["shocking", "warning", "collapse", "end", "danger"],
    identity_validation: ["truth", "real", "finally", "us", "them", "woke"],
    hype: ["game changer", "huge", "massive", "revolutionary", "insane"],
    drama: ["exposed", "pathetic", "humiliated", "drama", "beef"],
    cynicism: ["scam", "fake", "lies", "propaganda", "sheep"],
    hope: ["saving", "future", "better", "solution", "win"]
  };

  // --- DOM EXTRACTION ---
  function extractVisibleText() {
    // Simple traversal to get visible text from body, ignoring scripts/forms
    const walker = document.createTreeWalker(
      document.body,
      NodeFilter.SHOW_TEXT,
      {
        acceptNode: function(node) {
          const parent = node.parentNode;
          if (!parent) return NodeFilter.FILTER_REJECT;
          
          const tag = parent.tagName.toLowerCase();
          if (['script', 'style', 'noscript', 'iframe', 'input', 'textarea', 'select', 'button'].includes(tag)) {
            return NodeFilter.FILTER_REJECT;
          }
          
          // Visibility check (expensive, so use sparingly or optimize)
          // For performance, we might skip this for every node and rely on parent visibility
          // Heuristic: if parent has 0 offsetHeight, skip
          if (parent.offsetHeight === 0 || parent.offsetWidth === 0) {
            return NodeFilter.FILTER_REJECT;
          }

          return NodeFilter.FILTER_ACCEPT;
        }
      }
    );

    let text = "";
    while (walker.nextNode()) {
      text += walker.currentNode.nodeValue.trim() + " ";
    }
    return text;
  }

  // --- ANALYSIS ENGINE ---
  function analyze(text, dwellSeconds, scrollBacks) {
    const lowerText = text.toLowerCase();
    const words = lowerText.split(/\s+/).filter(w => w.length > 0);
    const textLengthFactor = Math.max(words.length, 50);

    // 1. Emotional Pressure
    let emotionHits = 0;
    EMOTIONAL_WORDS.forEach(word => {
      if (lowerText.includes(word)) emotionHits++;
    });

    const exclamationHits = (text.match(/!/g) || []).length;
    const capsHits = text.split(/\s+/).filter(w => w.length >= 3 && w === w.toUpperCase() && /[A-Z]/.test(w)).length;

    // Normalized [0,1]
    // Heuristic: 1 hit per 50 words is "high" pressure? 
    // Let's say 5 hits in a standard view is max
    const emotionalPressureRaw = (emotionHits * 1.5 + capsHits + exclamationHits * 0.5) / (textLengthFactor * 0.05);
    const emotionalPressure = Math.min(Math.max(emotionalPressureRaw, 0), 1);

    // 2. Fixation
    const baseFixation = Math.min(dwellSeconds / CONFIG.FIXATION_CAP, 1);
    const bonuses = (scrollBacks * 0.1) + (dwellSeconds > 10 ? 0.1 : 0);
    const fixation = Math.min(Math.max(baseFixation + bonuses, 0), 1);

    // 3. Distortion
    let certaintyHits = 0;
    CERTAINTY_PHRASES.forEach(phrase => {
      if (lowerText.includes(phrase)) certaintyHits++;
    });
    
    let hedgeHits = 0;
    HEDGING_WORDS.forEach(word => {
      if (lowerText.includes(word)) hedgeHits++;
    });

    const distortionRaw = (certaintyHits * 2) - (hedgeHits * 0.5);
    const distortion = Math.min(Math.max(distortionRaw / 4, 0), 1);

    // 4. Dominant Hook
    let maxHits = 0;
    let dominantHook = "generic";
    Object.entries(HOOK_TYPES).forEach(([type, keywords]) => {
      let hits = 0;
      keywords.forEach(k => {
        if (lowerText.includes(k)) hits++;
      });
      if (hits > maxHits) {
        maxHits = hits;
        dominantHook = type;
      }
    });

    // 5. Echo Drift (Mock for now as we don't query history synchronously easily in loop)
    // We'll calculate this properly when saving.
    const echoDrift = 0.5; // Placeholder

    const influence = (emotionalPressure * 0.6) + (fixation * 0.4);

    return {
      emotionalPressure,
      fixation,
      distortion,
      echoDrift,
      influence,
      dominantHook
    };
  }

  function generateInterpretation(metrics) {
    const { influence, distortion, dominantHook } = metrics;
    const hookClean = dominantHook.replace('_', ' ');

    if (influence > 0.7 && distortion > 0.7) {
      return `Strong ${hookClean} hook and certainty tone — this content is overriding your critical filter.`;
    }
    if (influence > 0.7) {
      return `High emotional engagement with ${hookClean} themes — you are fixating on this pattern.`;
    }
    if (distortion > 0.7) {
      return `Absolute framing detected — this content demands total agreement without nuance.`;
    }
    if (influence < 0.3) {
      return `Low resonance — this content did not significantly alter your state.`;
    }
    return `Moderate framing pressure — this content has a balanced influence profile.`;
  }

  // --- UI INJECTION ---
  function injectUI() {
    if (document.getElementById('boundier-scan-btn')) return;

    // Scan Button
    const btn = document.createElement('button');
    btn.id = 'boundier-scan-btn';
    btn.textContent = 'Scan';
    btn.addEventListener('click', performActiveScan);
    document.body.appendChild(btn);

    // Overlay
    const overlay = document.createElement('div');
    overlay.id = 'boundier-overlay';
    overlay.innerHTML = `
      <div class="boundier-header">
        <div>
          <div class="boundier-title"><span class="boundier-blue">[</span>boundier<span class="boundier-blue">_</span></div>
          <div class="boundier-subtitle">Current Influence Snapshot</div>
        </div>
        <button class="boundier-close">×</button>
      </div>
      
      <div class="boundier-metric">
        <div class="boundier-metric-header">
          <span class="boundier-label">INFLUENCE</span>
          <span class="boundier-value" id="b-influence-val">0</span>
        </div>
        <div class="boundier-bar-bg">
          <div class="boundier-bar-fill" id="b-influence-bar"></div>
        </div>
      </div>

      <div class="boundier-secondary-metrics">
        <div class="boundier-mini-metric">
          <div class="boundier-label">DISTORTION</div>
          <div class="boundier-value" id="b-distortion-val">0</div>
          <div class="boundier-bar-bg">
            <div class="boundier-bar-fill" id="b-distortion-bar"></div>
          </div>
        </div>
        <div class="boundier-mini-metric">
          <div class="boundier-label">ECHO DRIFT</div>
          <div class="boundier-value" id="b-drift-val">0</div>
          <div class="boundier-bar-bg">
            <div class="boundier-bar-fill" id="b-drift-bar"></div>
          </div>
        </div>
      </div>

      <div class="boundier-interpretation" id="b-interpretation">
        Analyzing...
      </div>
      <div id="b-tags" style="margin-top: 8px;"></div>
    `;
    document.body.appendChild(overlay);

    overlay.querySelector('.boundier-close').addEventListener('click', () => {
      overlay.classList.remove('open');
    });
  }

  function showScanButton() {
    const btn = document.getElementById('boundier-scan-btn');
    if (btn) btn.classList.add('visible');
    state.scanButtonVisible = true;
  }

  function hideScanButton() {
    const btn = document.getElementById('boundier-scan-btn');
    if (btn) btn.classList.remove('visible');
    state.scanButtonVisible = false;
  }

  function updateOverlay(metrics) {
    document.getElementById('b-influence-val').textContent = Math.round(metrics.influence * 100);
    document.getElementById('b-influence-bar').style.width = `${metrics.influence * 100}%`;
    
    document.getElementById('b-distortion-val').textContent = Math.round(metrics.distortion * 100);
    document.getElementById('b-distortion-bar').style.width = `${metrics.distortion * 100}%`;
    
    document.getElementById('b-drift-val').textContent = Math.round(metrics.echoDrift * 100);
    document.getElementById('b-drift-bar').style.width = `${metrics.echoDrift * 100}%`;
    
    const interpretation = generateInterpretation(metrics);
    document.getElementById('b-interpretation').textContent = interpretation;

    const tagsContainer = document.getElementById('b-tags');
    tagsContainer.innerHTML = `<span class="boundier-hook-tag">${metrics.dominantHook.replace('_', ' ')}</span>`;
  }

  // --- CORE LOOP ---
  function performActiveScan() {
    const text = extractVisibleText();
    const dwell = (Date.now() - state.startTime) / 1000;
    const metrics = analyze(text, dwell, state.scrollBacks);

    // Calculate Echo Drift from history
    chrome.storage.local.get(['boundier_scans'], (result) => {
      const history = result.boundier_scans || [];
      
      // Echo Drift Logic: Count how many of last 7 scans share same hook
      const lastN = history.slice(0, 7);
      const sameHookCount = lastN.filter(s => s.dominantHook === metrics.dominantHook).length;
      metrics.echoDrift = Math.min(sameHookCount / 7, 1);

      // Update Overlay
      updateOverlay(metrics);
      document.getElementById('boundier-overlay').classList.add('open');
      hideScanButton();

      // Save Result
      const scanRecord = {
        id: Date.now().toString(),
        timestamp: Date.now(),
        ...metrics,
        interpretation: generateInterpretation(metrics)
      };
      
      const newHistory = [scanRecord, ...history].slice(0, 10); // Keep last 10
      chrome.storage.local.set({ boundier_scans: newHistory });
    });
  }

  // --- PASSIVE SENSING ---
  function checkPassiveTriggers() {
    if (state.scanButtonVisible || state.hasScannedCurrentPage) return;

    const dwell = (Date.now() - state.startTime) / 1000;
    
    // Only run expensive text extraction if dwell time is sufficient
    if (dwell > CONFIG.DWELL_TRIGGER / 1000) {
      const text = extractVisibleText();
      const metrics = analyze(text, dwell, state.scrollBacks);
      
      if (metrics.emotionalPressure >= CONFIG.PRESSURE_THRESHOLD && 
          metrics.fixation >= CONFIG.FIXATION_THRESHOLD) {
        showScanButton();
      }
    }
  }

  // --- EVENT LISTENERS ---
  window.addEventListener('scroll', () => {
    const currentScroll = window.scrollY;
    if (currentScroll < state.lastScrollY - 50) {
      state.scrollBacks++;
    }
    state.lastScrollY = currentScroll;
  });

  // Reset dwell timer on major navigation (SPA support heuristic)
  let lastUrl = location.href; 
  new MutationObserver(() => {
    if (location.href !== lastUrl) {
      lastUrl = location.href;
      state.startTime = Date.now();
      state.dwellTime = 0;
      state.scrollBacks = 0;
      hideScanButton();
    }
  }).observe(document, {subtree: true, childList: true});

  // Init
  injectUI();
  setInterval(checkPassiveTriggers, 2000); // Check every 2s

})();
