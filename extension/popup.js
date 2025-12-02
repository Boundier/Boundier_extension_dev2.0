document.addEventListener('DOMContentLoaded', () => {
  renderHistory();
  
  document.getElementById('clear-btn').addEventListener('click', () => {
    chrome.storage.local.set({ boundier_scans: [] }, () => {
      renderHistory();
    });
  });
});

function renderHistory() {
  chrome.storage.local.get(['boundier_scans'], (result) => {
    const history = result.boundier_scans || [];
    const container = document.getElementById('history-list');
    container.innerHTML = '';

    if (history.length === 0) {
      container.innerHTML = `
        <div style="display:flex; flex-direction:column; align-items:center; justify-content:center; height:100%; opacity:0.3; font-size:12px; text-align:center;">
          <p>No scans yet.</p>
        </div>
      `;
      return;
    }

    history.forEach(scan => {
      const date = new Date(scan.timestamp);
      const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      
      const card = document.createElement('div');
      card.className = 'history-card';
      card.innerHTML = `
        <div class="card-top">
          <span class="card-time">${timeStr}</span>
          <span class="card-hook">${scan.dominantHook}</span>
        </div>
        <div class="card-text">${scan.interpretation}</div>
        <div class="card-bar">
          <div class="card-bar-fill" style="width: ${scan.influence * 100}%"></div>
        </div>
      `;
      container.appendChild(card);
    });
  });
}
