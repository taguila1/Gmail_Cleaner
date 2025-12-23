// Chrome Storage API utilities

/**
 * Get settings from storage
 */
export function getSettings() {
  return new Promise((resolve) => {
    chrome.storage.sync.get(['settings'], (result) => {
      resolve(result.settings || {
        autoUnsubscribe: false,
        autoDelete: false,
        previewMode: true,
        rateLimitDelay: 1000,
        minConfidenceForDelete: 0.7
      });
    });
  });
}

/**
 * Save settings to storage
 */
function saveSettings(settings) {
  return new Promise((resolve) => {
    chrome.storage.sync.set({ settings }, () => {
      resolve(true);
    });
  });
}

/**
 * Get whitelist
 */
function getWhitelist() {
  return new Promise((resolve) => {
    chrome.storage.sync.get(['whitelist'], (result) => {
      resolve(result.whitelist || []);
    });
  });
}

/**
 * Add to whitelist
 */
function addToWhitelist(email) {
  return new Promise((resolve) => {
    getWhitelist().then(whitelist => {
      if (!whitelist.includes(email)) {
        whitelist.push(email);
        chrome.storage.sync.set({ whitelist }, () => {
          resolve(true);
        });
      } else {
        resolve(false);
      }
    });
  });
}

/**
 * Remove from whitelist
 */
function removeFromWhitelist(email) {
  return new Promise((resolve) => {
    getWhitelist().then(whitelist => {
      const filtered = whitelist.filter(item => item !== email);
      chrome.storage.sync.set({ whitelist: filtered }, () => {
        resolve(true);
      });
    });
  });
}

/**
 * Get blacklist
 */
function getBlacklist() {
  return new Promise((resolve) => {
    chrome.storage.sync.get(['blacklist'], (result) => {
      resolve(result.blacklist || []);
    });
  });
}

/**
 * Add to blacklist
 */
function addToBlacklist(email) {
  return new Promise((resolve) => {
    getBlacklist().then(blacklist => {
      if (!blacklist.includes(email)) {
        blacklist.push(email);
        chrome.storage.sync.set({ blacklist }, () => {
          resolve(true);
        });
      } else {
        resolve(false);
      }
    });
  });
}

/**
 * Remove from blacklist
 */
function removeFromBlacklist(email) {
  return new Promise((resolve) => {
    getBlacklist().then(blacklist => {
      const filtered = blacklist.filter(item => item !== email);
      chrome.storage.sync.set({ blacklist: filtered }, () => {
        resolve(true);
      });
    });
  });
}

/**
 * Get statistics
 */
function getStats() {
  return new Promise((resolve) => {
    chrome.storage.local.get(['stats'], (result) => {
      resolve(result.stats || {
        unsubscribed: 0,
        deleted: 0,
        processed: 0
      });
    });
  });
}

/**
 * Update statistics
 */
function updateStats(stats) {
  return new Promise((resolve) => {
    getStats().then(currentStats => {
      const updated = { ...currentStats, ...stats };
      chrome.storage.local.set({ stats: updated }, () => {
        resolve(updated);
      });
    });
  });
}

