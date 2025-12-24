// Popup script for Gmail Cleaner extension

// DOM elements
const btnUnsubscribe = document.getElementById('btn-unsubscribe');
const btnProcessEmails = document.getElementById('btn-process-emails');
const btnDeleteUnread = document.getElementById('btn-delete-unread');
const btnProcessDelete = document.getElementById('btn-process-delete');
const btnAddWhitelist = document.getElementById('btn-add-whitelist');
const btnAddBlacklist = document.getElementById('btn-add-blacklist');
const linkSettings = document.getElementById('link-settings');
const statusMessage = document.getElementById('status-message');
const currentEmailSection = document.getElementById('current-email-section');
const resultsSection = document.getElementById('results-section');
const resultsTbody = document.getElementById('results-tbody');
const btnClearResults = document.getElementById('btn-clear-results');

// Stats elements
const statUnsubscribed = document.getElementById('stat-unsubscribed');
const statDeleted = document.getElementById('stat-deleted');
const statProcessed = document.getElementById('stat-processed');

// Initialize popup
document.addEventListener('DOMContentLoaded', async () => {
  try {
    await loadStats();
    await checkCurrentEmail();
    setupEventListeners();
  } catch (error) {
    console.error('Error initializing popup:', error);
    // Still show the popup even if initialization fails
  }
});

function setupEventListeners() {
  btnUnsubscribe.addEventListener('click', handleUnsubscribe);
  btnProcessEmails.addEventListener('click', handleProcessEmails);
  btnDeleteUnread.addEventListener('click', handleDeleteUnread);
  btnProcessDelete.addEventListener('click', handleProcessDelete);
  btnAddWhitelist.addEventListener('click', handleAddWhitelist);
  btnAddBlacklist.addEventListener('click', handleAddBlacklist);
  linkSettings.addEventListener('click', (e) => {
    e.preventDefault();
    chrome.runtime.openOptionsPage();
  });
  btnClearResults.addEventListener('click', clearResults);
}

async function loadStats() {
  try {
    chrome.storage.local.get(['stats'], (result) => {
      const stats = result.stats || { unsubscribed: 0, deleted: 0, processed: 0 };
      statUnsubscribed.textContent = stats.unsubscribed || 0;
      statDeleted.textContent = stats.deleted || 0;
      statProcessed.textContent = stats.processed || 0;
    });
  } catch (error) {
    console.error('Error loading stats:', error);
  }
}

async function checkCurrentEmail() {
  try {
    // Get current Gmail tab
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    if (!tab || !tab.url || !tab.url.includes('mail.google.com')) {
      // Not on Gmail - this is fine, just don't show current email section
      return;
    }
    
    // Request current email data from content script
    chrome.tabs.sendMessage(tab.id, { action: 'getCurrentEmail' }, (response) => {
      if (chrome.runtime.lastError) {
        // Content script may not be ready or Gmail not fully loaded - this is normal
        // Silently fail - user can still use other features
        return;
      }
      
      if (response && response.emailData) {
        displayCurrentEmail(response.emailData);
      }
    });
  } catch (error) {
    // Silently handle errors - popup should still work
    console.debug('Could not check current email:', error.message);
  }
}

function displayCurrentEmail(emailData) {
  document.getElementById('email-from').textContent = 
    emailData.senderName || emailData.senderEmail || 'Unknown';
  document.getElementById('email-subject').textContent = 
    emailData.subject || 'No subject';
  currentEmailSection.style.display = 'block';
  
  // Store email data for whitelist/blacklist actions
  currentEmailSection.dataset.senderEmail = emailData.senderEmail || '';
  currentEmailSection.dataset.senderName = emailData.senderName || '';
}

