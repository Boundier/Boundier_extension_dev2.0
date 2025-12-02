// Boundier - Content Script
// Handles text extraction, analysis, and UI injection.
// Runs on ALL websites

(function() {
  'use strict';

  // Prevent double injection
  if (window.__boundierInjected) return;
  window.__boundierInjected = true;

  console.log('[Boundier] Content script loaded on:', window.location.href);

  // --- CONFIG ---
  const CONFIG = {
    DWELL_TRIGGER: 3000, // 3 seconds - lowered for responsiveness
    FIXATION_CAP: 60,
    PRESSURE_THRESHOLD: 0.3, // Lowered for easier triggering
    FIXATION_THRESHOLD: 0.2, // Lowered for easier triggering
    MIN_TEXT_LENGTH: 30,
    SCAN_INTERVAL: 2000 // Check every 2 seconds
  };

  // --- STATE ---
  let state = {
    startTime: Date.now(),
    lastScrollY: window.scrollY,
    scrollBacks: 0,
    scanButtonVisible: false,
    hasScannedCurrentPage: false,
    uiInjected: false
  };

  // --- HEURISTICS ---
  const EMOTIONAL_WORDS = [
    "insane", "destroyed", "humiliated", "crushed", "disaster", "exposed", 
    "shocking", "brutal", "nightmare", "betrayal", "dominated", "obliterated", 
    "pathetic", "owned", "ratioed", "canceled", "calling out", "vs", "annihilated",
    "devastated", "explosive", "outrageous", "terrifying", "horrifying", "breaking",
    "urgent", "crisis", "chaos", "fury", "rage", "outrage", "scandal", "bombshell",
    "slammed", "blasts", "rips", "destroys", "obliterates", "eviscerates"
  ];

  const CERTAINTY_PHRASES = [
    "everyone knows", "the truth is", "this proves", "no one talks about", 
    "what they don't tell you", "wake up", "no debate", "obviously", "undeniable",
    "always", "never", "everyone", "no one", "all of them", "fact is", "guaranteed",
    "absolutely", "definitely", "without a doubt", "100%", "totally", "completely",
    "unquestionably", "clearly"
  ];

  const HEDGING_WORDS = [
    "maybe", "possibly", "might", "could", "likely", "perhaps", "seems",
    "appears", "suggests", "may", "probably", "potentially", "reportedly"
  ];

  const HOOK_TYPES = {
    outrage: ["insane", "betrayal", "destroyed", "disaster", "nightmare", "outrageous", "disgrace", "scandal", "slammed"],
    fear: ["shocking", "warning", "collapse", "danger", "terrifying", "threat", "crisis", "breaking", "urgent"],
    identity_validation: ["truth", "real", "finally", "us", "them", "woke", "they", "proven", "exposed"],
    hype: ["game changer", "huge", "massive", "revolutionary", "breakthrough", "incredible", "amazing"],
    drama: ["exposed", "pathetic", "humiliated", "beef", "feud", "controversy", "drama", "rips"],
    cynicism: ["scam", "fake", "lies", "propaganda", "sheep", "blind", "fooled", "corrupt"],
    hope: ["saving", "future", "better", "solution", "win", "triumph", "breakthrough", "success"]
  };

  // --- TEXT EXTRACTION ---
  function extractVisibleText() {
    let text = "";
    
    // Site-specific selectors for better extraction
    const siteSelectors = {
      'x.com': ['[data-testid="tweetText"]', '[data-testid="tweet"]', 'article'],
      'twitter.com': ['[data-testid="tweetText"]', '[data-testid="tweet"]', 'article'],
      'reddit.com': ['.Post', '.Comment', '[data-testid="post-container"]', '.RichTextJSON-root', 'article'],
      'default': [
        'article', 
        '[role="article"]', 
        'main article',
        '.article-content', 
        '.post-content',
        '.entry-content',
        '.story-body',
        '.article-body',
        '.content-body',
        'main'
      ]
    };
    
    // Get host-specific selectors
    const host = window.location.hostname.replace('www.', '');
    const selectors = siteSelectors[host] || siteSelectors['default'];
    
    // Try each selector
    for (const selector of selectors) {
      try {
        const elements = document.querySelectorAll(selector);
        if (elements.length > 0) {
          elements.forEach(el => {
            if (isVisible(el)) {
              const elText = (el.innerText || el.textContent || '').trim();
              if (elText.length > 20) {
                text += elText + " ";
              }
            }
          });
        }
      } catch (e) {
        console.warn('[Boundier] Selector failed:', selector);
      }
    }
    
    // If we found substantial content, return it
    if (text.trim().length > 100) {
      return cleanText(text);
    }
    
    // Fallback: Get all paragraphs and headings
    try {
      const fallbackElements = document.querySelectorAll('p, h1, h2, h3, h4, h5, h6');
      fallbackElements.forEach(el => {
        if (isVisible(el)) {
          const elText = (el.innerText || el.textContent || '').trim();
          if (elText.length > 10) {
            text += elText + " ";
          }
        }
      });
    } catch (e) {}
    
    // Last resort: body innerText
    if (text.trim().length < 100) {
      try {
        text = document.body.innerText || document.body.textContent || '';
      } catch (e) {
        text = '';
      }
    }
    
    return cleanText(text);
  }

  function cleanText(text) {
    // Remove excessive whitespace and dedupe
    return text
      .replace(/\s+/g, ' ')
      .replace(/(.)\1{5,}/g, '$1$1$1') // Remove repeated characters
      .trim()
      .substring(0, 10000); // Cap at 10k chars for performance
  }

  function isVisible(element) {
    if (!element) return false;
    try {
      const rect = element.getBoundingClientRect();
      if (rect.height === 0 || rect.width === 0) return false;
      
      const style = window.getComputedStyle(element);
      return style.display !== 'none' && 
             style.visibility !== 'hidden' && 
             style.opacity !== '0';
    } catch (e) {
      return true;
    }
  }

  // --- ANALYSIS ENGINE ---
  function analyze(text, dwellSeconds, scrollBacks) {
    // Input validation - bail early for garbage
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
    const wordCount = words.length;
    const textLengthFactor = Math.max(wordCount, 50);

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

    // Calibrated formula - normalized per 100 words
    const wordsNorm = wordCount / 100;
    const emotionalPressureRaw = (emotionHits * 3 + capsHits * 2 + exclamationHits * 0.5) / Math.max(wordsNorm * 10, 1);
    const emotionalPressure = Math.min(Math.max(emotionalPressureRaw, 0), 1);

    // 2. Fixation - Time-based with scroll awareness
    const effectiveDwell = Math.max(dwellSeconds - 3, 0); // Grace period of 3 seconds
    const baseFixation = Math.min(effectiveDwell / CONFIG.FIXATION_CAP, 0.8);
    const scrollBackBonus = Math.min(scrollBacks * 0.03, 0.1);
    const pauseBonus = dwellSeconds > 8 ? 0.1 : 0;
    const fixation = Math.min(Math.max(baseFixation + scrollBackBonus + pauseBonus, 0), 1);

    // 3. Distortion
    let certaintyHits = 0;
    CERTAINTY_PHRASES.forEach(phrase => {
      if (lowerText.includes(phrase)) certaintyHits++;
    });
    
    let hedgeHits = 0;
    HEDGING_WORDS.forEach(word => {
      if (lowerText.includes(word)) hedgeHits++;
    });

    const distortionRaw = (certaintyHits * 3) - (hedgeHits * 0.8);
    const distortion = Math.min(Math.max(distortionRaw / 6, 0), 1);

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

    // Fallback heuristics
    if (maxHits === 0) {
      if (emotionalPressure > 0.5) dominantHook = "outrage";
      else if (distortion > 0.5) dominantHook = "identity_validation";
      else if (exclamationHits > 3) dominantHook = "hype";
    }

    const influence = (emotionalPressure * 0.6) + (fixation * 0.4);

    return {
      emotionalPressure,
      fixation,
      distortion,
      echoDrift: 0, // Calculated from history in performActiveScan
      influence,
      dominantHook
    };
  }

  function generateInterpretation(metrics) {
    const { influence, distortion, echoDrift, dominantHook } = metrics;
    const hookClean = (dominantHook || 'generic').replace(/_/g, ' ');

    if (influence > 0.7 && distortion > 0.7) {
      return `Strong ${hookClean} hook and certainty tone — this content is overriding your critical filter.`;
    }
    if (echoDrift > 0.5) {
      return `Repeated exposure to ${hookClean} triggers — your baseline response is drifting toward this pattern.`;
    }
    if (influence > 0.6) {
      return `High emotional engagement with ${hookClean} themes — you are fixating on this pattern.`;
    }
    if (distortion > 0.6) {
      return `Absolute framing detected — this content demands total agreement without nuance.`;
    }
    if (influence < 0.2) {
      return `Low resonance — this content did not significantly alter your state.`;
    }
    return `Moderate framing pressure with ${hookClean} elements — this content has a balanced influence profile.`;
  }

  // --- CSS INJECTION ---
  function injectStyles() {
    if (document.getElementById('boundier-injected-styles')) return;
    
    const style = document.createElement('style');
    style.id = 'boundier-injected-styles';
    style.textContent = `
      #boundier-scan-btn {
        position: fixed !important;
        right: 16px !important;
        top: 50% !important;
        transform: translateY(-50%) !important;
        z-index: 2147483646 !important;
        background: rgba(0, 56, 255, 0.6) !important;
        border: 1px solid rgba(255, 255, 255, 0.3) !important;
        border-radius: 8px !important;
        padding: 14px 10px !important;
        color: white !important;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
        font-weight: bold !important;
        font-size: 11px !important;
        text-transform: uppercase !important;
        letter-spacing: 1.5px !important;
        writing-mode: vertical-rl !important;
        cursor: pointer !important;
        box-shadow: 0 0 20px rgba(0, 56, 255, 0.6) !important;
        transition: all 0.3s ease !important;
        backdrop-filter: blur(8px) !important;
        -webkit-backdrop-filter: blur(8px) !important;
        opacity: 0 !important;
        pointer-events: none !important;
      }
      
      #boundier-scan-btn.visible {
        opacity: 1 !important;
        pointer-events: auto !important;
        animation: boundier-glow 2s ease-in-out infinite !important;
      }
      
      @keyframes boundier-glow {
        0%, 100% { 
          box-shadow: 0 0 20px rgba(0, 56, 255, 0.6);
          transform: translateY(-50%) scale(1);
        }
        50% { 
          box-shadow: 0 0 35px rgba(0, 56, 255, 0.9);
          transform: translateY(-50%) scale(1.02);
        }
      }
      
      #boundier-scan-btn:hover {
        background: rgba(0, 56, 255, 0.8) !important;
        box-shadow: 0 0 40px rgba(0, 56, 255, 1) !important;
        transform: translateY(-50%) scale(1.05) !important;
      }
      
      #boundier-scan-btn:active {
        transform: translateY(-50%) scale(0.98) !important;
      }
      
      #boundier-overlay {
        position: fixed !important;
        top: 0 !important;
        right: 0 !important;
        height: 100vh !important;
        width: 340px !important;
        z-index: 2147483647 !important;
        background: rgba(0, 5, 67, 0.97) !important;
        backdrop-filter: blur(20px) !important;
        -webkit-backdrop-filter: blur(20px) !important;
        border-left: 1px solid rgba(255, 255, 255, 0.15) !important;
        box-shadow: -8px 0 40px rgba(0, 0, 0, 0.5) !important;
        color: white !important;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
        transform: translateX(100%) !important;
        transition: transform 300ms cubic-bezier(0.25, 0.8, 0.25, 1) !important;
        display: flex !important;
        flex-direction: column !important;
        padding: 28px !important;
        box-sizing: border-box !important;
        overflow-y: auto !important;
      }
      
      #boundier-overlay.open {
        transform: translateX(0) !important;
      }
      
      .boundier-header {
        display: flex !important;
        justify-content: space-between !important;
        align-items: flex-start !important;
        margin-bottom: 36px !important;
      }
      
      .boundier-title {
        font-size: 26px !important;
        font-weight: 800 !important;
        letter-spacing: -0.02em !important;
        color: white !important;
      }
      
      .boundier-blue {
        color: #0038FF !important;
      }
      
      .boundier-subtitle {
        font-size: 10px !important;
        text-transform: uppercase !important;
        letter-spacing: 0.15em !important;
        opacity: 0.5 !important;
        margin-top: 6px !important;
        color: white !important;
      }
      
      .boundier-close {
        background: rgba(255,255,255,0.1) !important;
        border: none !important;
        color: white !important;
        cursor: pointer !important;
        font-size: 22px !important;
        padding: 0 !important;
        line-height: 1 !important;
        width: 36px !important;
        height: 36px !important;
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
        border-radius: 8px !important;
        transition: background 0.2s !important;
      }
      
      .boundier-close:hover {
        background: rgba(255, 255, 255, 0.2) !important;
      }
      
      .boundier-metric {
        margin-bottom: 28px !important;
      }
      
      .boundier-metric-header {
        display: flex !important;
        justify-content: space-between !important;
        align-items: flex-end !important;
        margin-bottom: 10px !important;
      }
      
      .boundier-label {
        font-size: 11px !important;
        font-weight: 600 !important;
        letter-spacing: 0.1em !important;
        opacity: 0.7 !important;
        color: white !important;
        text-transform: uppercase !important;
      }
      
      .boundier-value {
        font-size: 42px !important;
        font-weight: 200 !important;
        color: #0038FF !important;
        line-height: 1 !important;
      }
      
      .boundier-bar-bg {
        width: 100% !important;
        height: 8px !important;
        background: rgba(255, 255, 255, 0.1) !important;
        border-radius: 4px !important;
        overflow: hidden !important;
      }
      
      .boundier-bar-fill {
        height: 100% !important;
        background: linear-gradient(90deg, #0038FF, #0066FF) !important;
        width: 0% !important;
        transition: width 1s cubic-bezier(0.25, 0.8, 0.25, 1) !important;
        box-shadow: 0 0 12px #0038FF !important;
        border-radius: 4px !important;
      }
      
      .boundier-secondary-metrics {
        display: grid !important;
        grid-template-columns: 1fr 1fr !important;
        gap: 20px !important;
        padding-top: 20px !important;
        border-top: 1px solid rgba(255, 255, 255, 0.1) !important;
        margin-top: 8px !important;
      }
      
      .boundier-mini-metric .boundier-label {
        font-size: 9px !important;
        text-transform: uppercase !important;
        letter-spacing: 0.08em !important;
        opacity: 0.5 !important;
      }
      
      .boundier-mini-metric .boundier-value {
        font-size: 28px !important;
        color: white !important;
        margin: 6px 0 !important;
      }
      
      .boundier-mini-metric .boundier-bar-bg {
        height: 4px !important;
      }
      
      .boundier-mini-metric .boundier-bar-fill {
        background: rgba(255, 255, 255, 0.7) !important;
        box-shadow: none !important;
      }
      
      .boundier-interpretation {
        margin-top: 28px !important;
        padding: 18px !important;
        background: rgba(255, 255, 255, 0.05) !important;
        border: 1px solid rgba(255, 255, 255, 0.08) !important;
        border-radius: 12px !important;
        font-size: 14px !important;
        line-height: 1.6 !important;
        font-weight: 400 !important;
        color: rgba(255, 255, 255, 0.9) !important;
      }
      
      .boundier-hook-tag {
        display: inline-block !important;
        margin-top: 14px !important;
        padding: 6px 12px !important;
        background: rgba(0, 56, 255, 0.2) !important;
        border: 1px solid rgba(0, 56, 255, 0.4) !important;
        color: #4D8DFF !important;
        border-radius: 6px !important;
        font-size: 10px !important;
        text-transform: uppercase !important;
        letter-spacing: 0.08em !important;
        font-weight: 600 !important;
      }
    `;
    
    (document.head || document.documentElement).appendChild(style);
    console.log('[Boundier] Styles injected');
  }

  // --- UI INJECTION ---
  function injectUI() {
    if (state.uiInjected) return;
    
    injectStyles();
    console.log('[Boundier] Injecting UI elements');

    // Scan Button
    const btn = document.createElement('button');
    btn.id = 'boundier-scan-btn';
    btn.textContent = 'Scan';
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      performActiveScan();
    });
    
    // Overlay Panel
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
          <span class="boundier-label">Influence</span>
          <span class="boundier-value" id="b-influence-val">0</span>
        </div>
        <div class="boundier-bar-bg">
          <div class="boundier-bar-fill" id="b-influence-bar"></div>
        </div>
      </div>

      <div class="boundier-secondary-metrics">
        <div class="boundier-mini-metric">
          <div class="boundier-label">Distortion</div>
          <div class="boundier-value" id="b-distortion-val">0</div>
          <div class="boundier-bar-bg">
            <div class="boundier-bar-fill" id="b-distortion-bar"></div>
          </div>
        </div>
        <div class="boundier-mini-metric">
          <div class="boundier-label">Echo Drift</div>
          <div class="boundier-value" id="b-drift-val">0</div>
          <div class="boundier-bar-bg">
            <div class="boundier-bar-fill" id="b-drift-bar"></div>
          </div>
        </div>
      </div>

      <div class="boundier-interpretation" id="b-interpretation">
        Analyzing content...
      </div>
      <div id="b-tags"></div>
    `;

    // Append to body
    document.body.appendChild(btn);
    document.body.appendChild(overlay);

    // Close button handler
    overlay.querySelector('.boundier-close').addEventListener('click', () => {
      overlay.classList.remove('open');
    });
    
    // Click outside to close
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        overlay.classList.remove('open');
      }
    });
    
    state.uiInjected = true;
    console.log('[Boundier] UI injection complete');
  }

  function showScanButton() {
    const btn = document.getElementById('boundier-scan-btn');
    if (btn && !state.scanButtonVisible) {
      btn.classList.add('visible');
      state.scanButtonVisible = true;
      console.log('[Boundier] Scan button now VISIBLE');
    }
  }

  function hideScanButton() {
    const btn = document.getElementById('boundier-scan-btn');
    if (btn) {
      btn.classList.remove('visible');
      state.scanButtonVisible = false;
    }
  }

  function updateOverlay(metrics) {
    const setValue = (id, value) => {
      const el = document.getElementById(id);
      if (el) el.textContent = value;
    };
    
    const setBar = (id, percent) => {
      const el = document.getElementById(id);
      if (el) el.style.width = `${percent}%`;
    };
    
    setValue('b-influence-val', Math.round(metrics.influence * 100));
    setBar('b-influence-bar', metrics.influence * 100);
    
    setValue('b-distortion-val', Math.round(metrics.distortion * 100));
    setBar('b-distortion-bar', metrics.distortion * 100);
    
    setValue('b-drift-val', Math.round(metrics.echoDrift * 100));
    setBar('b-drift-bar', metrics.echoDrift * 100);
    
    const interpretation = document.getElementById('b-interpretation');
    if (interpretation) {
      interpretation.textContent = generateInterpretation(metrics);
    }
    
    const tags = document.getElementById('b-tags');
    if (tags) {
      tags.innerHTML = `<span class="boundier-hook-tag">${(metrics.dominantHook || 'generic').replace(/_/g, ' ')}</span>`;
    }
  }

  // --- CORE SCAN LOGIC ---
  function performActiveScan() {
    console.log('[Boundier] Performing active scan...');
    
    const text = extractVisibleText();
    console.log('[Boundier] Extracted text length:', text.length, 'chars');
    
    const dwell = (Date.now() - state.startTime) / 1000;
    const metrics = analyze(text, dwell, state.scrollBacks);
    console.log('[Boundier] Raw metrics:', metrics);

    // Get history and calculate REAL Echo Drift
    chrome.storage.local.get(['boundier_scans'], (result) => {
      const history = result.boundier_scans || [];
      console.log('[Boundier] History length:', history.length);
      
      // REAL Echo Drift: % of last N scans with same dominantHook
      if (history.length > 0) {
        const lastN = history.slice(0, 7);
        const sameHookCount = lastN.filter(s => s.dominantHook === metrics.dominantHook).length;
        metrics.echoDrift = sameHookCount / lastN.length;
        console.log('[Boundier] Echo Drift calculated:', metrics.echoDrift, 
                    '(' + sameHookCount + '/' + lastN.length + ' matching "' + metrics.dominantHook + '")');
      } else {
        metrics.echoDrift = 0;
      }

      // Update UI
      updateOverlay(metrics);
      
      const overlay = document.getElementById('boundier-overlay');
      if (overlay) {
        overlay.classList.add('open');
        console.log('[Boundier] Overlay opened');
      }
      
      hideScanButton();

      // Save to history
      const scanRecord = {
        id: Date.now().toString(),
        timestamp: Date.now(),
        influence: metrics.influence,
        distortion: metrics.distortion,
        echoDrift: metrics.echoDrift,
        emotionalPressure: metrics.emotionalPressure,
        fixation: metrics.fixation,
        dominantHook: metrics.dominantHook,
        interpretation: generateInterpretation(metrics),
        url: window.location.hostname
      };
      
      const newHistory = [scanRecord, ...history].slice(0, 20); // Keep last 20
      chrome.storage.local.set({ boundier_scans: newHistory }, () => {
        console.log('[Boundier] Scan saved to history');
      });
      
      state.hasScannedCurrentPage = true;
    });
  }

  // --- PASSIVE SENSING ---
  function checkPassiveTriggers() {
    // Don't trigger if already scanning or scanned
    if (state.scanButtonVisible || state.hasScannedCurrentPage) return;
    
    // Ensure UI is injected
    if (!state.uiInjected) {
      injectUI();
    }

    const dwell = (Date.now() - state.startTime) / 1000;
    
    // Only analyze after minimum dwell time
    if (dwell >= CONFIG.DWELL_TRIGGER / 1000) {
      const text = extractVisibleText();
      
      if (text.length < CONFIG.MIN_TEXT_LENGTH) {
        console.log('[Boundier] Text too short:', text.length);
        return;
      }
      
      const metrics = analyze(text, dwell, state.scrollBacks);
      
      console.log('[Boundier] Passive check - EP:', metrics.emotionalPressure.toFixed(2), 
                  'Fix:', metrics.fixation.toFixed(2),
                  'Thresholds - EP:', CONFIG.PRESSURE_THRESHOLD, 'Fix:', CONFIG.FIXATION_THRESHOLD);
      
      // Check if thresholds are met
      if (metrics.emotionalPressure >= CONFIG.PRESSURE_THRESHOLD || 
          metrics.fixation >= CONFIG.FIXATION_THRESHOLD) {
        showScanButton();
      }
    }
  }

  // --- EVENT LISTENERS ---
  window.addEventListener('scroll', () => {
    const currentScroll = window.scrollY;
    // Count significant scroll-backs
    if (currentScroll < state.lastScrollY - 150) {
      state.scrollBacks++;
    }
    state.lastScrollY = currentScroll;
  }, { passive: true });

  // Reset on SPA navigation
  let lastUrl = location.href; 
  const urlObserver = new MutationObserver(() => {
    if (location.href !== lastUrl) {
      console.log('[Boundier] URL changed from', lastUrl, 'to', location.href);
      lastUrl = location.href;
      state.startTime = Date.now();
      state.scrollBacks = 0;
      state.hasScannedCurrentPage = false;
      state.scanButtonVisible = false;
      hideScanButton();
    }
  });
  
  // --- INIT ---
  function init() {
    console.log('[Boundier] Initializing on', window.location.href);
    
    // Inject UI immediately
    injectUI();
    
    // Start URL observer
    urlObserver.observe(document.documentElement, { subtree: true, childList: true });
    
    // Start passive sensing loop
    setInterval(checkPassiveTriggers, CONFIG.SCAN_INTERVAL);
    
    console.log('[Boundier] Ready and monitoring. Thresholds: EP=' + CONFIG.PRESSURE_THRESHOLD + ', Fix=' + CONFIG.FIXATION_THRESHOLD);
  }

  // Run init when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    // DOM already ready
    setTimeout(init, 100); // Small delay to ensure body exists
  }

})();
