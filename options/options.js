// Options page script

// DOM elements
const previewMode = document.getElementById('preview-mode');
const autoUnsubscribe = document.getElementById('auto-unsubscribe');
const autoDelete = document.getElementById('auto-delete');
const rateLimit = document.getElementById('rate-limit');
const confidenceThreshold = document.getElementById('confidence-threshold');
const confidenceValue = document.getElementById('confidence-value');
const useArchive = document.getElementById('use-archive');
const advancedUser = document.getElementById('advanced-user');
const scheduledCleanupEnabled = document.getElementById('scheduled-cleanup-enabled');
const scheduledCleanupOptions = document.getElementById('scheduled-cleanup-options');
const cleanupFrequency = document.getElementById('cleanup-frequency');
const cleanupTime = document.getElementById('cleanup-time');
const scheduledAutoUnsubscribe = document.getElementById('scheduled-auto-unsubscribe');
const scheduledAutoDelete = document.getElementById('scheduled-auto-delete');
const btnExportSettings = document.getElementById('btn-export-settings');
const btnImportSettings = document.getElementById('btn-import-settings');
const importSettingsFile = document.getElementById('import-settings-file');
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
  useArchive.addEventListener('change', saveSettings);
  advancedUser.addEventListener('change', () => {
    toggleAdvancedSections();
    saveSettings();
  });
  
  // Scheduled cleanup
  scheduledCleanupEnabled.addEventListener('change', () => {
    scheduledCleanupOptions.style.display = scheduledCleanupEnabled.checked ? 'block' : 'none';
    saveSettings();
  });
  cleanupFrequency.addEventListener('change', saveSettings);
  cleanupTime.addEventListener('change', saveSettings);
  scheduledAutoUnsubscribe.addEventListener('change', saveSettings);
  scheduledAutoDelete.addEventListener('change', saveSettings);
  
  // Export/Import
  btnExportSettings.addEventListener('click', exportSettings);
  btnImportSettings.addEventListener('click', () => importSettingsFile.click());
  importSettingsFile.addEventListener('change', importSettings);
  
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
  
  // Analytics
  document.getElementById('btn-refresh-analytics').addEventListener('click', loadAnalytics);
  document.getElementById('btn-clear-analytics').addEventListener('click', clearAnalytics);
  
  // Rules
  document.getElementById('btn-add-rule').addEventListener('click', addNewRule);
  document.getElementById('rule-editor-close').addEventListener('click', closeRuleEditor);
  document.getElementById('btn-cancel-rule').addEventListener('click', closeRuleEditor);
  document.getElementById('btn-save-rule').addEventListener('click', saveRuleFromEditor);
  document.getElementById('btn-add-condition').addEventListener('click', () => addConditionRow());
  
  // Close modal on background click
  document.getElementById('rule-editor-modal').addEventListener('click', (e) => {
    if (e.target.id === 'rule-editor-modal') {
      closeRuleEditor();
    }
  });
  
  // Load analytics and rules on page load
  loadAnalytics();
  loadRules();
  
  // Initialize advanced sections visibility
  toggleAdvancedSections();
}

/**
 * Toggle visibility of advanced sections
 */
function toggleAdvancedSections() {
  const advancedSections = document.querySelectorAll('.advanced-section');
  const isAdvanced = advancedUser.checked;
  
  advancedSections.forEach(section => {
    section.style.display = isAdvanced ? 'block' : 'none';
  });
}

