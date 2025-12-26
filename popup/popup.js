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
const btnShortcuts = document.getElementById('btn-shortcuts');
const btnCloseShortcuts = document.getElementById('btn-close-shortcuts');
const shortcutsModal = document.getElementById('shortcuts-modal');

// Stats elements
const statUnsubscribed = document.getElementById('stat-unsubscribed');
const statDeleted = document.getElementById('stat-deleted');
const statProcessed = document.getElementById('stat-processed');

// Initialize popup
document.addEventListener('DOMContentLoaded', async () => {
  try {
    await loadStats();
    await checkCurrentEmail();
    await checkProcessingState();
    await loadPersistedResults();
    setupEventListeners();
    setupStorageListener();
  } catch (error) {
    console.error('Error initializing popup:', error);
    // Still show the popup even if initialization fails
  }
});

/**
 * Check if processing is currently active and show controls
 */
async function checkProcessingState() {
  try {
    chrome.storage.local.get(['processingActive', 'processingPaused', 'processingStopped'], (result) => {
      if (result.processingActive && !result.processingStopped) {
        // Processing is active, show controls
        const processingControls = document.getElementById('processing-controls');
        const btnPause = document.getElementById('btn-pause-processing');
        const btnResume = document.getElementById('btn-resume-processing');
        const btnStop = document.getElementById('btn-stop-processing');
        const btnProcessEmails = document.getElementById('btn-process-emails');
        
        processingControls.style.display = 'block';
        btnProcessEmails.disabled = true;
        
        // Show pause or resume based on state
        if (result.processingPaused) {
          btnPause.style.display = 'none';
          btnResume.style.display = 'inline-block';
        } else {
          btnPause.style.display = 'inline-block';
          btnResume.style.display = 'none';
        }
        
        // Setup handlers (work from any tab)
        btnPause.onclick = () => {
          chrome.tabs.query({ url: 'https://mail.google.com/*' }, (tabs) => {
            tabs.forEach(gmailTab => {
              chrome.tabs.sendMessage(gmailTab.id, { action: 'pauseProcessing' });
            });
          });
          chrome.storage.local.set({ processingPaused: true });
        };
        
        btnResume.onclick = () => {
          chrome.tabs.query({ url: 'https://mail.google.com/*' }, (tabs) => {
            tabs.forEach(gmailTab => {
              chrome.tabs.sendMessage(gmailTab.id, { action: 'resumeProcessing' });
            });
          });
          chrome.storage.local.set({ processingPaused: false });
        };
        
        btnStop.onclick = () => {
          chrome.tabs.query({ url: 'https://mail.google.com/*' }, (tabs) => {
            tabs.forEach(gmailTab => {
              chrome.tabs.sendMessage(gmailTab.id, { action: 'stopProcessing' });
            });
          });
          chrome.storage.local.set({ processingActive: false, processingPaused: false, processingStopped: true });
        };
      } else {
        // Processing is not active, hide controls
        const processingControls = document.getElementById('processing-controls');
        const btnProcessEmails = document.getElementById('btn-process-emails');
        if (processingControls) {
          processingControls.style.display = 'none';
        }
        if (btnProcessEmails) {
          btnProcessEmails.disabled = false;
        }
      }
    });
  } catch (error) {
    console.error('Error checking processing state:', error);
  }
}

/**
 * Listen for storage changes to update UI in real-time
 */
