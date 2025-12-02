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

  // --- ENHANCED HEURISTICS ENGINE ---
  
  // Emotional intensity lexicon (weighted by intensity 1-3)
  const EMOTIONAL_LEXICON = {
    // High intensity (weight 3)
    high: [
      "insane", "destroyed", "humiliated", "crushed", "disaster", "obliterated",
      "annihilated", "devastated", "horrifying", "terrifying", "nightmare", "betrayal",
      "explosive", "bombshell", "scandal", "outrageous", "catastrophic", "apocalyptic",
      "genocide", "massacre", "tyranny", "evil", "demonic", "satanic", "murderous"
    ],
    // Medium intensity (weight 2)
    medium: [
      "shocking", "brutal", "pathetic", "disgusting", "shameful", "disgrace",
      "exposed", "rips", "slammed", "blasts", "destroys", "eviscerates", "chaos",
      "fury", "rage", "crisis", "urgent", "breaking", "controversial", "alarming",
      "disturbing", "infuriating", "ridiculous", "absurd", "unbelievable"
    ],
    // Lower intensity (weight 1)
    low: [
      "upset", "frustrated", "concerned", "worried", "disappointed", "annoyed",
      "surprising", "unexpected", "unusual", "strange", "odd", "interesting",
      "remarkable", "notable", "significant", "important", "critical"
    ]
  };

  // Certainty and absolutism patterns
  const CERTAINTY_PATTERNS = {
    // Absolute claims (high distortion)
    absolutes: [
      "everyone knows", "nobody can deny", "the truth is", "fact is",
      "proven fact", "undeniable", "unquestionable", "without exception",
      "always", "never", "all of them", "none of them", "100%", "zero chance",
      "impossible", "guaranteed", "certain", "obvious", "clearly"
    ],
    // Dismissive certainty
    dismissive: [
      "wake up", "open your eyes", "how can you not see", "anyone with a brain",
      "only an idiot", "no reasonable person", "no sane person", "anyone who thinks",
      "if you believe", "imagine thinking", "imagine believing"
    ],
    // Appeal to hidden truth
    hidden_truth: [
      "what they don't tell you", "what they don't want you to know",
      "the real story", "the truth they hide", "mainstream won't report",
      "media won't show", "they're lying about", "cover up", "conspiracy",
      "deep state", "puppet masters", "controlled opposition"
    ]
  };

  // Hedging and nuance indicators (reduce distortion score)
  const NUANCE_INDICATORS = [
    "maybe", "possibly", "might", "could", "likely", "perhaps", "seems",
    "appears", "suggests", "may", "probably", "potentially", "reportedly",
    "according to", "research suggests", "studies indicate", "some argue",
    "on the other hand", "however", "although", "while", "nuanced",
    "complex", "multifaceted", "depends on", "context matters"
  ];

  // Rhetorical manipulation patterns
  const RHETORICAL_PATTERNS = {
    loaded_questions: [
      "why won't they", "why can't they just", "why do they always",
      "how can anyone", "who would ever", "what kind of person"
    ],
    false_dichotomy: [
      "either you", "you're either", "pick a side", "with us or against",
      "only two choices", "black and white", "no middle ground"
    ],
    appeal_to_fear: [
      "before it's too late", "time is running out", "won't be around forever",
      "last chance", "imminent threat", "coming for you", "your children will"
    ],
    bandwagon: [
      "everyone is saying", "millions agree", "the majority knows",
      "smart people understand", "those in the know", "insiders say"
    ],
    ad_hominem: [
      "typical leftist", "typical rightist", "snowflake", "boomer", "karen",
      "sheep", "sheeple", "npc", "brainwashed", "indoctrinated", "cult"
    ],
    call_to_action: [
      "share this", "spread the word", "don't stay silent", "take action now",
      "sign the petition", "join the movement", "fight back", "resist"
    ]
  };

  // Hook/topic categories for echo drift tracking
  const HOOK_TYPES = {
    outrage: ["insane", "betrayal", "destroyed", "disaster", "nightmare", "outrageous", "disgrace", "scandal", "slammed", "corrupt", "rigged"],
    fear: ["shocking", "warning", "collapse", "danger", "terrifying", "threat", "crisis", "breaking", "urgent", "emergency", "alarming"],
    identity_validation: ["truth", "real", "finally", "us vs them", "they", "proven", "exposed", "woke", "based", "redpilled", "blackpilled"],
    hype: ["game changer", "huge", "massive", "revolutionary", "breakthrough", "incredible", "amazing", "mind-blowing", "insane", "legendary"],
    drama: ["exposed", "pathetic", "humiliated", "beef", "feud", "controversy", "drama", "clap back", "ratio", "canceled"],
    cynicism: ["scam", "fake", "lies", "propaganda", "sheep", "blind", "fooled", "corrupt", "shill", "grift", "astroturf"],
    hope: ["saving", "future", "better", "solution", "win", "triumph", "breakthrough", "success", "progress", "healing"],
    tribalism: ["our side", "their side", "real americans", "true patriots", "the left", "the right", "libs", "cons", "dems", "republicans"]
  };

  // Structure and engagement patterns
  const STRUCTURAL_PATTERNS = {
    clickbait_caps: /^[A-Z\s!?]{10,}$/m, // Lines of all caps
    excessive_punctuation: /[!?]{2,}/g, // Multiple ! or ?
    question_baiting: /\?.*\?.*\?/g, // Multiple questions
    thread_hook: /(thread|🧵|1\/\d+|a thread)/i,
    ratio_bait: /(ratio|L\+|W\+|cope|seethe|mald)/i
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

  // --- ENHANCED ANALYSIS ENGINE ---
  
  // Helper: count pattern matches with word boundaries
  function countMatches(text, patterns) {
    let count = 0;
    const lowerText = text.toLowerCase();
    patterns.forEach(pattern => {
      // Use includes for phrases, regex for single words
      if (pattern.includes(' ')) {
        const matches = lowerText.split(pattern.toLowerCase()).length - 1;
        count += matches;
      } else {
        const regex = new RegExp('\\b' + pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b', 'gi');
        const matches = text.match(regex);
        if (matches) count += matches.length;
      }
    });
    return count;
  }
  
  // Extract features from text
  function extractFeatures(text) {
    const lowerText = text.toLowerCase();
    const words = lowerText.split(/\s+/).filter(w => w.length > 0);
    const wordCount = words.length;
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const sentenceCount = Math.max(sentences.length, 1);
    
    // Emotional intensity (weighted)
    const highEmotionHits = countMatches(text, EMOTIONAL_LEXICON.high);
    const medEmotionHits = countMatches(text, EMOTIONAL_LEXICON.medium);
    const lowEmotionHits = countMatches(text, EMOTIONAL_LEXICON.low);
    const emotionalScore = (highEmotionHits * 3 + medEmotionHits * 2 + lowEmotionHits * 1);
    
    // Certainty patterns
    const absoluteHits = countMatches(text, CERTAINTY_PATTERNS.absolutes);
    const dismissiveHits = countMatches(text, CERTAINTY_PATTERNS.dismissive);
    const hiddenTruthHits = countMatches(text, CERTAINTY_PATTERNS.hidden_truth);
    const certaintyScore = absoluteHits * 2 + dismissiveHits * 3 + hiddenTruthHits * 3;
    
    // Nuance indicators (reduce distortion)
    const nuanceHits = countMatches(text, NUANCE_INDICATORS);
    
    // Rhetorical patterns
    let rhetoricalScore = 0;
    const detectedRhetoric = [];
    Object.entries(RHETORICAL_PATTERNS).forEach(([type, patterns]) => {
      const hits = countMatches(text, patterns);
      if (hits > 0) {
        rhetoricalScore += hits * 2;
        detectedRhetoric.push(type);
      }
    });
    
    // Structural patterns
    const capsWords = text.split(/\s+/).filter(w => 
      w.length >= 3 && w === w.toUpperCase() && /[A-Z]/.test(w)
    ).length;
    const exclamationCount = (text.match(/!/g) || []).length;
    const questionCount = (text.match(/\?/g) || []).length;
    const excessivePunctuation = (text.match(STRUCTURAL_PATTERNS.excessive_punctuation) || []).length;
    
    // Imperative density (commands)
    const imperativeStarters = ['stop', 'start', 'don\'t', 'do', 'never', 'always', 'remember', 'think about', 'consider', 'share', 'spread'];
    let imperativeCount = 0;
    imperativeStarters.forEach(imp => {
      const regex = new RegExp('(^|[.!?]\\s*)' + imp + '\\b', 'gi');
      imperativeCount += (text.match(regex) || []).length;
    });
    
    // Topic/hook detection
    const hookScores = {};
    let maxHookScore = 0;
    let dominantHook = "generic";
    
    Object.entries(HOOK_TYPES).forEach(([type, keywords]) => {
      const hits = countMatches(text, keywords);
      hookScores[type] = hits;
      if (hits > maxHookScore) {
        maxHookScore = hits;
        dominantHook = type;
      }
    });
    
    // Generate simple text fingerprint for similarity (hashed TF-IDF-like)
    const significantWords = words.filter(w => 
      w.length > 4 && !['about', 'their', 'there', 'these', 'those', 'would', 'could', 'should'].includes(w)
    );
    const wordFreq = {};
    significantWords.forEach(w => {
      wordFreq[w] = (wordFreq[w] || 0) + 1;
    });
    const topWords = Object.entries(wordFreq)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 15)
      .map(([word]) => word);
    
    return {
      wordCount,
      sentenceCount,
      emotionalScore,
      highEmotionHits,
      medEmotionHits,
      lowEmotionHits,
      certaintyScore,
      absoluteHits,
      dismissiveHits,
      hiddenTruthHits,
      nuanceHits,
      rhetoricalScore,
      detectedRhetoric,
      capsWords,
      exclamationCount,
      questionCount,
      excessivePunctuation,
      imperativeCount,
      hookScores,
      dominantHook,
      maxHookScore,
      topWords,
      avgSentenceLength: wordCount / sentenceCount
    };
  }
  
  function analyze(text, dwellSeconds, scrollBacks) {
    // Input validation
    if (!text || text.trim().length < CONFIG.MIN_TEXT_LENGTH) {
      return {
        emotionalPressure: 0,
        fixation: 0,
        distortion: 0,
        echoDrift: 0,
        influence: 0,
        dominantHook: "generic",
        features: null
      };
    }

    const features = extractFeatures(text);
    const { wordCount, sentenceCount } = features;
    const wordsNorm = Math.max(wordCount / 100, 1);
    
    // 1. Emotional Pressure (0-1)
    // Normalized by text length, accounts for intensity levels
    const emotionDensity = features.emotionalScore / wordsNorm;
    const punctuationBoost = Math.min((features.exclamationCount + features.excessivePunctuation) / sentenceCount, 0.3);
    const capsBoost = Math.min(features.capsWords / wordsNorm * 0.5, 0.2);
    const emotionalPressure = Math.min(
      (emotionDensity / 8) + punctuationBoost + capsBoost,
      1
    );

    // 2. Fixation (0-1) - Behavioral signals
    const effectiveDwell = Math.max(dwellSeconds - 3, 0);
    const baseFixation = Math.min(effectiveDwell / CONFIG.FIXATION_CAP, 0.7);
    const scrollBackBonus = Math.min(scrollBacks * 0.04, 0.15);
    const pauseBonus = dwellSeconds > 10 ? 0.15 : dwellSeconds > 6 ? 0.08 : 0;
    const fixation = Math.min(baseFixation + scrollBackBonus + pauseBonus, 1);

    // 3. Distortion (0-1) - Certainty vs nuance balance + rhetorical manipulation
    const certaintyDensity = features.certaintyScore / wordsNorm;
    const nuanceDensity = features.nuanceHits / wordsNorm;
    const rhetoricalDensity = features.rhetoricalScore / wordsNorm;
    
    // High distortion = high certainty + low nuance + rhetorical tricks
    const rawDistortion = (certaintyDensity * 1.5 + rhetoricalDensity) - (nuanceDensity * 2);
    const distortion = Math.min(Math.max(rawDistortion / 5, 0), 1);

    // 4. Influence (0-1) - Combined metric
    // Weighted: emotion is primary, fixation amplifies, imperative language adds urgency
    const imperativeFactor = Math.min(features.imperativeCount / sentenceCount, 0.2);
    const influence = Math.min(
      (emotionalPressure * 0.55) + (fixation * 0.25) + (distortion * 0.15) + imperativeFactor,
      1
    );

    // Fallback hook detection
    let dominantHook = features.dominantHook;
    if (features.maxHookScore === 0) {
      if (emotionalPressure > 0.6) dominantHook = "outrage";
      else if (distortion > 0.6) dominantHook = "identity_validation";
      else if (features.exclamationCount > 5) dominantHook = "hype";
      else if (features.questionCount > 5) dominantHook = "drama";
    }

    return {
      emotionalPressure,
      fixation,
      distortion,
      echoDrift: 0, // Calculated from history in performActiveScan
      influence,
      dominantHook,
      features // Include features for advanced interpretation
    };
  }

  function generateInterpretation(metrics) {
    const { influence, distortion, echoDrift, dominantHook, emotionalPressure, fixation, features } = metrics;
    const hookClean = (dominantHook || 'generic').replace(/_/g, ' ');
    
    // Build specific observations based on detected features
    const observations = [];
    
    if (features) {
      // Rhetorical pattern insights
      if (features.detectedRhetoric && features.detectedRhetoric.length > 0) {
        const rhetoricalNames = {
          'loaded_questions': 'leading questions',
          'false_dichotomy': 'false either/or framing',
          'appeal_to_fear': 'urgency and fear appeals',
          'bandwagon': '"everyone agrees" claims',
          'ad_hominem': 'personal attacks or labeling',
          'call_to_action': 'action demands'
        };
        const detected = features.detectedRhetoric
          .map(r => rhetoricalNames[r] || r)
          .slice(0, 2);
        observations.push(`Uses ${detected.join(' and ')}`);
      }
      
      // Certainty pattern insights
      if (features.dismissiveHits > 0) {
        observations.push('dismisses opposing views');
      }
      if (features.hiddenTruthHits > 0) {
        observations.push('claims hidden or suppressed truth');
      }
      if (features.absoluteHits > 2) {
        observations.push('makes absolute claims');
      }
      
      // Emotional intensity insights
      if (features.highEmotionHits > 2) {
        observations.push('high-intensity emotional language');
      }
      if (features.capsWords > 3) {
        observations.push('aggressive formatting');
      }
    }

    // Generate primary interpretation based on metric combination
    let primary = '';
    
    if (influence > 0.75 && distortion > 0.6) {
      primary = `High-pressure content designed to override critical thinking. ${hookClean.charAt(0).toUpperCase() + hookClean.slice(1)} framing combined with certainty language creates a "must agree" effect.`;
    } else if (echoDrift > 0.65) {
      primary = `Pattern reinforcement detected. You've consumed similar ${hookClean} content ${Math.round(echoDrift * 100)}% of your recent scans. Your perspective on this topic may be narrowing.`;
    } else if (echoDrift > 0.4 && influence > 0.5) {
      primary = `This ${hookClean} content fits your recent consumption pattern while being emotionally engaging. Automatic reactions become more likely with repeated exposure.`;
    } else if (distortion > 0.7) {
      primary = `Certainty-heavy content that presents opinions as facts. Uses absolute language with limited acknowledgment of nuance or opposing viewpoints.`;
    } else if (emotionalPressure > 0.6 && distortion > 0.4) {
      primary = `Emotional intensity paired with certainty framing. The content uses feelings to make claims feel true before logical evaluation.`;
    } else if (influence > 0.6) {
      primary = `Engaging ${hookClean} content capturing your attention. Emotional or identity-based appeals are pulling your focus.`;
    } else if (fixation > 0.5 && influence > 0.35) {
      primary = `Extended focus on this content detected. Prolonged engagement can amplify even moderate influence effects.`;
    } else if (distortion > 0.5) {
      primary = `Content leans toward presenting opinions as established facts. Some certainty language but not overwhelming.`;
    } else if (influence < 0.25 && distortion < 0.25) {
      primary = `Low manipulation profile. This content appears relatively balanced without heavy emotional or persuasive techniques.`;
    } else if (influence < 0.35) {
      primary = `Moderate content with limited emotional pressure. Not significantly designed to alter your state.`;
    } else {
      primary = `Mixed ${hookClean} signals with some persuasive elements. Within normal range for social media content.`;
    }
    
    // Add specific observations if any were detected
    if (observations.length > 0) {
      return `${primary} Detected: ${observations.slice(0, 3).join(', ')}.`;
    }
    
    return primary;
  }

  // --- CSS INJECTION ---
  function injectStyles() {
    if (document.getElementById('boundier-injected-styles')) return;
    
    const style = document.createElement('style');
    style.id = 'boundier-injected-styles';
    style.textContent = `
      #boundier-scan-btn {
        position: fixed !important;
        right: 20px !important;
        top: 50% !important;
        transform: translateY(-50%) !important;
        z-index: 2147483646 !important;
        background: linear-gradient(135deg, rgba(0, 56, 255, 0.9) 0%, rgba(0, 30, 150, 0.95) 100%) !important;
        border: 1px solid rgba(255, 255, 255, 0.25) !important;
        border-radius: 50px !important;
        padding: 14px 20px !important;
        color: white !important;
        font-family: 'Cooper Hewitt', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
        font-weight: 700 !important;
        font-size: 13px !important;
        text-transform: uppercase !important;
        letter-spacing: 1.5px !important;
        cursor: pointer !important;
        box-shadow: 0 4px 24px rgba(0, 56, 255, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.2) !important;
        transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1) !important;
        backdrop-filter: blur(16px) !important;
        -webkit-backdrop-filter: blur(16px) !important;
        opacity: 0 !important;
        pointer-events: none !important;
        white-space: nowrap !important;
        display: flex !important;
        align-items: center !important;
        gap: 8px !important;
      }
      
      #boundier-scan-btn.visible {
        opacity: 1 !important;
        pointer-events: auto !important;
        animation: boundier-pulse 3s ease-in-out infinite !important;
      }
      
      @keyframes boundier-pulse {
        0%, 100% { 
          box-shadow: 0 4px 24px rgba(0, 56, 255, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.2);
          transform: translateY(-50%) scale(1);
        }
        50% { 
          box-shadow: 0 8px 36px rgba(0, 56, 255, 0.7), inset 0 1px 0 rgba(255, 255, 255, 0.25);
          transform: translateY(-50%) scale(1.03);
        }
      }
      
      #boundier-scan-btn:hover {
        background: linear-gradient(135deg, rgba(0, 70, 255, 0.95) 0%, rgba(0, 40, 180, 1) 100%) !important;
        box-shadow: 0 8px 40px rgba(0, 56, 255, 0.8), inset 0 1px 0 rgba(255, 255, 255, 0.3) !important;
        transform: translateY(-50%) scale(1.05) !important;
        border-color: rgba(255, 255, 255, 0.4) !important;
      }
      
      #boundier-scan-btn:active {
        transform: translateY(-50%) scale(0.98) !important;
        box-shadow: 0 2px 16px rgba(0, 56, 255, 0.6), inset 0 1px 0 rgba(255, 255, 255, 0.15) !important;
      }
      
      .boundier-scan-icon {
        width: 16px !important;
        height: 16px !important;
        stroke: currentColor !important;
        stroke-width: 2 !important;
        fill: none !important;
      }
      
      #boundier-overlay {
        position: fixed !important;
        top: 0 !important;
        right: 0 !important;
        height: 100vh !important;
        width: 360px !important;
        z-index: 2147483647 !important;
        background: linear-gradient(180deg, rgba(0, 15, 60, 0.85) 0%, rgba(0, 5, 40, 0.92) 100%) !important;
        backdrop-filter: blur(24px) saturate(180%) !important;
        -webkit-backdrop-filter: blur(24px) saturate(180%) !important;
        border-left: 1px solid rgba(255, 255, 255, 0.12) !important;
        box-shadow: -12px 0 60px rgba(0, 0, 0, 0.4), inset 1px 0 0 rgba(255, 255, 255, 0.05) !important;
        color: white !important;
        font-family: 'Cooper Hewitt', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
        transform: translateX(100%) !important;
        transition: transform 350ms cubic-bezier(0.25, 0.8, 0.25, 1) !important;
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
        padding: 20px !important;
        background: rgba(255, 255, 255, 0.04) !important;
        backdrop-filter: blur(8px) !important;
        -webkit-backdrop-filter: blur(8px) !important;
        border: 1px solid rgba(255, 255, 255, 0.08) !important;
        border-radius: 14px !important;
        font-size: 15px !important;
        line-height: 1.65 !important;
        font-weight: 400 !important;
        color: rgba(255, 255, 255, 0.92) !important;
      }
      
      .boundier-hook-tag {
        display: inline-block !important;
        margin-top: 16px !important;
        padding: 8px 14px !important;
        background: rgba(0, 56, 255, 0.15) !important;
        border: 1px solid rgba(0, 56, 255, 0.35) !important;
        color: #6BA3FF !important;
        border-radius: 8px !important;
        font-size: 11px !important;
        text-transform: uppercase !important;
        letter-spacing: 0.1em !important;
        font-weight: 600 !important;
      }
      
      .boundier-logo-img {
        height: 48px !important;
        width: auto !important;
        margin-bottom: 4px !important;
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

    // Scan Button with icon
    const btn = document.createElement('button');
    btn.id = 'boundier-scan-btn';
    btn.innerHTML = `<svg class="boundier-scan-icon" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>Analyze`;
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
          <img src="${chrome.runtime.getURL('assets/logo.png')}" alt="Boundier" class="boundier-logo-img" />
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
      if (el) {
        // Ensure minimum visible width and use setProperty for specificity
        const width = Math.max(percent, 3);
        el.style.setProperty('width', `${width}%`, 'important');
        console.log(`[Boundier] Set bar ${id} to ${width}%`);
      }
    };
    
    // Set values immediately
    setValue('b-influence-val', Math.round(metrics.influence * 100));
    setValue('b-distortion-val', Math.round(metrics.distortion * 100));
    setValue('b-drift-val', Math.round(metrics.echoDrift * 100));
    
    // Animate bars with slight delay for visual effect
    setTimeout(() => {
      setBar('b-influence-bar', metrics.influence * 100);
      setBar('b-distortion-bar', metrics.distortion * 100);
      setBar('b-drift-bar', metrics.echoDrift * 100);
    }, 100);
    
    const interpretation = document.getElementById('b-interpretation');
    if (interpretation) {
      interpretation.textContent = generateInterpretation(metrics);
    }
    
    const tags = document.getElementById('b-tags');
    if (tags) {
      tags.innerHTML = `<span class="boundier-hook-tag">${(metrics.dominantHook || 'generic').replace(/_/g, ' ')}</span>`;
    }
  }

  function showMinimalTextMessage() {
    const overlay = document.getElementById('boundier-overlay');
    if (overlay) {
      overlay.classList.add('open');
      const interpretation = document.getElementById('b-interpretation');
      if (interpretation) {
        interpretation.textContent = 'Not enough readable text on this page for meaningful analysis. Try a page with more written content.';
      }
    }
  }

  // --- CORE SCAN LOGIC ---
  function performActiveScan() {
    console.log('[Boundier] Performing active scan...');
    
    try {
      const text = extractVisibleText();
      console.log('[Boundier] Extracted text length:', text.length, 'chars');
      
      if (!text || text.trim().length < CONFIG.MIN_TEXT_LENGTH) {
        console.log('[Boundier] Insufficient text for analysis');
        showMinimalTextMessage();
        return;
      }
      
      const dwell = (Date.now() - state.startTime) / 1000;
      const metrics = analyze(text, dwell, state.scrollBacks);
      console.log('[Boundier] Raw metrics:', metrics);

      // Get history and calculate ENHANCED Echo Drift
      chrome.storage.local.get(['boundier_scans'], (result) => {
        const history = result.boundier_scans || [];
        console.log('[Boundier] History length:', history.length);
        
        // Enhanced Echo Drift: combines hook matching + topic word similarity
        if (history.length > 0) {
          const lastN = history.slice(0, 10);
          
          // 1. Hook category similarity (40% weight)
          const sameHookCount = lastN.filter(s => s.dominantHook === metrics.dominantHook).length;
          const hookSimilarity = sameHookCount / lastN.length;
          
          // 2. Topic word similarity using topWords (60% weight)
          let topicSimilarity = 0;
          const currentWords = new Set(metrics.features?.topWords || []);
          if (currentWords.size > 0) {
            const historySimilarities = lastN
              .filter(s => s.topWords && s.topWords.length > 0)
              .map(s => {
                const histWords = new Set(s.topWords);
                const intersection = [...currentWords].filter(w => histWords.has(w));
                // Jaccard similarity
                const union = new Set([...currentWords, ...histWords]);
                return intersection.length / union.size;
              });
            
            if (historySimilarities.length > 0) {
              topicSimilarity = historySimilarities.reduce((a, b) => a + b, 0) / historySimilarities.length;
            }
          }
          
          // Weighted combination
          metrics.echoDrift = (hookSimilarity * 0.4) + (topicSimilarity * 0.6);
          console.log('[Boundier] Echo Drift:', metrics.echoDrift.toFixed(2), 
                      '(hook:', hookSimilarity.toFixed(2), 'topic:', topicSimilarity.toFixed(2) + ')');
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

        // Save to history with topic fingerprint
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
          url: window.location.hostname,
          topWords: metrics.features?.topWords || [] // Store for similarity calculation
        };
        
        const newHistory = [scanRecord, ...history].slice(0, 20); // Keep last 20
        chrome.storage.local.set({ boundier_scans: newHistory }, () => {
          console.log('[Boundier] Scan saved to history');
        });
        
        state.hasScannedCurrentPage = true;
      });
    } catch (error) {
      console.error('[Boundier] Scan error:', error);
    }
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
