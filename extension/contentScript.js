// Boundier - Content Script
// Handles text extraction, analysis, and UI injection.

(function() {
  // --- CONFIG ---
  const CONFIG = {
    DWELL_TRIGGER: 5000, // 5 seconds
    FIXATION_CAP: 60, // 60 seconds max for normalization
    PRESSURE_THRESHOLD: 0.6,
    FIXATION_THRESHOLD: 0.6,
    MIN_TEXT_LENGTH: 30 // Minimum text length to analyze
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
    "pathetic", "owned", "ratioed", "canceled", "calling out", "vs", "annihilated",
    "devastated", "explosive", "outrageous", "terrifying", "horrifying"
  ];

  const CERTAINTY_PHRASES = [
    "everyone knows", "the truth is", "this proves", "no one talks about", 
    "what they don't tell you", "wake up", "no debate", "obviously", "undeniable",
    "always", "never", "everyone", "no one", "all of them", "fact is", "guaranteed",
    "absolutely", "definitely", "without a doubt"
  ];

  const HEDGING_WORDS = [
    "maybe", "possibly", "might", "could", "likely", "perhaps", "seems",
    "appears", "suggests", "may", "probably", "potentially"
  ];

  const HOOK_TYPES = {
    outrage: ["insane", "betrayal", "destroyed", "disaster", "nightmare", "outrageous", "disgrace"],
    fear: ["shocking", "warning", "collapse", "danger", "terrifying", "threat", "crisis"],
    identity_validation: ["truth", "real", "finally", "us", "them", "woke", "they", "proven"],
    hype: ["game changer", "huge", "massive", "revolutionary", "breakthrough", "incredible"],
    drama: ["exposed", "pathetic", "humiliated", "beef", "feud", "controversy"],
    cynicism: ["scam", "fake", "lies", "propaganda", "sheep", "blind", "fooled"],
    hope: ["saving", "future", "better", "solution", "win", "triumph", "breakthrough"]
  };

  // --- DOM EXTRACTION ---
  function extractVisibleText() {
    let text = "";
    
    // Strategy 1: Try to find main content area (articles, posts, threads)
    const contentSelectors = [
      'article',
      '[role="article"]',
      'main',
      '[data-testid="tweet"]',
      '.post-content',
      '.comment-body',
      '[data-type="post"]'
    ];
    
    let mainContent = null;
    for (const selector of contentSelectors) {
      const elements = document.querySelectorAll(selector);
      if (elements.length > 0) {
        elements.forEach(el => {
          if (isVisible(el)) {
            text += extractTextFromElement(el) + " ";
          }
        });
        if (text.trim().length > 100) {
          return text;
        }
      }
    }
    
    // Strategy 2: Fallback to body traversal
    text = extractTextFromElement(document.body);
    return text;
  }

  function isVisible(element) {
    if (!element) return false;
    const style = window.getComputedStyle(element);
    return style.display !== 'none' && 
           style.visibility !== 'hidden' && 
           style.opacity !== '0' &&
           element.offsetHeight > 0 &&
           element.offsetWidth > 0;
  }

  function extractTextFromElement(element) {
    const walker = document.createTreeWalker(
      element,
      NodeFilter.SHOW_TEXT,
      {
        acceptNode: function(node) {
          const parent = node.parentNode;
          if (!parent) return NodeFilter.FILTER_REJECT;
          
          const tag = parent.tagName?.toLowerCase() || '';
          if (['script', 'style', 'noscript', 'iframe', 'input', 'textarea', 
               'select', 'button', 'nav', 'header', 'footer'].includes(tag)) {
            return NodeFilter.FILTER_REJECT;
          }
          
          if (!isVisible(parent)) {
            return NodeFilter.FILTER_REJECT;
          }

          return NodeFilter.FILTER_ACCEPT;
        }
      }
    );

    let text = "";
    while (walker.nextNode()) {
      const nodeText = walker.currentNode.nodeValue?.trim() || "";
      if (nodeText.length > 0) {
        text += nodeText + " ";
      }
    }
    return text;
  }

  // --- ANALYSIS ENGINE ---
  function analyze(text, dwellSeconds, scrollBacks) {
    // Input validation
    if (!text || text.trim().length < CONFIG.MIN_TEXT_LENGTH) {
      return {
        emotionalPressure: 0,
        fixation: 0,
        distortion: 0,
        echoDrift: 0,
        influence: 0,
        dominantHook: "generic"
      };
    }

    const lowerText = text.toLowerCase();
    const words = lowerText.split(/\s+/).filter(w => w.length > 0);
    const textLengthFactor = Math.max(words.length, 50);

    // 1. Emotional Pressure
    let emotionHits = 0;
    EMOTIONAL_WORDS.forEach(word => {
      const regex = new RegExp('\\b' + word + '\\b', 'gi');
      const matches = text.match(regex);
      if (matches) emotionHits += matches.length;
    });

    const exclamationHits = (text.match(/!/g) || []).length;
    const capsHits = text.split(/\s+/).filter(w => 
      w.length >= 3 && w === w.toUpperCase() && /[A-Z]/.test(w)
    ).length;

    // Recalibrated formula - less generous
    const emotionalPressureRaw = (emotionHits * 2 + capsHits * 1.5 + exclamationHits * 0.3) / (textLengthFactor * 0.08);
    const emotionalPressure = Math.min(Math.max(emotionalPressureRaw, 0), 1);

    // 2. Fixation - Recalibrated to be less generous
    // Now requires 20+ seconds for meaningful fixation
    const baseFixation = Math.min(Math.max((dwellSeconds - 10) / CONFIG.FIXATION_CAP, 0), 1);
    
    // Scroll backs are now less influential
    const scrollBackBonus = Math.min(scrollBacks * 0.03, 0.15); // Max 15% bonus
    const pauseBonus = dwellSeconds > 15 ? 0.05 : 0; // Small bonus for pausing
    
    const fixation = Math.min(Math.max(baseFixation + scrollBackBonus + pauseBonus, 0), 1);

    // 3. Distortion
    let certaintyHits = 0;
    CERTAINTY_PHRASES.forEach(phrase => {
      const regex = new RegExp(phrase, 'gi');
      const matches = text.match(regex);
      if (matches) certaintyHits += matches.length;
    });
    
    let hedgeHits = 0;
    HEDGING_WORDS.forEach(word => {
      const regex = new RegExp('\\b' + word + '\\b', 'gi');
      const matches = text.match(regex);
      if (matches) hedgeHits += matches.length;
    });

    const distortionRaw = (certaintyHits * 2.5) - (hedgeHits * 0.7);
    const distortion = Math.min(Math.max(distortionRaw / 5, 0), 1);

    // 4. Dominant Hook - Improved fallback logic
    let maxHits = 0;
    let dominantHook = "generic";
    
    Object.entries(HOOK_TYPES).forEach(([type, keywords]) => {
      let hits = 0;
      keywords.forEach(k => {
        const regex = new RegExp('\\b' + k + '\\b', 'gi');
        const matches = text.match(regex);
        if (matches) hits += matches.length;
      });
      if (hits > maxHits) {
        maxHits = hits;
        dominantHook = type;
      }
    });

    // Better fallback heuristics
    if (maxHits === 0) {
      if (emotionalPressure > 0.7) dominantHook = "outrage";
      else if (distortion > 0.7) dominantHook = "identity_validation";
      else if (exclamationHits > 3) dominantHook = "hype";
      // Remove the silly length check
    }

    const influence = (emotionalPressure * 0.6) + (fixation * 0.4);

    return {
      emotionalPressure,
      fixation,
      distortion,
      echoDrift: 0, // Will be calculated from history
      influence,
      dominantHook
    };
  }

  function generateInterpretation(metrics) {
    const { influence, distortion, echoDrift, dominantHook } = metrics;
    const hookClean = dominantHook.replace(/_/g, ' ');

    if (influence > 0.7 && distortion > 0.7) {
      return `Strong ${hookClean} hook and certainty tone — this content is overriding your critical filter.`;
    }
    if (echoDrift > 0.6) {
      return `Repeated exposure to ${hookClean} triggers — your baseline response is drifting toward this pattern.`;
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
    return `Moderate framing pressure with ${hookClean} elements — this content has a balanced influence profile.`;
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
    tagsContainer.innerHTML = `<span class="boundier-hook-tag">${metrics.dominantHook.replace(/_/g, ' ')}</span>`;
  }

  // --- CORE SCAN LOGIC ---
  function performActiveScan() {
    const text = extractVisibleText();
    const dwell = (Date.now() - state.startTime) / 1000;
    const metrics = analyze(text, dwell, state.scrollBacks);

    // Calculate REAL Echo Drift from history
    chrome.storage.local.get(['boundier_scans'], (result) => {
      const history = result.boundier_scans || [];
      
      // Echo Drift Logic: Count how many of last 7 scans share same hook
      const lastN = history.slice(0, 7);
      const sameHookCount = lastN.filter(s => s.dominantHook === metrics.dominantHook).length;
      metrics.echoDrift = lastN.length > 0 ? Math.min(sameHookCount / Math.max(lastN.length, 1), 1) : 0;

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
      
      state.hasScannedCurrentPage = true;
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
    // Only count as scroll back if it's a significant upward movement
    if (currentScroll < state.lastScrollY - 100) {
      state.scrollBacks++;
    }
    state.lastScrollY = currentScroll;
  });

  // Reset dwell timer on major navigation (SPA support)
  let lastUrl = location.href; 
  new MutationObserver(() => {
    if (location.href !== lastUrl) {
      lastUrl = location.href;
      state.startTime = Date.now();
      state.dwellTime = 0;
      state.scrollBacks = 0;
      state.hasScannedCurrentPage = false;
      hideScanButton();
    }
  }).observe(document, {subtree: true, childList: true});

  // Init
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', injectUI);
  } else {
    injectUI();
  }
  
  setInterval(checkPassiveTriggers, 2000); // Check every 2s

})();
