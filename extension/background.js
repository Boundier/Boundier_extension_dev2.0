// Boundier - Background Service Worker
// Handles installation events and basic state if needed.

chrome.runtime.onInstalled.addListener(() => {
  console.log("Boundier installed.");
  // Initialize storage if empty
  chrome.storage.local.get(['boundier_scans'], (result) => {
    if (!result.boundier_scans) {
      chrome.storage.local.set({ boundier_scans: [] });
    }
  });
});
