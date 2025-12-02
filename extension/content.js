// Real Content Analysis Logic
// This script runs on the active tab

// State for the overlay
let overlayVisible = false;

// 1. Text Extraction
function getPageContent() {
  // diverse scraping strategy
  const articleBody = document.querySelector('article') || document.querySelector('main') || document.body;
  const text = articleBody.innerText;
  return text.replace(/\s+/g, ' ').trim().substring(0, 10000); // Limit to 10k chars for performance
}

// 2. Analysis Engine (Client-Side)
function analyzeContent(text) {
  const lowerText = text.toLowerCase();
  
  // Keyword Dictionaries
  const fearWords = ["warn", "danger", "crisis", "collapse", "threat", "deadly", "catastrophe", "risk", "panic", "emergency", "fatal", "terror"];
  const urgencyWords = ["now", "immediately", "urgent", "breaking", "alert", "deadline", "fast", "act now", "limited time"];
  const hypeWords = ["shocking", "insane", "mind-blowing", "miracle", "you won't believe", "best ever", "life-changing", "revolutionary"];
  const authorityWords = ["expert", "scientists", "study", "research", "official", "confirmed", "proven", "evidence"];
  const polarizationWords = ["them", "they", "enemy", "destroy", "radical", "extreme", "corrupt", "traitor", "lie", "fake"];

  // Scoring Functions
  const countMatches = (words) => {
    return words.reduce((count, word) => count + (lowerText.split(word).length - 1), 0);
  };

  const wordCount = text.split(' ').length || 1;
  
  // Raw Counts
  const fearCount = countMatches(fearWords);
  const urgencyCount = countMatches(urgencyWords);
  const hypeCount = countMatches(hypeWords);
  const authorityCount = countMatches(authorityWords);
  const polarizationCount = countMatches(polarizationWords);

  // Normalize (Matches per 100 words)
  const density = (count) => Math.min(1, (count / wordCount) * 20); // Multiplier to make it sensitive

  // Metrics Calculation
  const influenceScore = Math.min(1, (
    density(fearCount) * 0.4 + 
    density(urgencyCount) * 0.3 + 
    density(hypeCount) * 0.3 +
    density(authorityCount) * 0.2
  ));

  const distortionScore = Math.min(1, (
    density(fearCount) * 0.3 +
    density(hypeCount) * 0.3 +
    density(polarizationCount) * 0.4
  ));

  // Echo Drift (Based on polarization and lack of nuance)
  // High polarization + short content usually means echo chamber
  const echoScore = Math.min(1, (
    density(polarizationCount) * 0.6 + 
    (influenceScore > 0.6 ? 0.3 : 0) +
    (distortionScore > 0.5 ? 0.2 : 0)
  ));

  // Explanation Generator
  let cues = [];
  if (density(fearCount) > 0.1) cues.push("Fear induction");
  if (density(urgencyCount) > 0.1) cues.push("Artificial urgency");
  if (density(hypeCount) > 0.1) cues.push("Sensationalism");
  if (density(polarizationCount) > 0.1) cues.push("Polarizing language");
  
  const explanation = cues.length > 0 
    ? `High signals of: ${cues.join(", ")}.` 
    : "Content appears relatively neutral and balanced.";

  return {
    influence: parseFloat(influenceScore.toFixed(2)),
    distortion: parseFloat(distortionScore.toFixed(2)),
    echoDrift: parseFloat(echoScore.toFixed(2)),
    explanation,
    wordCount
  };
}

