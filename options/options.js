// Options page script

// DOM elements
const previewMode = document.getElementById('preview-mode');
const autoUnsubscribe = document.getElementById('auto-unsubscribe');
const autoDelete = document.getElementById('auto-delete');
const rateLimit = document.getElementById('rate-limit');
const confidenceThreshold = document.getElementById('confidence-threshold');
const confidenceValue = document.getElementById('confidence-value');
const whitelistInput = document.getElementById('whitelist-input');
const blacklistInput = document.getElementById('blacklist-input');
const btnAddWhitelist = document.getElementById('btn-add-whitelist');
const btnAddBlacklist = document.getElementById('btn-add-blacklist');
const whitelistItems = document.getElementById('whitelist-items');
const blacklistItems = document.getElementById('blacklist-items');
const btnResetStats = document.getElementById('btn-reset-stats');
const statUnsubscribed = document.getElementById('stat-unsubscribed');
const statDeleted = document.getElementById('stat-deleted');
const statProcessed = document.getElementById('stat-processed');
const statusMessage = document.getElementById('status-message');

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  loadSettings();
  loadWhitelist();
  loadBlacklist();
  loadStats();
  loadLogs();
  setupEventListeners();
});

function setupEventListeners() {
  // Settings
  previewMode.addEventListener('change', saveSettings);
  autoUnsubscribe.addEventListener('change', saveSettings);
  autoDelete.addEventListener('change', saveSettings);
  rateLimit.addEventListener('change', saveSettings);
  confidenceThreshold.addEventListener('input', (e) => {
    confidenceValue.textContent = e.target.value;
    saveSettings();
  });
  
  // Whitelist
  btnAddWhitelist.addEventListener('click', addToWhitelist);
  whitelistInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') addToWhitelist();
  });
  
  // Blacklist
  btnAddBlacklist.addEventListener('click', addToBlacklist);
  blacklistInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') addToBlacklist();
  });
  
  // Stats
  btnResetStats.addEventListener('click', resetStats);
  
  // Logs
  document.getElementById('btn-clear-unsubscribed').addEventListener('click', () => clearLog('unsubscribed'));
  document.getElementById('btn-clear-deleted').addEventListener('click', () => clearLog('deleted'));
  document.getElementById('btn-clear-failed').addEventListener('click', () => clearLog('failed'));
  document.getElementById('btn-export-unsubscribed').addEventListener('click', () => exportLog('unsubscribed'));
  document.getElementById('btn-export-deleted').addEventListener('click', () => exportLog('deleted'));
  document.getElementById('btn-export-failed').addEventListener('click', () => exportLog('failed'));
}

function loadSettings() {
  chrome.storage.sync.get(['settings'], (result) => {
    const settings = result.settings || {
      previewMode: true,
      autoUnsubscribe: false,
      autoDelete: false,
      rateLimitDelay: 1000,
      minConfidenceForDelete: 0.7
    };
    
    previewMode.checked = settings.previewMode !== false;
    autoUnsubscribe.checked = settings.autoUnsubscribe === true;
    autoDelete.checked = settings.autoDelete === true;
    rateLimit.value = settings.rateLimitDelay || 1000;
    confidenceThreshold.value = settings.minConfidenceForDelete || 0.7;
    confidenceValue.textContent = settings.minConfidenceForDelete || 0.7;
  });
}

function saveSettings() {
  const settings = {
    previewMode: previewMode.checked,
    autoUnsubscribe: autoUnsubscribe.checked,
    autoDelete: autoDelete.checked,
    rateLimitDelay: parseInt(rateLimit.value) || 1000,
    minConfidenceForDelete: parseFloat(confidenceThreshold.value) || 0.7
  };
  
  chrome.storage.sync.set({ settings }, () => {
    showStatus('Settings saved', 'success');
  });
}

function loadWhitelist() {
  chrome.storage.sync.get(['whitelist'], (result) => {
    const whitelist = result.whitelist || [];
    whitelistItems.innerHTML = '';
    whitelist.forEach(item => {
      addWhitelistItem(item);
    });
  });
}

function loadBlacklist() {
  chrome.storage.sync.get(['blacklist'], (result) => {
    const blacklist = result.blacklist || [];
    blacklistItems.innerHTML = '';
    blacklist.forEach(item => {
      addBlacklistItem(item);
    });
  });
}

function addToWhitelist() {
  const value = whitelistInput.value.trim();
  if (!value) {
    showStatus('Please enter an email or domain', 'error');
    return;
  }
  
  chrome.storage.sync.get(['whitelist'], (result) => {
    const whitelist = result.whitelist || [];
    if (whitelist.includes(value)) {
      showStatus('Already in whitelist', 'error');
      return;
    }
    
    whitelist.push(value);
    chrome.storage.sync.set({ whitelist }, () => {
      addWhitelistItem(value);
      whitelistInput.value = '';
      showStatus(`Added "${value}" to whitelist`, 'success');
    });
  });
}

function addToBlacklist() {
  const value = blacklistInput.value.trim();
  if (!value) {
    showStatus('Please enter an email or domain', 'error');
    return;
  }
  
  chrome.storage.sync.get(['blacklist'], (result) => {
    const blacklist = result.blacklist || [];
    if (blacklist.includes(value)) {
      showStatus('Already in blacklist', 'error');
      return;
    }
    
    blacklist.push(value);
    chrome.storage.sync.set({ blacklist }, () => {
      addBlacklistItem(value);
      blacklistInput.value = '';
      showStatus(`Added "${value}" to blacklist`, 'success');
    });
  });
}