async function handleUnsubscribe() {
  try {
    showStatus('Processing unsubscribe...', 'info');
    btnUnsubscribe.disabled = true;
    
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    if (!tab.url?.includes('mail.google.com')) {
      showStatus('Please open Gmail first', 'error');
      btnUnsubscribe.disabled = false;
      return;
    }
    
    chrome.tabs.sendMessage(tab.id, { action: 'unsubscribe' }, async (response) => {
      btnUnsubscribe.disabled = false;
      
      if (chrome.runtime.lastError) {
        showStatus('Error: ' + chrome.runtime.lastError.message, 'error');
        return;
      }
      
      if (response?.success) {
        showStatus('Successfully unsubscribed!', 'success');
        await loadStats();
      } else {
        showStatus(response?.message || 'Could not unsubscribe', 'error');
      }
    });
  } catch (error) {
    btnUnsubscribe.disabled = false;
    showStatus('Error: ' + error.message, 'error');
  }
}

async function handleProcessEmails() {
  try {
    // Get settings to check preview mode and auto settings
    chrome.storage.sync.get(['settings'], (result) => {
      try {
        const settings = result.settings || {
          previewMode: true,
          autoUnsubscribe: false,
          autoDelete: false
        };
        
        const previewOnly = settings.previewMode !== false;
        const autoUnsubscribe = settings.autoUnsubscribe === true;
        const autoDelete = settings.autoDelete === true;
        
        const statusMsg = previewOnly 
          ? 'Processing emails (preview mode)...' 
          : 'Processing emails (LIVE MODE - changes will be made)...';
        showStatus(statusMsg, previewOnly ? 'info' : 'error');
        btnProcessEmails.disabled = true;
        
        chrome.tabs.query({ active: true, currentWindow: true }, async ([tab]) => {
          try {
            if (!tab?.url?.includes('mail.google.com')) {
              showStatus('Please open Gmail first', 'error');
              btnProcessEmails.disabled = false;
              return;
            }
            
            // Show confirmation if not in preview mode
            if (!previewOnly && (autoUnsubscribe || autoDelete)) {
              const confirmed = confirm(
                '⚠️ WARNING: This will make REAL changes to your emails!\n\n' +
                `Auto Unsubscribe: ${autoUnsubscribe ? 'YES' : 'NO'}\n` +
                `Auto Delete: ${autoDelete ? 'YES' : 'NO'}\n\n` +
                'Are you sure you want to proceed?'
              );
              
              if (!confirmed) {
                btnProcessEmails.disabled = false;
                showStatus('Cancelled', 'info');
                return;
              }
            }
            
            // Show processing controls
            document.getElementById('processing-controls').style.display = 'block';
            const btnPause = document.getElementById('btn-pause-processing');
            const btnResume = document.getElementById('btn-resume-processing');
            const btnStop = document.getElementById('btn-stop-processing');
            
            // Setup pause/resume/stop handlers
            btnPause.onclick = () => {
              chrome.tabs.sendMessage(tab.id, { action: 'pauseProcessing' });
              btnPause.style.display = 'none';
              btnResume.style.display = 'inline-block';
            };
            
            btnResume.onclick = () => {
              chrome.tabs.sendMessage(tab.id, { action: 'resumeProcessing' });
              btnResume.style.display = 'none';
              btnPause.style.display = 'inline-block';
            };
            
            btnStop.onclick = () => {
              chrome.tabs.sendMessage(tab.id, { action: 'stopProcessing' });
              document.getElementById('processing-controls').style.display = 'none';
              btnProcessEmails.disabled = false;
            };
            
            chrome.tabs.sendMessage(tab.id, {
              action: 'processEmails',
              options: {
                maxEmails: 50,
                previewOnly: previewOnly,
                autoUnsubscribe: autoUnsubscribe,
                autoDelete: autoDelete
              }
            }, async (response) => {
              // Hide processing controls
              document.getElementById('processing-controls').style.display = 'none';
              btnProcessEmails.disabled = false;
              
              if (chrome.runtime.lastError) {
                showStatus('Error: ' + chrome.runtime.lastError.message, 'error');
                return;
              }
              
              if (response?.success) {
                const { results } = response;
                const stoppedText = results.stopped ? ' (stopped)' : '';
                const previewText = previewOnly 
                  ? `Preview: ${results.processed} processed, ${results.unsubscribed} would unsubscribe, ${results.deleted} would delete${stoppedText}`
                  : `Done: ${results.processed} processed, ${results.unsubscribed} unsubscribed, ${results.deleted} deleted${stoppedText}`;
                showStatus(previewText, previewOnly ? 'info' : 'success');
                displayResults(results.emailDetails || []);
                await loadStats();
              } else {
                showStatus(response?.message || 'Error processing emails', 'error');
              }
            });
          } catch (error) {
            btnProcessEmails.disabled = false;
            showStatus('Error: ' + error.message, 'error');
          }
        });
      } catch (error) {
        btnProcessEmails.disabled = false;
        showStatus('Error: ' + error.message, 'error');
      }
    });
  } catch (error) {
    btnProcessEmails.disabled = false;
    showStatus('Error: ' + error.message, 'error');
  }
}

