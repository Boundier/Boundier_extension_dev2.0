// Boundier Popup - History Dashboard

document.addEventListener('DOMContentLoaded', () => {
  console.log('[Boundier Popup] Loading...');
  renderHistory();
  
  document.getElementById('clear-btn').addEventListener('click', () => {
    if (confirm('Clear all scan history?')) {
      chrome.storage.local.set({ boundier_scans: [] }, () => {
        console.log('[Boundier Popup] History cleared');
        renderHistory();
      });
    }
  });
});

function formatTime(timestamp) {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  
  return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

function renderHistory() {
  chrome.storage.local.get(['boundier_scans'], (result) => {
    const history = result.boundier_scans || [];
    const container = document.getElementById('history-list');
    
    console.log('[Boundier Popup] Rendering', history.length, 'scans');
    
    if (history.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">📊</div>
          <p>No scans yet</p>
          <p class="empty-hint">Visit a website and click the Scan button to analyze content</p>
        </div>
      `;
      return;
    }

    container.innerHTML = history.map(scan => `
      <div class="history-card">
        <div class="card-top">
          <span class="card-time">${formatTime(scan.timestamp)}</span>
          <span class="card-hook">${(scan.dominantHook || 'generic').replace(/_/g, ' ')}</span>
        </div>
        ${scan.url ? `<div class="card-url">${scan.url}</div>` : ''}
        <div class="card-text">${scan.interpretation || 'No interpretation available'}</div>
        <div class="card-metrics">
          <div class="metric-pill">
            <span class="metric-label">Inf</span>
            <span class="metric-value">${Math.round((scan.influence || 0) * 100)}</span>
          </div>
          <div class="metric-pill">
            <span class="metric-label">Dist</span>
            <span class="metric-value">${Math.round((scan.distortion || 0) * 100)}</span>
          </div>
          <div class="metric-pill">
            <span class="metric-label">Echo</span>
            <span class="metric-value">${Math.round((scan.echoDrift || 0) * 100)}</span>
          </div>
        </div>
        <div class="card-bar">
          <div class="card-bar-fill" style="width: ${(scan.influence || 0) * 100}%"></div>
        </div>
      </div>
    `).join('');
  });
}
