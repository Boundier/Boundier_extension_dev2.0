
// Heuristic definitions based on the Boundier spec

export interface ScanResult {
  id: string;
  timestamp: number;
  influence: number;
  distortion: number;
  echoDrift: number;
  dominantHook: string;
  interpretation: string;
}

export interface AnalysisMetrics {
  emotionalPressure: number;
  fixation: number;
  distortion: number;
  echoDrift: number;
  influence: number;
}

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

export function analyzeText(text: string, dwellTimeSeconds: number, scrollBacks: number): AnalysisMetrics {
  const lowerText = text.toLowerCase();
  const words = lowerText.split(/\s+/);
  const textLengthFactor = Math.max(words.length, 50); // Avoid division by zero or tiny texts

  // 1. Emotional Pressure
  let emotionHits = 0;
  EMOTIONAL_WORDS.forEach(word => {
    if (lowerText.includes(word)) emotionHits++;
  });

  const exclamationHits = (text.match(/!/g) || []).length;
  
  // Count ALL CAPS words >= 3 chars
  const capsHits = text.split(/\s+/).filter(w => w.length >= 3 && w === w.toUpperCase() && /[A-Z]/.test(w)).length;

  const emotionalPressureRaw = (emotionHits + capsHits + exclamationHits * 0.5) / (textLengthFactor * 0.1); // Adjusted factor for demo
  const emotionalPressure = Math.min(Math.max(emotionalPressureRaw, 0), 1);

  // 2. Fixation
  const maxDwellCap = 60;
  const baseFixation = Math.min(dwellTimeSeconds / maxDwellCap, 1);
  const bonuses = (scrollBacks * 0.1) + (dwellTimeSeconds > 5 ? 0.1 : 0);
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

  // distortionRaw = (certaintyHits + absoluteHits) - hedgeHits * 0.5
  // Simplified for demo since certaintyHits includes absolute phrases
  const distortionRaw = (certaintyHits * 1.5) - (hedgeHits * 0.5); 
  const distortion = Math.min(Math.max(distortionRaw / 5, 0), 1); // Normalize by assuming 5 hits is max distortion

  // 4. Echo Drift (Mock implementation)
  // in a real app, this would check history. Here we'll randomize slightly based on "hook" consistency
  const echoDrift = Math.random() * 0.5 + (emotionalPressure * 0.5); 

  // 5. Influence
  // influence = average(emotionalPressure, fixation) or weighted
  const influence = (emotionalPressure * 0.6) + (fixation * 0.4);

  return {
    emotionalPressure,
    fixation,
    distortion,
    echoDrift,
    influence
  };
}

export function determineDominantHook(text: string): string {
  const lowerText = text.toLowerCase();
  let maxHits = 0;
  let dominant = "generic";

  Object.entries(HOOK_TYPES).forEach(([type, keywords]) => {
    let hits = 0;
    keywords.forEach(k => {
      if (lowerText.includes(k)) hits++;
    });
    if (hits > maxHits) {
      maxHits = hits;
      dominant = type;
    }
  });

  if (maxHits === 0) {
    // Fallback heuristics
    if (text.includes("!")) return "hype";
    if (text.length > 200) return "drama";
  }

  return dominant.replace("_", " ");
}

export function generateInterpretation(metrics: AnalysisMetrics, hook: string): string {
  const { influence, distortion, echoDrift } = metrics;

  if (influence > 0.7 && distortion > 0.7) {
    return `Strong ${hook} hook and certainty tone — this content is overriding your critical filter.`;
  }
  if (influence > 0.7) {
    return `High emotional engagement with ${hook} themes — you are fixating on this pattern.`;
  }
  if (distortion > 0.7) {
    return `Absolute framing detected — this content demands total agreement without nuance.`;
  }
  if (echoDrift > 0.6) {
    return `Repeated exposure to ${hook} triggers — your baseline response is drifting.`;
  }
  if (influence < 0.3) {
    return `Low resonance — this content did not significantly alter your state.`;
  }
  
  return `Moderate framing pressure — this content has a balanced influence profile.`;
}