async function handleProcessDelete() {
  const confirmed = confirm(
    '⚠️ WARNING: This will DELETE emails based on classification.\n\n' +
    'Are you sure you want to proceed? This action cannot be undone easily.\n\n' +
    'Make sure you have:\n' +
    '1. Set up your whitelist properly\n' +
    '2. Tested with preview mode first\n' +
    '3. Backed up important emails'
  );
  
  if (!confirmed) {
    return;
  }
  
  try {
    showStatus('Processing and deleting emails...', 'info');
    btnProcessDelete.disabled = true;
    
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    if (!tab.url?.includes('mail.google.com')) {
      showStatus('Please open Gmail first', 'error');
      btnProcessDelete.disabled = false;
      return;
    }
    
    chrome.tabs.sendMessage(tab.id, {
      action: 'processEmails',
      options: {
        maxEmails: 10,
        previewOnly: false,
        autoUnsubscribe: true,
        autoDelete: true
      }
    }, async (response) => {
      btnProcessDelete.disabled = false;
      
      if (chrome.runtime.lastError) {
        showStatus('Error: ' + chrome.runtime.lastError.message, 'error');
        return;
      }
      
      if (response?.success) {
        const { results } = response;
        showStatus(
          `Done: ${results.processed} processed, ${results.unsubscribed} unsubscribed, ${results.deleted} deleted`,
          'success'
        );
        await loadStats();
      } else {
        showStatus(response?.message || 'Error processing emails', 'error');
      }
    });
  } catch (error) {
    btnProcessDelete.disabled = false;
    showStatus('Error: ' + error.message, 'error');
  }
}

async function handleAddWhitelist() {
  const senderEmail = currentEmailSection.dataset.senderEmail;
  const senderName = currentEmailSection.dataset.senderName;
  const identifier = senderEmail || senderName;
  
  if (!identifier) {
    showStatus('No email information available', 'error');
    return;
  }
  
  try {
    chrome.runtime.sendMessage({
      action: 'addToWhitelist',
      email: identifier
    }, (response) => {
      if (response?.success) {
        showStatus(`Added "${identifier}" to whitelist`, 'success');
      } else {
        showStatus('Error adding to whitelist', 'error');
      }
    });
  } catch (error) {
    showStatus('Error: ' + error.message, 'error');
  }
}

async function handleAddBlacklist() {
  const senderEmail = currentEmailSection.dataset.senderEmail;
  const senderName = currentEmailSection.dataset.senderName;
  const identifier = senderEmail || senderName;
  
  if (!identifier) {
    showStatus('No email information available', 'error');
    return;
  }
  
  try {
    chrome.runtime.sendMessage({
      action: 'addToBlacklist',
      email: identifier
    }, (response) => {
      if (response?.success) {
        showStatus(`Added "${identifier}" to blacklist`, 'success');
      } else {
        showStatus('Error adding to blacklist', 'error');
      }
    });
  } catch (error) {
    showStatus('Error: ' + error.message, 'error');
  }
}

function showStatus(message, type = 'info') {
  statusMessage.textContent = message;
  statusMessage.className = `status-message ${type}`;
  
  // Auto-hide after 5 seconds for success/info
  if (type !== 'error') {
    setTimeout(() => {
      statusMessage.style.display = 'none';
    }, 5000);
  }
}