function addWhitelistItem(value) {
  const li = document.createElement('li');
  li.className = 'list-item';
  li.innerHTML = `
    <span>${escapeHtml(value)}</span>
    <button class="btn-remove" data-value="${escapeHtml(value)}">Remove</button>
  `;
  
  // Attach event listener to the remove button
  const removeBtn = li.querySelector('.btn-remove');
  removeBtn.addEventListener('click', () => {
    removeFromWhitelist(value);
  });
  
  whitelistItems.appendChild(li);
}

function addBlacklistItem(value) {
  const li = document.createElement('li');
  li.className = 'list-item';
  li.innerHTML = `
    <span>${escapeHtml(value)}</span>
    <button class="btn-remove" data-value="${escapeHtml(value)}">Remove</button>
  `;
  
  // Attach event listener to the remove button
  const removeBtn = li.querySelector('.btn-remove');
  removeBtn.addEventListener('click', () => {
    removeFromBlacklist(value);
  });
  
  blacklistItems.appendChild(li);
}

function removeFromWhitelist(value) {
  chrome.storage.sync.get(['whitelist'], (result) => {
    const whitelist = result.whitelist || [];
    const filtered = whitelist.filter(item => item !== value);
    chrome.storage.sync.set({ whitelist: filtered }, () => {
      loadWhitelist();
      showStatus(`Removed "${value}" from whitelist`, 'success');
    });
  });
}

function removeFromBlacklist(value) {
  chrome.storage.sync.get(['blacklist'], (result) => {
    const blacklist = result.blacklist || [];
    const filtered = blacklist.filter(item => item !== value);
    chrome.storage.sync.set({ blacklist: filtered }, () => {
      loadBlacklist();
      showStatus(`Removed "${value}" from blacklist`, 'success');
    });
  });
}

function loadStats() {
  chrome.storage.local.get(['stats'], (result) => {
    const stats = result.stats || { unsubscribed: 0, deleted: 0, processed: 0 };
    statUnsubscribed.textContent = stats.unsubscribed || 0;
    statDeleted.textContent = stats.deleted || 0;
    statProcessed.textContent = stats.processed || 0;
  });
}

function resetStats() {
  if (confirm('Are you sure you want to reset all statistics?')) {
    chrome.storage.local.set({ stats: { unsubscribed: 0, deleted: 0, processed: 0 } }, () => {
      loadStats();
      showStatus('Statistics reset', 'success');
    });
  }
}

function showStatus(message, type = 'info') {
  statusMessage.textContent = message;
  statusMessage.className = `status-message ${type}`;
  
  setTimeout(() => {
    statusMessage.style.display = 'none';
  }, 3000);
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Functions no longer need to be global since we're using event listeners

// Load activity logs
function loadLogs() {
  chrome.storage.local.get(['activityLogs'], (result) => {
    const logs = result.activityLogs || {
      unsubscribed: [],
      deleted: [],
      failed: []
    };
    
    displayLog('unsubscribed', logs.unsubscribed || []);
    displayLog('deleted', logs.deleted || []);
    displayLog('failed', logs.failed || []);
  });
}

function displayLog(type, logEntries) {
  const container = document.getElementById(`log-${type}`);
  if (!container) return;
  
  if (!logEntries || logEntries.length === 0) {
    container.innerHTML = '<p class="log-empty">No entries yet</p>';
    return;
  }
  
  // Sort by date (newest first)
  const sorted = [...logEntries].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  
  container.innerHTML = sorted.map(entry => {
    const date = new Date(entry.timestamp).toLocaleString();
    return `
      <div class="log-item ${type}">
        <div class="log-item-header">
          <span class="log-item-email">${escapeHtml(entry.senderEmail || entry.sender || 'Unknown')}</span>
          <span class="log-item-date">${date}</span>
        </div>
        ${entry.subject ? `<div class="log-item-subject">${escapeHtml(entry.subject)}</div>` : ''}
        ${entry.reason ? `<div class="log-item-reason">${escapeHtml(entry.reason)}</div>` : ''}
      </div>
    `;
  }).join('');
}

function clearLog(type) {
  if (!confirm(`Are you sure you want to clear the ${type} log?`)) {
    return;
  }
  
  chrome.storage.local.get(['activityLogs'], (result) => {
    const logs = result.activityLogs || {
      unsubscribed: [],
      deleted: [],
      failed: []
    };
    
    logs[type] = [];
    
    chrome.storage.local.set({ activityLogs: logs }, () => {
      displayLog(type, []);
      showStatus(`${type} log cleared`, 'success');
    });
  });
}

function exportLog(type) {
  chrome.storage.local.get(['activityLogs'], (result) => {
    const logs = result.activityLogs || {
      unsubscribed: [],
      deleted: [],
      failed: []
    };
    
    const entries = logs[type] || [];
    if (entries.length === 0) {
      showStatus(`No entries to export in ${type} log`, 'error');
      return;
    }
    
    // Convert to CSV
    const headers = ['Timestamp', 'Sender Email', 'Sender Name', 'Subject', 'Reason'];
    const rows = entries.map(entry => [
      new Date(entry.timestamp).toISOString(),
      entry.senderEmail || '',
      entry.sender || '',
      entry.subject || '',
      entry.reason || ''
    ]);
    
    const csv = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    ].join('\n');
    
    // Download as file
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `gmail-cleaner-${type}-log-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    
    showStatus(`Exported ${entries.length} entries`, 'success');
  });
}