// 3. UI Injection (Shadow DOM for isolation)
function createFloatingButton() {
  if (document.getElementById('boundier-root')) return;

  const rootHost = document.createElement('div');
  rootHost.id = 'boundier-root';
  document.body.appendChild(rootHost);

  const shadow = rootHost.attachShadow({ mode: 'open' });
  
  // Inject Styles into Shadow DOM
  const styleLink = document.createElement('link');
  styleLink.rel = 'stylesheet';
  styleLink.href = chrome.runtime.getURL('styles.css');
  shadow.appendChild(styleLink);

  // Font Face injection (needs to be in main document or handled via imported CSS)
  // We'll rely on the CSS file for fonts

  const btn = document.createElement('button');
  btn.id = 'boundier-trigger';
  btn.className = 'boundier-overlay-btn';
  btn.innerHTML = `
    <img src="${chrome.runtime.getURL('icons/icon48.png')}" width="20" height="20" style="border-radius:4px;">
    <span>SCAN</span>
  `;
  
  btn.addEventListener('click', () => {
    const text = getPageContent();
    if (text.length < 50) {
      alert("Boundier: Not enough text content found to analyze.");
      return;
    }
    const result = analyzeContent(text);
    showOverlay(shadow, result);
    saveMetrics(result);
  });

  shadow.appendChild(btn);
}

function showOverlay(shadow, data) {
  const existing = shadow.getElementById('boundier-result');
  if (existing) existing.remove();

  const panel = document.createElement('div');
  panel.id = 'boundier-result';
  panel.className = 'glass-panel boundier-result-panel p-6';
  panel.innerHTML = `
    <div class="flex justify-between items-center mb-4">
      <div class="flex items-center gap-2">
        <span class="icon-dot bg-accent"></span>
        <h3 class="text-sm font-bold text-white m-0">ANALYSIS RESULT</h3>
      </div>
      <button id="boundier-close" style="background:none; border:none; color:rgba(255,255,255,0.5); cursor:pointer; font-size:18px;">×</button>
    </div>

    <div class="flex flex-col gap-4">
      <div>
        <div class="flex justify-between text-xs text-white-dim mb-1 uppercase">
          <span>Influence</span>
          <span class="font-mono text-white">${Math.round(data.influence * 100)}%</span>
        </div>
        <div class="progress-bar-bg">
          <div class="progress-bar-fill bg-accent" style="width: ${data.influence * 100}%"></div>
        </div>
      </div>

      <div>
        <div class="flex justify-between text-xs text-white-dim mb-1 uppercase">
          <span>Distortion</span>
          <span class="font-mono text-white">${Math.round(data.distortion * 100)}%</span>
        </div>
        <div class="progress-bar-bg">
          <div class="progress-bar-fill bg-alert" style="width: ${data.distortion * 100}%"></div>
        </div>
      </div>

      <div>
        <div class="flex justify-between text-xs text-white-dim mb-1 uppercase">
          <span>Echo Drift</span>
          <span class="font-mono text-white">${Math.round(data.echoDrift * 100)}%</span>
        </div>
        <div class="progress-bar-bg">
          <div class="progress-bar-fill bg-warn" style="width: ${data.echoDrift * 100}%"></div>
        </div>
      </div>
      
      <p class="text-xs text-white-dim m-0 mt-2 leading-relaxed" style="border-top:1px solid rgba(255,255,255,0.1); padding-top:8px;">
        ${data.explanation}
      </p>
    </div>
  `;
  
  shadow.appendChild(panel);
  
  shadow.getElementById('boundier-close').addEventListener('click', () => panel.remove());
}

function saveMetrics(data) {
  const result = {
    ...data,
    timestamp: Date.now(),
    url: window.location.hostname,
    title: document.title.substring(0, 50)
  };

  // Save for popup
  chrome.storage.local.set({ latestMetrics: result });
  
  // Append to history
  chrome.storage.local.get(['history'], (res) => {
    const history = res.history || [];
    // Avoid duplicates for same page within 1 minute
    const isDuplicate = history.length > 0 && 
                        history[0].url === result.url && 
                        (result.timestamp - history[0].timestamp < 60000);
    
    if (!isDuplicate) {
      history.unshift(result);
      if (history.length > 50) history.pop(); // Keep last 50
      chrome.storage.local.set({ history });
    }
  });
}

// Initialize
createFloatingButton();