function displayResults(emailDetails) {
  if (!emailDetails || emailDetails.length === 0) {
    resultsSection.style.display = 'none';
    return;
  }
  
  // Clear existing results
  resultsTbody.innerHTML = '';
  
  // Populate table
  emailDetails.forEach((email, index) => {
    const row = document.createElement('tr');
    
    // Unsubscribe status badge
    const unsubscribeBadge = getUnsubscribeBadge(email.unsubscribeStatus, email.unsubscribeReason);
    
    // Delete status badge
    const deleteBadge = getDeleteBadge(email.deleteStatus, email.deleteReason, email.confidence);
    
    // Create action buttons
    const actionButtons = `
      <div class="row-actions">
        <button class="btn-action btn-whitelist" data-index="${index}" data-sender="${escapeHtml(email.senderEmail || email.sender)}" title="Add to Whitelist">
          🛡️ Whitelist
        </button>
        <button class="btn-action btn-blacklist" data-index="${index}" data-sender="${escapeHtml(email.senderEmail || email.sender)}" title="Add to Blacklist">
          🗑️ Blacklist
        </button>
      </div>
    `;
    
    row.innerHTML = `
      <td>
        <div class="email-sender" title="${escapeHtml(email.senderEmail || email.sender)}">
          ${escapeHtml(email.sender)}
        </div>
      </td>
      <td>
        <div class="email-subject" title="${escapeHtml(email.subject)}">
          ${escapeHtml(email.subject)}
        </div>
      </td>
      <td>${unsubscribeBadge}</td>
      <td>${deleteBadge}</td>
      <td>${actionButtons}</td>
    `;
    
    resultsTbody.appendChild(row);
    
    // Store email data in row for later access
    row.dataset.emailIndex = index;
    row.dataset.senderEmail = email.senderEmail || '';
    row.dataset.senderName = email.sender || '';
  });
  
  // Show results section
  resultsSection.style.display = 'block';
  
  // Attach event listeners to action buttons
  attachActionButtonListeners();
  
  // Scroll to results
  resultsSection.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function attachActionButtonListeners() {
  // Remove existing listeners by cloning and replacing
  const whitelistButtons = resultsTbody.querySelectorAll('.btn-whitelist');
  const blacklistButtons = resultsTbody.querySelectorAll('.btn-blacklist');
  
  whitelistButtons.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const row = btn.closest('tr');
      const senderEmail = row.dataset.senderEmail || btn.dataset.sender;
      handleAddToWhitelistFromTable(senderEmail, btn);
    });
  });
  
  blacklistButtons.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const row = btn.closest('tr');
      const senderEmail = row.dataset.senderEmail || btn.dataset.sender;
      handleAddToBlacklistFromTable(senderEmail, btn);
    });
  });
}

async function handleAddToWhitelistFromTable(senderEmail, button) {
  if (!senderEmail) {
    showStatus('No sender email available', 'error');
    return;
  }
  
  button.disabled = true;
  button.textContent = 'Adding...';
  
  try {
    chrome.runtime.sendMessage({
      action: 'addToWhitelist',
      email: senderEmail
    }, (response) => {
      button.disabled = false;
      if (response?.success) {
        button.textContent = '✓ Whitelisted';
        button.classList.add('btn-success');
        showStatus(`Added "${senderEmail}" to whitelist`, 'success');
      } else {
        button.textContent = '🛡️ Whitelist';
        showStatus('Error adding to whitelist', 'error');
      }
    });
  } catch (error) {
    button.disabled = false;
    button.textContent = '🛡️ Whitelist';
    showStatus('Error: ' + error.message, 'error');
  }
}

async function handleAddToBlacklistFromTable(senderEmail, button) {
  if (!senderEmail) {
    showStatus('No sender email available', 'error');
    return;
  }
  
  button.disabled = true;
  button.textContent = 'Adding...';
  
  try {
    chrome.runtime.sendMessage({
      action: 'addToBlacklist',
      email: senderEmail
    }, (response) => {
      button.disabled = false;
      if (response?.success) {
        button.textContent = '✓ Blacklisted';
        button.classList.add('btn-success');
        showStatus(`Added "${senderEmail}" to blacklist`, 'success');
      } else {
        button.textContent = '🗑️ Blacklist';
        showStatus('Error adding to blacklist', 'error');
      }
    });
  } catch (error) {
    button.disabled = false;
    button.textContent = '🗑️ Blacklist';
    showStatus('Error: ' + error.message, 'error');
  }
}

