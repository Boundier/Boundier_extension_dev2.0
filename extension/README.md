# Boundier v1.0

Client-side content analysis for influence, distortion, and echo patterns.

## Installation

1. Open Chrome → `chrome://extensions/`
2. Enable **Developer mode**
3. Click **Load unpacked**
4. Select the `extension` folder

---

## Scoring Algorithm

### Overview

Boundier uses a proprietary multi-signal heuristic engine that analyzes content across 6 weighted categories. Unlike simple keyword counting, the algorithm considers:

- **Signal density** (matches per word count)
- **Category weighting** (not all signals are equal)
- **Modifier analysis** (punctuation, caps, absolutes)
- **Cross-signal correlation**

### Signal Categories

| Category       | Weight | Purpose                                  |
|----------------|--------|------------------------------------------|
| Urgency        | 0.85   | Time-pressure tactics                    |
| Fear           | 0.90   | Threat-based manipulation                |
| Polarization   | 0.95   | Us-vs-them framing                       |
| Manipulation   | 0.88   | Conspiratorial patterns                  |
| Sensationalism | 0.75   | Hype and exaggeration                    |
| Authority      | 0.60   | Appeal to expertise (often misused)      |

### Metric Calculations

#### Influence Score

Measures persuasive pressure applied to the reader.

```
Primary = (Urgency × 0.40) + (Sensationalism × 0.35) + (Authority × 0.25)
Modifiers:
  - Exclamation density: min(0.15, (exclamations / wordCount) × 5)
  - All-caps words: min(0.10, (capsWords / wordCount) × 3)

Influence = clamp(Primary + Modifiers, 0, 1)
```

#### Distortion Score

Measures reality-bending through emotional manipulation.

```
Primary = (Fear × 0.35) + (Polarization × 0.40) + (Manipulation × 0.25)
Modifiers:
  - Absolute language ("always", "never", "everyone"): min(0.12, (count / wordCount) × 4)

Distortion = clamp(Primary + Modifiers, 0, 1)
```

#### Echo Drift Score

Measures echo chamber alignment and bias reinforcement.

```
Base = (Polarization × 0.50) + (Distortion × 0.30) + (Manipulation × 0.20)
Modifiers:
  - "Us vs Them" language: min(0.15, (count / wordCount) × 8)

EchoDrift = clamp(Base + Modifiers, 0, 1)
```

### Density Formula

Each signal category uses normalized density to prevent gaming:

```
matches = count of terms found in text
density = matches / wordCount
weighted = min(1, density × 50 × categoryWeight)
```

The `50` multiplier is calibrated for typical article lengths (500-2000 words).

---

## Architecture

```
contentScript.js  →  Extraction + UI Overlay
popup.js          →  Tab navigation + History display
background.js     →  Storage initialization
chrome.storage    →  Persists last 10 scans
```

All processing happens client-side. Zero external requests.

---

## Customization

### Add New Sites

Edit `Extractor` in `contentScript.js`:

```javascript
extractYourSite() {
  const content = document.querySelectorAll('.article-content p');
  let text = '';
  content.forEach(p => text += p.innerText + ' ');
  return text.substring(0, 15000);
}
```

### Adjust Weights

Edit `Scorer.signals` to change category weights:

```javascript
fear: {
  weight: 0.90,  // Increase for stricter fear detection
  terms: [...]
}
```

### Add Signal Terms

Add terms to any category in `Scorer.signals`:

```javascript
urgency: {
  terms: ['breaking', 'urgent', 'YOUR_NEW_TERM', ...]
}
```

---

## Privacy

- All analysis runs locally in JavaScript
- No data transmitted to external servers
- No tracking, analytics, or telemetry
- History stored only in browser local storage
