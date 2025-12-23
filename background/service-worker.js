// Background Service Worker for Gmail Cleaner
// Handles coordination between content scripts and popup

chrome.runtime.onInstalled.addListener(() => {
  console.log('Gmail Cleaner extension installed');
  
  // Initialize default settings
  chrome.storage.sync.get(['settings', 'whitelist', 'blacklist'], (result) => {
    const defaults = {
      settings: {
        autoUnsubscribe: false,
        autoDelete: false,
        previewMode: true,
        rateLimitDelay: 1000, // ms between actions
        minConfidenceForDelete: 0.7
      },
      whitelist: [],
      blacklist: []
    };
    
    if (!result.settings) {
      chrome.storage.sync.set({ settings: defaults.settings });
    }
    if (!result.whitelist) {
      chrome.storage.sync.set({ whitelist: defaults.whitelist });
    }
    if (!result.blacklist) {
      chrome.storage.sync.set({ blacklist: defaults.blacklist });
    }
  });
});

// Listen for messages from content script or popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'getSettings') {
    chrome.storage.sync.get(['settings', 'whitelist', 'blacklist'], (result) => {
      sendResponse(result);
    });
    return true; // Will respond asynchronously
  }
  
  if (request.action === 'saveSettings') {
    chrome.storage.sync.set({ settings: request.settings }, () => {
      sendResponse({ success: true });
    });
    return true;
  }
  
  if (request.action === 'addToWhitelist') {
    chrome.storage.sync.get(['whitelist'], (result) => {
      const whitelist = result.whitelist || [];
      if (!whitelist.includes(request.email)) {
        whitelist.push(request.email);
        chrome.storage.sync.set({ whitelist }, () => {
          sendResponse({ success: true });
        });
      } else {
        sendResponse({ success: true, message: 'Already in whitelist' });
      }
    });
    return true;
  }
  
  if (request.action === 'addToBlacklist') {
    chrome.storage.sync.get(['blacklist'], (result) => {
      const blacklist = result.blacklist || [];
      if (!blacklist.includes(request.email)) {
        blacklist.push(request.email);
        chrome.storage.sync.set({ blacklist }, () => {
          sendResponse({ success: true });
        });
      } else {
        sendResponse({ success: true, message: 'Already in blacklist' });
      }
    });
    return true;
  }
  
  if (request.action === 'getStats') {
    chrome.storage.local.get(['stats'], (result) => {
      sendResponse({ stats: result.stats || { unsubscribed: 0, deleted: 0, processed: 0 } });
    });
    return true;
  }
  
  if (request.action === 'updateStats') {
    chrome.storage.local.get(['stats'], (result) => {
      const stats = result.stats || { unsubscribed: 0, deleted: 0, processed: 0 };
      Object.assign(stats, request.stats);
      chrome.storage.local.set({ stats }, () => {
        sendResponse({ success: true });
      });
    });
    return true;
  }
});