function getUnsubscribeBadge(status, reason) {
  const badges = {
    'will_unsubscribe': { class: 'will-unsubscribe', text: 'Will Unsubscribe', icon: '✓' },
    'not_found': { class: 'not-found', text: 'Not Found', icon: '✗' },
    'error': { class: 'error', text: 'Error', icon: '!' }
  };
  
  const badge = badges[status] || badges['not_found'];
  return `
    <span class="status-badge ${badge.class}" title="${escapeHtml(reason)}">
      ${badge.icon} ${badge.text}
    </span>
    <span class="status-reason">${escapeHtml(reason)}</span>
  `;
}

function getDeleteBadge(status, reason, confidence) {
  const badges = {
    'will_delete': { class: 'will-delete', text: 'Will Delete', icon: '🗑️' },
    'will_not_delete': { class: 'will-not-delete', text: 'Keep', icon: '✓' },
    'protected': { class: 'protected', text: 'Protected', icon: '🛡️' },
    'uncertain': { class: 'uncertain', text: 'Uncertain', icon: '?' },
    'likely_legitimate': { class: 'likely-legitimate', text: 'Legitimate', icon: '✓' },
    'error': { class: 'error', text: 'Error', icon: '!' }
  };
  
  const badge = badges[status] || badges['will_not_delete'];
  const confidenceText = confidence > 0 ? ` (${(confidence * 100).toFixed(0)}%)` : '';
  return `
    <span class="status-badge ${badge.class}" title="${escapeHtml(reason || '')}${confidenceText}">
      ${badge.icon} ${badge.text}
    </span>
    ${reason ? `<span class="status-reason">${escapeHtml(reason)}${confidenceText}</span>` : ''}
  `;
}

function clearResults() {
  resultsTbody.innerHTML = '';
  resultsSection.style.display = 'none';
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

async function handleDeleteUnread() {
  // Show options dialog
  const option = confirm(
    'Delete Unread Emails - Choose Option:\n\n' +
    'Click OK for: Delete all unread (respects whitelist, marks whitelisted as read)\n' +
    'Click Cancel for: Delete ALL unread (ignores whitelist)'
  );
  
  const respectWhitelist = option; // OK = true (respect whitelist), Cancel = false (delete all)
  
  const confirmMsg = respectWhitelist
    ? '⚠️ This will DELETE all unread emails EXCEPT those in your whitelist.\n\nWhitelisted emails will be marked as READ.\n\nAre you sure?'
    : '⚠️ WARNING: This will DELETE ALL unread emails, including whitelisted ones!\n\nThis action cannot be undone easily.\n\nAre you absolutely sure?';
  
  if (!confirm(confirmMsg)) {
    return;
  }
  
  try {
    showStatus('Deleting unread emails...', 'info');
    btnDeleteUnread.disabled = true;
    
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    if (!tab.url?.includes('mail.google.com')) {
      showStatus('Please open Gmail first', 'error');
      btnDeleteUnread.disabled = false;
      return;
    }
    
    chrome.tabs.sendMessage(tab.id, {
      action: 'deleteUnread',
      options: {
        respectWhitelist: respectWhitelist
      }
    }, async (response) => {
      btnDeleteUnread.disabled = false;
      
      if (chrome.runtime.lastError) {
        showStatus('Error: ' + chrome.runtime.lastError.message, 'error');
        return;
      }
      
      if (response?.success) {
        const { results } = response;
        showStatus(
          `Deleted ${results.deleted} unread emails${respectWhitelist ? `, marked ${results.markedRead} as read` : ''}`,
          'success'
        );
        await loadStats();
      } else {
        showStatus(response?.message || 'Error deleting unread emails', 'error');
      }
    });
  } catch (error) {
    btnDeleteUnread.disabled = false;
    showStatus('Error: ' + error.message, 'error');
  }
}