function loadSettings() {
  chrome.storage.sync.get(['settings'], (result) => {
    const settings = result.settings || {
      previewMode: true,
      autoUnsubscribe: false,
      autoDelete: false,
      rateLimitDelay: 1000,
      minConfidenceForDelete: 0.7,
      useArchiveInsteadOfDelete: false,
      advancedUser: false,
      scheduledCleanup: {
        enabled: false,
        frequency: 'daily',
        time: '09:00',
        autoUnsubscribe: false,
        autoDelete: false
      }
    };
    
    previewMode.checked = settings.previewMode !== false;
    autoUnsubscribe.checked = settings.autoUnsubscribe === true;
    autoDelete.checked = settings.autoDelete === true;
    rateLimit.value = settings.rateLimitDelay || 1000;
    confidenceThreshold.value = settings.minConfidenceForDelete || 0.7;
    confidenceValue.textContent = settings.minConfidenceForDelete || 0.7;
    useArchive.checked = settings.useArchiveInsteadOfDelete === true;
    advancedUser.checked = settings.advancedUser === true;
    
    // Toggle advanced sections based on setting
    toggleAdvancedSections();
    
    // Scheduled cleanup
    const scheduledCleanup = settings.scheduledCleanup || {
      enabled: false,
      frequency: 'daily',
      time: '09:00',
      autoUnsubscribe: false,
      autoDelete: false
    };
    scheduledCleanupEnabled.checked = scheduledCleanup.enabled === true;
    scheduledCleanupOptions.style.display = scheduledCleanup.enabled ? 'block' : 'none';
    cleanupFrequency.value = scheduledCleanup.frequency || 'daily';
    cleanupTime.value = scheduledCleanup.time || '09:00';
    scheduledAutoUnsubscribe.checked = scheduledCleanup.autoUnsubscribe === true;
    scheduledAutoDelete.checked = scheduledCleanup.autoDelete === true;
  });
}