function setupStorageListener() {
  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName === 'local') {
      // Check if processing state changed
      if (changes.processingActive || changes.processingPaused || changes.processingStopped) {
        checkProcessingState();
      }
      
      // Check if results were updated (for real-time updates during processing)
      if (changes.persistedResults) {
        const newResults = changes.persistedResults.newValue;
        if (newResults && newResults.length > 0) {
          // Update the results table in real-time
          displayResults(newResults);
        }
      }
    }
  });
}

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
  
  // Setup processing control handlers (these work from any tab)
  const btnPause = document.getElementById('btn-pause-processing');
  const btnResume = document.getElementById('btn-resume-processing');
  const btnStop = document.getElementById('btn-stop-processing');
  
  if (btnPause) {
    btnPause.addEventListener('click', () => {
      chrome.tabs.query({ url: 'https://mail.google.com/*' }, (tabs) => {
        tabs.forEach(gmailTab => {
          chrome.tabs.sendMessage(gmailTab.id, { action: 'pauseProcessing' });
        });
      });
      chrome.storage.local.set({ processingPaused: true });
    });
  }
  
  if (btnResume) {
    btnResume.addEventListener('click', () => {
      chrome.tabs.query({ url: 'https://mail.google.com/*' }, (tabs) => {
        tabs.forEach(gmailTab => {
          chrome.tabs.sendMessage(gmailTab.id, { action: 'resumeProcessing' });
        });
      });
      chrome.storage.local.set({ processingPaused: false });
    });
  }
  
  if (btnStop) {
    btnStop.addEventListener('click', () => {
      chrome.tabs.query({ url: 'https://mail.google.com/*' }, (tabs) => {
        tabs.forEach(gmailTab => {
          chrome.tabs.sendMessage(gmailTab.id, { action: 'stopProcessing' });
        });
      });
      chrome.storage.local.set({ processingActive: false, processingPaused: false, processingStopped: true });
    });
  }
  
  // Keyboard shortcuts modal
  if (btnShortcuts) {
    btnShortcuts.addEventListener('click', () => {
      shortcutsModal.classList.add('active');
    });
  }
  
  if (btnCloseShortcuts) {
    btnCloseShortcuts.addEventListener('click', () => {
      shortcutsModal.classList.remove('active');
    });
  }
  
  // Close modal when clicking outside
  if (shortcutsModal) {
    shortcutsModal.addEventListener('click', (e) => {
      if (e.target === shortcutsModal) {
        shortcutsModal.classList.remove('active');
      }
    });
  }
  
  // Preview item modal handlers
  const previewItemModal = document.getElementById('preview-item-modal');
  const btnClosePreviewModal = document.getElementById('btn-close-preview-modal');
  const btnAddWhitelistFromPreview = document.getElementById('btn-add-whitelist-from-preview');
  const btnAddBlacklistFromPreview = document.getElementById('btn-add-blacklist-from-preview');
  
  if (btnClosePreviewModal) {
    btnClosePreviewModal.addEventListener('click', closePreviewItemModal);
  }
  
  if (previewItemModal) {
    previewItemModal.addEventListener('click', (e) => {
      if (e.target === previewItemModal) {
        closePreviewItemModal();
      }
    });
  }
  
  if (btnAddWhitelistFromPreview) {
    btnAddWhitelistFromPreview.addEventListener('click', handleAddToWhitelistFromPreview);
  }
  
  if (btnAddBlacklistFromPreview) {
    btnAddBlacklistFromPreview.addEventListener('click', handleAddToBlacklistFromPreview);
  }
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
            
            // Mark processing as active
            chrome.storage.local.set({ processingActive: true, processingPaused: false, processingStopped: false });
            
            // Clear persisted results when starting new processing
            chrome.storage.local.remove(['persistedResults']);
            
            // Show processing controls (handlers are already set up in setupEventListeners)
            document.getElementById('processing-controls').style.display = 'block';
            const btnPause = document.getElementById('btn-pause-processing');
            const btnResume = document.getElementById('btn-resume-processing');
            
            // Update button visibility based on current state
            chrome.storage.local.get(['processingPaused'], (result) => {
              if (result.processingPaused) {
                btnPause.style.display = 'none';
                btnResume.style.display = 'inline-block';
              } else {
                btnPause.style.display = 'inline-block';
                btnResume.style.display = 'none';
              }
            });
            
            chrome.tabs.sendMessage(tab.id, {
              action: 'processEmails',
              options: {
                maxEmails: 50,
                previewOnly: previewOnly,
                autoUnsubscribe: autoUnsubscribe,
                autoDelete: autoDelete
              }
            }, async (response) => {
              // Mark processing as inactive
              chrome.storage.local.set({ processingActive: false, processingPaused: false, processingStopped: false });
              
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
                
                // Results should already be in storage and displayed via storage listener
                // But update here as well in case listener didn't fire
                if (results.emailDetails && results.emailDetails.length > 0) {
                  displayResults(results.emailDetails);
                } else {
                  // Try loading from storage in case popup was closed during processing
                  chrome.storage.local.get(['persistedResults'], (storageResult) => {
                    if (storageResult.persistedResults && storageResult.persistedResults.length > 0) {
                      displayResults(storageResult.persistedResults);
                    }
                  });
                }
                
                await loadStats();
              } else {
                showStatus(response?.message || 'Error processing emails', 'error');
                
                // Even on error, try to load any partial results from storage
                chrome.storage.local.get(['persistedResults'], (storageResult) => {
                  if (storageResult.persistedResults && storageResult.persistedResults.length > 0) {
                    displayResults(storageResult.persistedResults);
                  }
                });
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
    // Clear persisted results
    chrome.storage.local.remove(['persistedResults']);
    return;
  }
  
  // Save results to storage for persistence
  chrome.storage.local.set({ persistedResults: emailDetails });
  
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
  
  // Attach double-click listeners to table rows
  attachDoubleClickListeners();
  
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

/**
 * Attach double-click listeners to preview table rows
 */
function attachDoubleClickListeners() {
  const rows = resultsTbody.querySelectorAll('tr');
  
  rows.forEach(row => {
    // Remove existing listener to avoid duplicates
    const newRow = row.cloneNode(true);
    row.parentNode.replaceChild(newRow, row);
    
    newRow.addEventListener('dblclick', (e) => {
      e.stopPropagation();
      const senderEmail = newRow.dataset.senderEmail || '';
      const senderName = newRow.dataset.senderName || '';
      openPreviewItemModal(senderEmail || senderName);
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
    button.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" style="width: 14px; height: 14px; vertical-align: middle; margin-right: 4px;"><path stroke-linecap="round" stroke-linejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" /></svg> Blacklist';
    showStatus('Error: ' + error.message, 'error');
  }
}

function getUnsubscribeBadge(status, reason) {
  const badges = {
    'will_unsubscribe': { 
      class: 'will-unsubscribe', 
      text: 'Will Unsubscribe', 
      icon: '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>' 
    },
    'not_found': { 
      class: 'not-found', 
      text: 'Not Found', 
      icon: '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 5.25h.008v.008H12v-.008z" /></svg>' 
    },
    'protected': { 
      class: 'protected', 
      text: 'Protected', 
      icon: '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" /></svg>' 
    },
    'error': { 
      class: 'error', 
      text: 'Error', 
      icon: '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" /></svg>' 
    }
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
    'will_delete': { 
      class: 'will-delete', 
      text: 'Will Delete', 
      icon: '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" /></svg>' 
    },
    'will_not_delete': { 
      class: 'will-not-delete', 
      text: 'Keep', 
      icon: '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>' 
    },
    'protected': { 
      class: 'protected', 
      text: 'Protected', 
      icon: '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" /></svg>' 
    },
    'uncertain': { 
      class: 'uncertain', 
      text: 'Uncertain', 
      icon: '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 5.25h.008v.008H12v-.008z" /></svg>' 
    },
    'likely_legitimate': { 
      class: 'likely-legitimate', 
      text: 'Legitimate', 
      icon: '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>' 
    },
    'error': { 
      class: 'error', 
      text: 'Error', 
      icon: '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" /></svg>' 
    }
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
  // Clear persisted results
  chrome.storage.local.remove(['persistedResults']);
}

/**
 * Load persisted results from storage when popup opens
 */
async function loadPersistedResults() {
  try {
    chrome.storage.local.get(['persistedResults'], (result) => {
      if (result.persistedResults && result.persistedResults.length > 0) {
        // Restore the results table
        displayResults(result.persistedResults);
      }
    });
  } catch (error) {
    console.error('Error loading persisted results:', error);
  }
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

/**
 * Open preview item modal for double-clicked row
 */
function openPreviewItemModal(email) {
  const modal = document.getElementById('preview-item-modal');
  const emailDisplay = document.getElementById('preview-modal-email');
  
  if (!email) {
    showStatus('No email information available', 'error');
    return;
  }
  
  // Extract domain if it's a full email
  const domain = extractDomainFromEmail(email);
  const displayText = domain || email;
  
  emailDisplay.textContent = `Add "${displayText}" to:`;
  modal.classList.add('active');
  
  // Store the email/domain for the action buttons
  modal.dataset.email = displayText;
}

/**
 * Close preview item modal
 */
function closePreviewItemModal() {
  const modal = document.getElementById('preview-item-modal');
  modal.classList.remove('active');
}

/**
 * Extract domain from email address
 */
function extractDomainFromEmail(email) {
  if (!email) return '';
  
  // If it's already a domain (starts with @ or no @), return as is
  if (email.startsWith('@') || !email.includes('@')) {
    return email.startsWith('@') ? email : `@${email}`;
  }
  
  // Extract domain from email
  const match = email.match(/@([^@]+)$/);
  if (match) {
    return `@${match[1]}`;
  }
  
  return email;
}

/**
 * Handle add to whitelist from preview modal
 */
function handleAddToWhitelistFromPreview() {
  const modal = document.getElementById('preview-item-modal');
  const email = modal.dataset.email;
  
  if (!email) {
    showStatus('No email information available', 'error');
    return;
  }
  
  chrome.storage.sync.get(['whitelist'], (result) => {
    const whitelist = result.whitelist || [];
    if (whitelist.includes(email)) {
      showStatus(`"${email}" is already in whitelist`, 'info');
      closePreviewItemModal();
      return;
    }
    
    whitelist.push(email);
    chrome.storage.sync.set({ whitelist }, () => {
      showStatus(`Added "${email}" to whitelist`, 'success');
      closePreviewItemModal();
    });
  });
}

/**
 * Handle add to blacklist from preview modal
 */
function handleAddToBlacklistFromPreview() {
  const modal = document.getElementById('preview-item-modal');
  const email = modal.dataset.email;
  
  if (!email) {
    showStatus('No email information available', 'error');
    return;
  }
  
  chrome.storage.sync.get(['blacklist'], (result) => {
    const blacklist = result.blacklist || [];
    if (blacklist.includes(email)) {
      showStatus(`"${email}" is already in blacklist`, 'info');
      closePreviewItemModal();
      return;
    }
    
    blacklist.push(email);
    chrome.storage.sync.set({ blacklist }, () => {
      showStatus(`Added "${email}" to blacklist`, 'success');
      closePreviewItemModal();
    });
  });
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