function saveSettings() {
  const settings = {
    previewMode: previewMode.checked,
    autoUnsubscribe: autoUnsubscribe.checked,
    autoDelete: autoDelete.checked,
    rateLimitDelay: parseInt(rateLimit.value) || 1000,
    minConfidenceForDelete: parseFloat(confidenceThreshold.value) || 0.7,
    useArchiveInsteadOfDelete: useArchive.checked,
    advancedUser: advancedUser.checked,
    scheduledCleanup: {
      enabled: scheduledCleanupEnabled.checked,
      frequency: cleanupFrequency.value || 'daily',
      time: cleanupTime.value || '09:00',
      autoUnsubscribe: scheduledAutoUnsubscribe.checked,
      autoDelete: scheduledAutoDelete.checked
    }
  };
  
  chrome.storage.sync.set({ settings }, () => {
    // Notify background script to update scheduled cleanup
    chrome.runtime.sendMessage({
      action: 'saveSettings',
      settings: settings
    }, () => {
      showStatus('Settings saved', 'success');
    });
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

/**
 * Export all settings, whitelist, and blacklist
 */
function exportSettings() {
  chrome.storage.sync.get(['settings', 'whitelist', 'blacklist'], (result) => {
    const exportData = {
      version: '1.0.0',
      exportDate: new Date().toISOString(),
      settings: result.settings || {},
      whitelist: result.whitelist || [],
      blacklist: result.blacklist || []
    };
    
    const json = JSON.stringify(exportData, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `gmail-cleaner-settings-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    
    showStatus('Settings exported successfully', 'success');
  });
}

/**
 * Import settings from JSON file
 */
function importSettings(event) {
  const file = event.target.files[0];
  if (!file) {
    return;
  }
  
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const importData = JSON.parse(e.target.result);
      
      if (!importData.settings || !importData.whitelist || !importData.blacklist) {
        showStatus('Invalid settings file format', 'error');
        return;
      }
      
      if (confirm('This will replace all current settings, whitelist, and blacklist. Continue?')) {
        chrome.storage.sync.set({
          settings: importData.settings,
          whitelist: importData.whitelist,
          blacklist: importData.blacklist
        }, () => {
          // Reload all data
          loadSettings();
          loadWhitelist();
          loadBlacklist();
          showStatus('Settings imported successfully', 'success');
          
          // Notify background script to update scheduled cleanup
          chrome.runtime.sendMessage({
            action: 'saveSettings',
            settings: importData.settings
          });
        });
      }
    } catch (error) {
      showStatus('Error importing settings: ' + error.message, 'error');
    }
    
    // Reset file input
    event.target.value = '';
  };
  
  reader.readAsText(file);
}

/**
 * Load and display analytics
 */
function loadAnalytics() {
  chrome.storage.local.get(['senderAnalytics'], (result) => {
    const analytics = result.senderAnalytics || {};
    const tbody = document.getElementById('top-senders-list');
    
    if (Object.keys(analytics).length === 0) {
      tbody.innerHTML = '<tr><td colspan="3" class="log-empty">No sender data yet. Process some emails to see analytics.</td></tr>';
      return;
    }
    
    // Convert to array and sort by count
    const senders = Object.values(analytics)
      .sort((a, b) => b.count - a.count)
      .slice(0, 20); // Top 20
    
    tbody.innerHTML = senders.map(sender => {
      const name = sender.name || sender.email || 'Unknown';
      const firstSeenDate = new Date(sender.firstSeen);
      const firstSeenFormatted = firstSeenDate.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric' 
      });
      
      return `
        <tr>
          <td>${escapeHtml(name)}</td>
          <td>${sender.count}</td>
          <td>${firstSeenFormatted}</td>
        </tr>
      `;
    }).join('');
  });
}

/**
 * Clear analytics data
 */
function clearAnalytics() {
  if (confirm('Are you sure you want to clear all analytics data?')) {
    chrome.storage.local.set({ senderAnalytics: {} }, () => {
      loadAnalytics();
      showStatus('Analytics cleared', 'success');
    });
  }
}

/**
 * Load and display filtering rules
 */
function loadRules() {
  chrome.storage.sync.get(['filterRules'], (result) => {
    const rules = result.filterRules || [];
    const container = document.getElementById('rules-list');
    
    if (rules.length === 0) {
      container.innerHTML = '<p class="log-empty">No rules defined yet. Click "Add New Rule" to create one.</p>';
      return;
    }
    
    container.innerHTML = rules.map(rule => {
      const conditionsText = rule.conditions?.map(c => 
        `${c.field} ${c.operator} "${c.value}"`
      ).join(' AND ') || 'No conditions';
      
      const actionsText = [];
      if (rule.actions.unsubscribe) actionsText.push('Unsubscribe');
      if (rule.actions.delete) actionsText.push('Delete');
      if (rule.actions.archive) actionsText.push('Archive');
      if (rule.actions.markAsRead) actionsText.push('Mark as Read');
      if (rule.actions.star) actionsText.push('Star');
      
      return `
        <div class="rule-item">
          <div class="rule-item-header">
            <label>
              <input type="checkbox" class="rule-enabled" data-rule-id="${rule.id}" ${rule.enabled ? 'checked' : ''}>
              <span class="rule-name">${escapeHtml(rule.name)}</span>
            </label>
            <div class="rule-actions">
              <button class="btn btn-small btn-secondary edit-rule" data-rule-id="${rule.id}">Edit</button>
              <button class="btn btn-small btn-danger delete-rule" data-rule-id="${rule.id}">Delete</button>
            </div>
          </div>
          <div class="rule-item-details">
            <div><strong>Conditions:</strong> ${escapeHtml(conditionsText)}</div>
            <div><strong>Actions:</strong> ${actionsText.length > 0 ? actionsText.join(', ') : 'None'}</div>
            <div><strong>Priority:</strong> ${rule.priority || 0}</div>
          </div>
        </div>
      `;
    }).join('');
    
    // Attach event listeners
    container.querySelectorAll('.rule-enabled').forEach(checkbox => {
      checkbox.addEventListener('change', (e) => {
        const ruleId = e.target.dataset.ruleId;
        toggleRule(ruleId, e.target.checked);
      });
    });
    
    container.querySelectorAll('.edit-rule').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const ruleId = e.target.dataset.ruleId;
        editRule(ruleId);
      });
    });
    
    container.querySelectorAll('.delete-rule').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const ruleId = e.target.dataset.ruleId;
        deleteRule(ruleId);
      });
    });
  });
}

// Rule editor state
let currentEditingRuleId = null;

// Available fields and operators for conditions
const ruleFields = [
  { value: 'senderEmail', label: 'Sender Email' },
  { value: 'senderName', label: 'Sender Name' },
  { value: 'subject', label: 'Subject' },
  { value: 'body', label: 'Body' },
  { value: 'hasAttachments', label: 'Has Attachments' },
  { value: 'isStarred', label: 'Is Starred' },
  { value: 'isImportant', label: 'Is Important' },
  { value: 'daysOld', label: 'Days Old' }
];

const ruleOperators = [
  { value: 'contains', label: 'Contains' },
  { value: 'notContains', label: 'Does Not Contain' },
  { value: 'equals', label: 'Equals' },
  { value: 'notEquals', label: 'Not Equals' },
  { value: 'startsWith', label: 'Starts With' },
  { value: 'endsWith', label: 'Ends With' },
  { value: 'matchesRegex', label: 'Matches Regex' },
  { value: 'greaterThan', label: 'Greater Than' },
  { value: 'lessThan', label: 'Less Than' }
];

/**
 * Add new rule - opens rule editor
 */
function addNewRule() {
  currentEditingRuleId = null;
  openRuleEditor();
}

/**
 * Open rule editor modal
 */
function openRuleEditor(rule = null) {
  const modal = document.getElementById('rule-editor-modal');
  const title = document.getElementById('rule-editor-title');
  const nameInput = document.getElementById('rule-name-input');
  const conditionsContainer = document.getElementById('rule-conditions-container');
  const priorityInput = document.getElementById('rule-priority-input');
  
  // Reset form
  if (rule) {
    title.textContent = 'Edit Rule';
    nameInput.value = rule.name || '';
    priorityInput.value = rule.priority || 0;
    currentEditingRuleId = rule.id;
    
    // Load conditions
    conditionsContainer.innerHTML = '';
    if (rule.conditions && rule.conditions.length > 0) {
      rule.conditions.forEach(condition => {
        addConditionRow(condition);
      });
    } else {
      addConditionRow();
    }
    
    // Load actions
    document.getElementById('rule-action-unsubscribe').checked = rule.actions?.unsubscribe || false;
    document.getElementById('rule-action-delete').checked = rule.actions?.delete || false;
    document.getElementById('rule-action-archive').checked = rule.actions?.archive || false;
    document.getElementById('rule-action-mark-read').checked = rule.actions?.markAsRead || false;
    document.getElementById('rule-action-star').checked = rule.actions?.star || false;
  } else {
    title.textContent = 'New Rule';
    nameInput.value = '';
    priorityInput.value = 0;
    conditionsContainer.innerHTML = '';
    addConditionRow();
    
    // Reset actions
    document.getElementById('rule-action-unsubscribe').checked = false;
    document.getElementById('rule-action-delete').checked = false;
    document.getElementById('rule-action-archive').checked = false;
    document.getElementById('rule-action-mark-read').checked = false;
    document.getElementById('rule-action-star').checked = false;
  }
  
  modal.classList.add('active');
}

/**
 * Close rule editor modal
 */
function closeRuleEditor() {
  const modal = document.getElementById('rule-editor-modal');
  modal.classList.remove('active');
  currentEditingRuleId = null;
}

/**
 * Add a condition row to the editor
 */
function addConditionRow(condition = null) {
  const container = document.getElementById('rule-conditions-container');
  const row = document.createElement('div');
  row.className = 'rule-condition';
  
  const conditionId = Date.now().toString() + Math.random().toString(36).substr(2, 9);
  
  row.innerHTML = `
    <select class="rule-condition-field" data-condition-id="${conditionId}">
      ${ruleFields.map(f => `<option value="${f.value}" ${condition?.field === f.value ? 'selected' : ''}>${f.label}</option>`).join('')}
    </select>
    <select class="rule-condition-operator" data-condition-id="${conditionId}">
      ${ruleOperators.map(o => `<option value="${o.value}" ${condition?.operator === o.value ? 'selected' : ''}>${o.label}</option>`).join('')}
    </select>
    <input type="text" class="rule-condition-value" data-condition-id="${conditionId}" 
           placeholder="Value" value="${condition?.value || ''}">
    <button type="button" class="rule-condition-remove" data-condition-id="${conditionId}">Remove</button>
  `;
  
  container.appendChild(row);
  
  // Attach remove handler
  row.querySelector('.rule-condition-remove').addEventListener('click', () => {
    if (container.children.length > 1) {
      row.remove();
    } else {
      showStatus('At least one condition is required', 'error');
    }
  });
}

/**
 * Save rule from editor
 */
function saveRuleFromEditor() {
  const nameInput = document.getElementById('rule-name-input');
  const conditionsContainer = document.getElementById('rule-conditions-container');
  const priorityInput = document.getElementById('rule-priority-input');
  
  const name = nameInput.value.trim();
  if (!name) {
    showStatus('Rule name is required', 'error');
    return;
  }
  
  // Collect conditions
  const conditions = [];
  const conditionRows = conditionsContainer.querySelectorAll('.rule-condition');
  conditionRows.forEach(row => {
    const field = row.querySelector('.rule-condition-field').value;
    const operator = row.querySelector('.rule-condition-operator').value;
    const value = row.querySelector('.rule-condition-value').value.trim();
    
    if (field && operator && value) {
      conditions.push({ field, operator, value });
    }
  });
  
  if (conditions.length === 0) {
    showStatus('At least one condition is required', 'error');
    return;
  }
  
  // Collect actions
  const actions = {
    unsubscribe: document.getElementById('rule-action-unsubscribe').checked,
    delete: document.getElementById('rule-action-delete').checked,
    archive: document.getElementById('rule-action-archive').checked,
    markAsRead: document.getElementById('rule-action-mark-read').checked,
    star: document.getElementById('rule-action-star').checked
  };
  
  // Check if at least one action is selected
  if (!Object.values(actions).some(v => v)) {
    showStatus('At least one action is required', 'error');
    return;
  }
  
  const rule = {
    id: currentEditingRuleId || Date.now().toString(),
    name: name,
    enabled: true,
    priority: parseInt(priorityInput.value) || 0,
    stopOnMatch: false,
    conditions: conditions,
    actions: actions
  };
  
  // Save rule
  chrome.storage.sync.get(['filterRules'], (result) => {
    const rules = result.filterRules || [];
    
    if (currentEditingRuleId) {
      // Update existing rule
      const index = rules.findIndex(r => r.id === currentEditingRuleId);
      if (index >= 0) {
        rules[index] = rule;
      }
    } else {
      // Add new rule
      rules.push(rule);
    }
    
    chrome.storage.sync.set({ filterRules: rules }, () => {
      loadRules();
      closeRuleEditor();
      showStatus(`Rule "${name}" ${currentEditingRuleId ? 'updated' : 'created'} successfully`, 'success');
    });
  });
}

/**
 * Edit a rule
 */
function editRule(ruleId) {
  chrome.storage.sync.get(['filterRules'], (result) => {
    const rules = result.filterRules || [];
    const rule = rules.find(r => r.id === ruleId);
    if (rule) {
      openRuleEditor(rule);
    }
  });
}

/**
 * Toggle rule enabled state
 */
function toggleRule(ruleId, enabled) {
  chrome.storage.sync.get(['filterRules'], (result) => {
    const rules = result.filterRules || [];
    const rule = rules.find(r => r.id === ruleId);
    if (rule) {
      rule.enabled = enabled;
      chrome.storage.sync.set({ filterRules: rules }, () => {
        showStatus(`Rule ${enabled ? 'enabled' : 'disabled'}`, 'success');
      });
    }
  });
}

/**
 * Delete a rule
 */
function deleteRule(ruleId) {
  if (!confirm('Are you sure you want to delete this rule?')) {
    return;
  }
  
  chrome.storage.sync.get(['filterRules'], (result) => {
    const rules = result.filterRules || [];
    const filtered = rules.filter(r => r.id !== ruleId);
    chrome.storage.sync.set({ filterRules: filtered }, () => {
      loadRules();
      showStatus('Rule deleted', 'success');
    });
  });
}

/**
 * Edit a rule (simplified - full editor would be more complex)
 */
function editRule(ruleId) {
  chrome.storage.sync.get(['filterRules'], (result) => {
    const rules = result.filterRules || [];
    const rule = rules.find(r => r.id === ruleId);
    if (rule) {
      // For now, just show an alert. Full editor would open a modal/dialog
      alert(`Rule Editor\n\nThis is a simplified version. Full rule editor would allow:\n- Adding/removing conditions\n- Configuring actions\n- Setting priority\n\nRule: ${rule.name}`);
    }
  });
}

