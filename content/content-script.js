// Content script injected into Gmail pages
// Handles Gmail DOM interaction and email processing

// Wait for Gmail to load
let gmailReady = false;

function waitForGmail() {
  if (document.querySelector('[role="main"]') || document.querySelector('.nH')) {
    gmailReady = true;
    initializeGmailCleaner();
  } else {
    setTimeout(waitForGmail, 500);
  }
}

function initializeGmailCleaner() {
  console.log('Gmail Cleaner: Gmail detected, initializing...');
  
  // Listen for messages from popup or background
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'unsubscribe') {
      handleUnsubscribe().then(result => {
        sendResponse(result);
      });
      return true; // Will respond asynchronously
    }
    
    if (request.action === 'processEmails') {
      handleProcessEmails(request.options).then(result => {
        sendResponse(result);
      });
      return true;
    }
    
    if (request.action === 'deleteUnread') {
      handleDeleteUnread(request.options).then(result => {
        sendResponse(result);
      });
      return true;
    }
    
    if (request.action === 'deleteUnread') {
      handleDeleteUnread(request.options).then(result => {
        sendResponse(result);
      });
      return true;
    }
    
    if (request.action === 'getCurrentEmail') {
      const emailData = getCurrentEmailData();
      sendResponse({ emailData });
      return false;
    }
  });
}

/**
 * Get data for currently viewed email
 */
function getCurrentEmailData() {
  // Find the email view - Gmail uses various selectors
  const emailView = document.querySelector('[data-message-id]') || 
                    document.querySelector('.nH.if') ||
                    document.querySelector('.a3s') ||
                    document.querySelector('[role="main"] .nH') ||
                    document.querySelector('.ii.gt');
  
  if (!emailView) {
    return null;
  }
  
  // Extract email data
  const emailData = extractEmailData(emailView);
  
  // Try to get more info from Gmail's structure
  // Gmail stores sender info in various places
  const header = emailView.querySelector('.gD') || 
                 emailView.querySelector('.go') ||
                 emailView.querySelector('[email]') ||
                 emailView.querySelector('.go');
  
  if (header) {
    const emailAttr = header.getAttribute('email');
    if (emailAttr) {
      emailData.senderEmail = emailAttr;
    } else {
      // Try to extract from text content
      const emailMatch = header.textContent?.match(/[\w\.-]+@[\w\.-]+\.\w+/);
      if (emailMatch) {
        emailData.senderEmail = emailMatch[0];
      }
    }
    
    // Get sender name (text before email or full text)
    const headerText = header.textContent?.trim() || '';
    if (headerText && !headerText.includes('@')) {
      emailData.senderName = headerText;
    } else if (headerText) {
      // Extract name before email
      const nameMatch = headerText.match(/^(.+?)\s*[\w\.-]+@/);
      if (nameMatch) {
        emailData.senderName = nameMatch[1].trim();
      }
    }
  }
  
  // Try alternative method to get sender from Gmail's thread view
  if (!emailData.senderEmail) {
    const threadHeader = document.querySelector('.gD[email]');
    if (threadHeader) {
      emailData.senderEmail = threadHeader.getAttribute('email') || emailData.senderEmail;
      emailData.senderName = threadHeader.textContent?.trim() || emailData.senderName;
    }
  }
  
  return emailData;
}

/**
 * Extract email data from Gmail DOM
 */
function extractEmailData(emailElement) {
  const data = {
    senderEmail: '',
    senderName: '',
    subject: '',
    body: '',
    date: null,
    hasAttachments: false,
    isStarred: false,
    isImportant: false,
    hasLabels: []
  };
  
  if (!emailElement) return data;
  
  // Try to find sender info
  const senderSelectors = ['.gD', '[email]', '.go'];
  for (const selector of senderSelectors) {
    const senderEl = emailElement.querySelector(selector);
    if (senderEl) {
      data.senderEmail = senderEl.getAttribute('email') || senderEl.textContent || '';
      data.senderName = senderEl.textContent || '';
      break;
    }
  }
  
  // Try to find subject
  const subjectEl = emailElement.querySelector('h2') || emailElement.querySelector('.hP');
  if (subjectEl) {
    data.subject = subjectEl.textContent || '';
  }
  
  // Try to find date
  const dateEl = emailElement.querySelector('.g3') || emailElement.querySelector('[title*=":"]');
  if (dateEl) {
    const dateText = dateEl.getAttribute('title') || dateEl.textContent || '';
    data.date = new Date(dateText);
  }
  
  // Check for attachments
  data.hasAttachments = !!emailElement.querySelector('[data-attachment-id]') ||
                        !!emailElement.querySelector('.aZo');
  
  // Check if starred
  data.isStarred = !!emailElement.querySelector('.T-KT') ||
                   emailElement.querySelector('[aria-label*="starred" i]');
  
  // Check if important
  data.isImportant = !!emailElement.querySelector('[aria-label*="important" i]');
  
  return data;
}

/**
 * Find unsubscribe links in email DOM - Enhanced detection
 */
function findUnsubscribeLinks(emailElement) {
  const links = [];
  if (!emailElement) return links;
  
  // Enhanced patterns for unsubscribe detection
  const unsubscribePatterns = [
    /unsubscribe/i,
    /opt.?out/i,
    /opt.?out/i,
    /remove.*subscription/i,
    /manage.*preferences/i,
    /email.*preferences/i,
    /preference.*center/i,
    /update.*subscription/i,
    /change.*subscription/i,
    /modify.*subscription/i,
    /cancel.*subscription/i,
    /stop.*emails/i,
    /stop.*mailing/i,
    /remove.*from.*list/i,
    /remove.*me/i
  ];
  
  // URL patterns that indicate unsubscribe
  const unsubscribeUrlPatterns = [
    /unsubscribe/i,
    /optout/i,
    /opt-out/i,
    /preferences/i,
    /manage/i,
    /remove/i,
    /list-unsubscribe/i,
    /mailing-list/i
  ];
  
  // Find all links in the email
  const allLinks = emailElement.querySelectorAll('a[href]');
  
  allLinks.forEach(link => {
    const href = link.getAttribute('href') || '';
    const text = (link.textContent || '').toLowerCase().trim();
    const title = (link.getAttribute('title') || '').toLowerCase();
    const ariaLabel = (link.getAttribute('aria-label') || '').toLowerCase();
    
    // Check text content
    const textMatches = unsubscribePatterns.some(pattern => 
      pattern.test(text) || pattern.test(title) || pattern.test(ariaLabel)
    );
    
    // Check URL
    const urlMatches = unsubscribeUrlPatterns.some(pattern => pattern.test(href));
    
    // Check if link is visible
    const isVisible = link.offsetParent !== null;
    
    // Exclude false positives
    const isSubscribe = /subscribe|sign.?up|join|register/i.test(text) && 
                       !/unsubscribe/i.test(text);
    const isSocial = /facebook|twitter|linkedin|instagram|youtube/i.test(href);
    
    if ((textMatches || urlMatches) && isVisible && !isSubscribe && !isSocial) {
      // Determine if it's a POST request (List-Unsubscribe-Post)
      const isPost = /list-unsubscribe/i.test(href) || 
                     link.getAttribute('data-method') === 'post';
      
      links.push({
        element: link,
        href: href,
        text: text.trim() || title || 'Unsubscribe',
        method: isPost ? 'POST' : 'GET',
        confidence: textMatches && urlMatches ? 'high' : textMatches || urlMatches ? 'medium' : 'low'
      });
    }
  });
  
  // Also check for mailto: unsubscribe links
  const mailtoLinks = emailElement.querySelectorAll('a[href^="mailto:"]');
  mailtoLinks.forEach(link => {
    const href = link.getAttribute('href') || '';
    const text = (link.textContent || '').toLowerCase();
    
    if (/unsubscribe/i.test(text) || /unsubscribe/i.test(href)) {
      if (link.offsetParent !== null) {
        links.push({
          element: link,
          href: href,
          text: text.trim() || 'Unsubscribe',
          method: 'MAILTO',
          confidence: 'medium'
        });
      }
    }
  });
  
  // Sort by confidence (high first)
  links.sort((a, b) => {
    const confidenceOrder = { 'high': 3, 'medium': 2, 'low': 1 };
    return (confidenceOrder[b.confidence] || 0) - (confidenceOrder[a.confidence] || 0);
  });
  
  return links;
}

/**
 * Find Gmail's native unsubscribe button - Enhanced detection
 */
function findGmailUnsubscribeButton() {
  // Gmail's unsubscribe button can appear in various locations
  // Try multiple strategies to find it
  
  // Strategy 1: Direct selectors for Gmail's unsubscribe UI
  const directSelectors = [
    '[data-action="unsubscribe"]',
    '[aria-label*="unsubscribe" i]',
    '[aria-label*="Unsubscribe" i]',
    'div[role="button"][aria-label*="unsubscribe" i]',
    'div[role="button"][aria-label*="Unsubscribe" i]',
    '.unsubscribe-button',
    '[data-tooltip*="unsubscribe" i]',
    '[data-tooltip*="Unsubscribe" i]',
    'button[aria-label*="unsubscribe" i]',
    'button[aria-label*="Unsubscribe" i]',
    // Gmail's specific classes
    '.aio',
    '.aio.UKr6le',
    '.aio.UKr6le[role="button"]'
  ];
  
  for (const selector of directSelectors) {
    try {
      const button = document.querySelector(selector);
      if (button && button.offsetParent !== null) {
        // Verify it's actually an unsubscribe button
        const text = button.textContent?.toLowerCase() || '';
        const ariaLabel = button.getAttribute('aria-label')?.toLowerCase() || '';
        const tooltip = button.getAttribute('data-tooltip')?.toLowerCase() || '';
        
        if (text.includes('unsubscribe') || 
            ariaLabel.includes('unsubscribe') || 
            tooltip.includes('unsubscribe')) {
          return button;
        }
      }
    } catch (e) {
      // Invalid selector, continue
    }
  }
  
  // Strategy 2: Look in Gmail's header area where unsubscribe usually appears
  const headerAreas = [
    document.querySelector('.nH.if'),
    document.querySelector('[role="main"]'),
    document.querySelector('.a3s'),
    document.querySelector('.ii.gt')
  ].filter(Boolean);
  
  for (const headerArea of headerAreas) {
    // Look for buttons in the header area
    const buttons = headerArea.querySelectorAll('button, div[role="button"], a[role="button"]');
    for (const button of buttons) {
      if (button.offsetParent === null) continue; // Skip hidden buttons
      
      const text = button.textContent?.toLowerCase() || '';
      const ariaLabel = button.getAttribute('aria-label')?.toLowerCase() || '';
      const title = button.getAttribute('title')?.toLowerCase() || '';
      const tooltip = button.getAttribute('data-tooltip')?.toLowerCase() || '';
      
      // Check for unsubscribe keywords
      const unsubscribeKeywords = ['unsubscribe', 'opt out', 'opt-out', 'remove subscription'];
      const hasUnsubscribe = unsubscribeKeywords.some(keyword => 
        text.includes(keyword) || 
        ariaLabel.includes(keyword) || 
        title.includes(keyword) || 
        tooltip.includes(keyword)
      );
      
      // Make sure it's not a subscribe button
      const isSubscribe = text.includes('subscribe') && !text.includes('unsubscribe');
      
      if (hasUnsubscribe && !isSubscribe) {
        return button;
      }
    }
  }
  
  // Strategy 3: Search all buttons/clickable elements by text content
  const allButtons = document.querySelectorAll('button, div[role="button"], a[role="button"], span[role="button"]');
  for (const button of allButtons) {
    if (button.offsetParent === null) continue;
    
    const text = button.textContent?.toLowerCase() || '';
    const ariaLabel = button.getAttribute('aria-label')?.toLowerCase() || '';
    
    // More lenient matching - just needs to contain "unsubscribe"
    if ((text.includes('unsubscribe') || ariaLabel.includes('unsubscribe')) &&
        !text.includes('subscribe') && 
        !ariaLabel.includes('subscribe') &&
        text !== 'subscribe' &&
        ariaLabel !== 'subscribe') {
      return button;
    }
  }
  
  // Strategy 4: Look for Gmail's "List-Unsubscribe" header action button
  // Gmail sometimes shows this as a special UI element
  const listUnsubscribeElements = document.querySelectorAll('[data-list-unsubscribe]');
  for (const element of listUnsubscribeElements) {
    if (element.offsetParent !== null) {
      return element;
    }
  }
  
  return null;
}

/**
 * Check unsubscribe options without executing (for preview)
 */
async function checkUnsubscribeOptions() {
  const results = {
    found: [],
    executed: [],
    errors: []
  };
  
  // Try Gmail's native button first
  const gmailButton = findGmailUnsubscribeButton();
  if (gmailButton) {
    results.found.push({ type: 'gmail-native', element: gmailButton });
  }
  
  // Find email content element
  const emailView = document.querySelector('[data-message-id]') || 
                    document.querySelector('.nH.if') ||
                    document.querySelector('.a3s');
  
  if (emailView) {
    const links = findUnsubscribeLinks(emailView);
    results.found.push(...links.map(link => ({ type: 'link', ...link })));
  }
  
  return results;
}

/**
 * Process all unsubscribe opportunities in current email view
 * This function is used by both the "Unsubscribe From Current Email" button
 * and the batch processing - ensuring consistent behavior
 */
async function processUnsubscribeForCurrentEmail() {
  const results = await checkUnsubscribeOptions();
  
  // Execute unsubscribe if options found
  // Priority: Gmail native button first (most reliable), then highest confidence link
  if (results.found.length > 0) {
    // Try Gmail's native unsubscribe button first (most reliable)
    const gmailButton = results.found.find(f => f.type === 'gmail-native');
    if (gmailButton && gmailButton.element) {
      try {
        // Scroll button into view if needed
        gmailButton.element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        await delay(200);
        
        gmailButton.element.click();
        results.executed.push({ type: 'gmail-native', success: true });
        
        // Wait a bit to see if unsubscribe dialog appears or action completes
        await delay(500);
        
        return results;
      } catch (error) {
        results.errors.push({ type: 'gmail-native', error: error.message });
        console.error('Error clicking Gmail unsubscribe button:', error);
      }
    }
    
    // If Gmail button didn't work, try unsubscribe links
    // Links are already sorted by confidence (high to low) from findUnsubscribeLinks
    const links = results.found.filter(f => f.type === 'link');
    
    // Try highest confidence link first
    for (const link of links) {
      if (link.element) {
        try {
          // For mailto links, we might need to handle differently
          if (link.method === 'MAILTO') {
            // mailto links can be clicked directly
            link.element.click();
            results.executed.push({ type: 'link', href: link.href, method: 'MAILTO', success: true });
            return results;
          }
          
          // For regular links, scroll into view and click
          link.element.scrollIntoView({ behavior: 'smooth', block: 'center' });
          await delay(200);
          
          link.element.click();
          results.executed.push({ 
            type: 'link', 
            href: link.href, 
            method: link.method || 'GET',
            confidence: link.confidence || 'medium',
            success: true 
          });
          
          // Wait a bit for the action to complete
          await delay(500);
          
          return results;
        } catch (error) {
          results.errors.push({ type: 'link', href: link.href, error: error.message });
          console.error('Error clicking unsubscribe link:', error);
          // Continue to next link if this one fails
        }
      }
    }
  }
  
  return results;
}

/**
 * Check if email should be deleted (simplified version)
 */
async function shouldDeleteEmail(emailData) {
  return new Promise((resolve) => {
    chrome.storage.sync.get(['whitelist', 'blacklist', 'settings'], (result) => {
      const whitelist = result.whitelist || [];
      const blacklist = result.blacklist || [];
      const settings = result.settings || {};
      const minConfidence = settings.minConfidenceForDelete || 0.7;
      
      const senderEmail = (emailData.senderEmail || '').toLowerCase();
      const senderName = (emailData.senderName || '').toLowerCase();
      
      // Check whitelist
      const isWhitelisted = whitelist.some(item => {
        const normalizedItem = item.toLowerCase();
        return senderEmail.includes(normalizedItem) || 
               senderName.includes(normalizedItem) ||
               normalizedItem.includes(senderEmail);
      });
      
      if (isWhitelisted) {
        resolve({ shouldDelete: false, reason: 'whitelisted', confidence: 1.0 });
        return;
      }
      
      // Check blacklist
      const isBlacklisted = blacklist.some(item => {
        const normalizedItem = item.toLowerCase();
        return senderEmail.includes(normalizedItem) || 
               senderName.includes(normalizedItem) ||
               normalizedItem.includes(senderEmail);
      });
      
      if (isBlacklisted) {
        resolve({ shouldDelete: true, reason: 'blacklisted', confidence: 1.0 });
        return;
      }
      
      // Calculate junk score (simplified)
      let score = 0;
      
      if (emailData.isStarred) score -= 0.3;
      if (emailData.isImportant) score -= 0.2;
      if (emailData.hasAttachments) score -= 0.15;
      
      const subject = (emailData.subject || '').toLowerCase();
      if (/newsletter|promotional|marketing|special.*offer/i.test(subject)) {
        score += 0.15;
      }
      
      const senderDomain = senderEmail.split('@')[1]?.toLowerCase() || '';
      if (/mailchimp|constantcontact|campaign|newsletter|noreply|no-reply/i.test(senderDomain)) {
        score += 0.2;
      }
      
      score = Math.max(0, Math.min(1, score));
      const shouldDelete = score >= minConfidence;
      
      resolve({
        shouldDelete,
        reason: score > 0.6 ? 'likely_junk' : score < 0.3 ? 'likely_legitimate' : 'uncertain',
        confidence: score
      });
    });
  });
}

/**
 * Log activity to storage
 */
function logActivity(type, emailData, reason = '') {
  const logEntry = {
    timestamp: new Date().toISOString(),
    senderEmail: emailData.senderEmail || '',
    sender: emailData.senderName || emailData.senderEmail || 'Unknown',
    subject: emailData.subject || '',
    reason: reason
  };
  
  chrome.storage.local.get(['activityLogs'], (result) => {
    const logs = result.activityLogs || {
      unsubscribed: [],
      deleted: [],
      failed: []
    };
    
    // Add to appropriate log
    if (type === 'unsubscribed' || type === 'deleted' || type === 'failed') {
      logs[type].push(logEntry);
      
      // Keep only last 1000 entries per log type to prevent storage bloat
      if (logs[type].length > 1000) {
        logs[type] = logs[type].slice(-1000);
      }
      
      chrome.storage.local.set({ activityLogs: logs });
    }
  });
}

/**
 * Handle unsubscribe action
 */
async function handleUnsubscribe() {
  try {
    const emailData = getCurrentEmailData();
    const results = await processUnsubscribeForCurrentEmail();
    
    if (results.executed.length > 0) {
      // Update stats
      chrome.storage.local.get(['stats'], (result) => {
        const stats = result.stats || { unsubscribed: 0, deleted: 0, processed: 0 };
        stats.unsubscribed = (stats.unsubscribed || 0) + 1;
        chrome.storage.local.set({ stats });
      });
      
      // Note: Manual unsubscribe actions are not logged as "auto-unsubscribed"
      // Only batch processing with autoUnsubscribe enabled will log
      
      return {
        success: true,
        results,
        message: 'Unsubscribe action executed'
      };
    } else if (results.found.length > 0) {
      // Log failed unsubscribe attempt
      if (emailData) {
        logActivity('failed', emailData, 'Found unsubscribe options but could not execute');
      }
      
      return {
        success: false,
        results,
        message: 'Found unsubscribe options but could not execute'
      };
    } else {
      // Log failed unsubscribe attempt
      if (emailData) {
        logActivity('failed', emailData, 'No unsubscribe option found');
      }
      
      return {
        success: false,
        results,
        message: 'No unsubscribe options found'
      };
    }
  } catch (error) {
    console.error('Unsubscribe error:', error);
    
    // Log failed unsubscribe attempt
    const emailData = getCurrentEmailData();
    if (emailData) {
      logActivity('failed', emailData, `Error: ${error.message}`);
    }
    
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Process multiple emails (for bulk operations)
 */
async function handleProcessEmails(options = {}) {
  return new Promise((resolve) => {
    chrome.storage.sync.get(['settings'], async (result) => {
      const settings = result.settings || {
        previewMode: true,
        rateLimitDelay: 1000,
        minConfidenceForDelete: 0.7
      };
      
      const {
        maxEmails = 50,
        previewOnly = settings.previewMode,
        autoUnsubscribe = false,
        autoDelete = false
      } = options;
      
      const processResults = {
        processed: 0,
        unsubscribed: 0,
        deleted: 0,
        skipped: 0,
        errors: [],
        emailDetails: [] // Detailed information about each email
      };
      
      try {
        const emailElements = getEmailListElements();
        
        if (emailElements.length === 0) {
          resolve({
            success: false,
            message: 'No emails found in current view',
            results: processResults
          });
          return;
        }
        
        const emailsToProcess = emailElements.slice(0, maxEmails);
        
        for (let i = 0; i < emailsToProcess.length; i++) {
          const emailEl = emailsToProcess[i];
          
          try {
            // Always click to open each email (Gmail needs this to load email content)
            // Scroll the email into view first to ensure it's clickable
            emailEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
            await delay(300);
            
            // Click the email to open it
            emailEl.click();
            await delay(settings.rateLimitDelay);
            
            // Wait for email content to load
            await delay(800);
            
            // Try to get email data - may need to retry if email hasn't loaded yet
            let emailData = getCurrentEmailData();
            let retries = 0;
            while (!emailData && retries < 3) {
              await delay(500);
              emailData = getCurrentEmailData();
              retries++;
            }
            if (!emailData) {
              processResults.skipped++;
              processResults.emailDetails.push({
                index: i,
                sender: 'Unknown',
                subject: 'Could not extract',
                unsubscribeStatus: 'error',
                deleteStatus: 'error',
                reason: 'Could not extract email data',
                confidence: 0
              });
              continue;
            }
            
            // Check for unsubscribe options
            const unsubscribeInfo = await checkUnsubscribeOptions();
            const deleteDecision = await shouldDeleteEmail(emailData);
            
            // Determine unsubscribe status
            let unsubscribeStatus = 'not_found';
            let unsubscribeReason = 'No unsubscribe option found';
            
            if (unsubscribeInfo.found.length > 0) {
              if (unsubscribeInfo.found.some(f => f.type === 'gmail-native')) {
                unsubscribeStatus = 'will_unsubscribe';
                unsubscribeReason = 'Gmail native unsubscribe button found';
              } else if (unsubscribeInfo.found.some(f => f.type === 'link')) {
                unsubscribeStatus = 'will_unsubscribe';
                unsubscribeReason = 'Unsubscribe link found in email';
              }
            }
            
            // Determine delete status
            let deleteStatus = 'will_not_delete';
            let deleteReason = deleteDecision.reason || 'Does not meet deletion criteria';
            
            if (deleteDecision.shouldDelete) {
              deleteStatus = 'will_delete';
              deleteReason = deleteDecision.reason || 'Meets deletion criteria';
            } else if (deleteDecision.reason === 'whitelisted') {
              deleteStatus = 'protected';
              deleteReason = 'Email is whitelisted';
            } else if (deleteDecision.confidence < 0.3) {
              deleteStatus = 'likely_legitimate';
              deleteReason = 'Low junk score - likely legitimate email';
            } else if (deleteDecision.confidence >= 0.3 && deleteDecision.confidence < settings.minConfidenceForDelete) {
              deleteStatus = 'uncertain';
              deleteReason = `Confidence score (${deleteDecision.confidence.toFixed(2)}) below threshold`;
            }
            
            // Store detailed email information
            processResults.emailDetails.push({
              index: i,
              sender: emailData.senderName || emailData.senderEmail || 'Unknown',
              senderEmail: emailData.senderEmail || '',
              subject: emailData.subject || '(No subject)',
              unsubscribeStatus: unsubscribeStatus,
              unsubscribeReason: unsubscribeReason,
              deleteStatus: deleteStatus,
              deleteReason: deleteReason,
              confidence: deleteDecision.confidence || 0,
              isStarred: emailData.isStarred || false,
              isImportant: emailData.isImportant || false
            });
            
            // Execute actions if not in preview mode
            if (autoUnsubscribe && !previewOnly && unsubscribeStatus === 'will_unsubscribe') {
              const unsubscribeResult = await handleUnsubscribe();
              if (unsubscribeResult.success) {
                processResults.unsubscribed++;
                // Log auto-unsubscribe (only during batch processing with autoUnsubscribe enabled)
                const executedType = unsubscribeResult.results?.executed[0]?.type || 'unknown';
                const reason = executedType === 'gmail-native' 
                  ? 'Auto-unsubscribed via Gmail native button'
                  : `Auto-unsubscribed via ${executedType} link`;
                logActivity('unsubscribed', emailData, reason);
              } else {
                // Log failed unsubscribe attempt
                logActivity('failed', emailData, unsubscribeResult.message || 'Unsubscribe failed during batch processing');
              }
              await delay(settings.rateLimitDelay);
            }
            
            if (autoDelete && deleteDecision.shouldDelete && !previewOnly) {
              const deleteResult = await deleteCurrentEmail();
              if (deleteResult.success) {
                processResults.deleted++;
                // Log auto-delete
                logActivity('deleted', emailData, `Auto-deleted: ${deleteDecision.reason || 'Met deletion criteria'} (confidence: ${(deleteDecision.confidence * 100).toFixed(0)}%)`);
              }
              await delay(settings.rateLimitDelay);
            }
            
            processResults.processed++;
            
          } catch (error) {
            processResults.errors.push({ index: i, error: error.message });
            processResults.emailDetails.push({
              index: i,
              sender: 'Error',
              subject: 'Processing failed',
              unsubscribeStatus: 'error',
              deleteStatus: 'error',
              reason: error.message,
              confidence: 0
            });
            console.error(`Error processing email ${i}:`, error);
          }
        }
        
        // Update stats
        chrome.storage.local.get(['stats'], (result) => {
          const stats = result.stats || { unsubscribed: 0, deleted: 0, processed: 0 };
          stats.processed = (stats.processed || 0) + processResults.processed;
          stats.unsubscribed = (stats.unsubscribed || 0) + processResults.unsubscribed;
          stats.deleted = (stats.deleted || 0) + processResults.deleted;
          chrome.storage.local.set({ stats });
        });
        
        resolve({
          success: true,
          results: processResults,
          message: `Processed ${processResults.processed} emails`
        });
        
      } catch (error) {
        console.error('Process emails error:', error);
        resolve({
          success: false,
          error: error.message,
          results: processResults
        });
      }
    });
  });
}

/**
 * Get list of email elements in current view
 */
function getEmailListElements() {
  // Gmail uses different selectors for email list items
  // Try multiple selectors to find email rows
  const selectors = [
    'tr.zA',  // Gmail's email row class
    'tr[role="row"]',  // ARIA role
    '.zA',  // Email row
    '[data-thread-id]',  // Thread ID attribute
    'tr[data-legacy-thread-id]'  // Legacy thread ID
  ];
  
  for (const selector of selectors) {
    try {
      const elements = Array.from(document.querySelectorAll(selector));
      if (elements.length > 0) {
        // Filter to only actual email rows (not headers, etc.)
        const emailRows = elements.filter(el => {
          // Check if it's a clickable email row
          const hasEmail = el.querySelector('[email]') || 
                          el.getAttribute('data-thread-id') ||
                          el.getAttribute('data-legacy-thread-id') ||
                          el.classList.contains('zA');
          
          // Make sure it's visible and not a header
          const isVisible = el.offsetParent !== null;
          const isNotHeader = !el.classList.contains('bq4') && 
                             !el.querySelector('.bq4');
          
          return hasEmail && isVisible && isNotHeader;
        });
        
        if (emailRows.length > 0) {
          return emailRows;
        }
      }
    } catch (e) {
      // Invalid selector, continue
      console.debug('Selector failed:', selector);
    }
  }
  
  return [];
}

/**
 * Check if email is currently open
 */
function isEmailOpen(emailElement) {
  const emailView = document.querySelector('[data-message-id]');
  return emailView !== null;
}

/**
 * Delete currently open email
 */
async function deleteCurrentEmail() {
  try {
    const deleteSelectors = [
      '[aria-label*="Delete" i]',
      '[data-tooltip*="Delete" i]',
      '.T-I-J3[data-tooltip*="Delete" i]',
      'div[role="button"][aria-label*="Delete" i]'
    ];
    
    for (const selector of deleteSelectors) {
      const deleteButton = document.querySelector(selector);
      if (deleteButton && deleteButton.offsetParent !== null) {
        deleteButton.click();
        await delay(300);
        return { success: true };
      }
    }
    
    return { success: false, message: 'Delete button not found' };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Handle delete unread emails
 */
async function handleDeleteUnread(options = {}) {
  const { respectWhitelist = true } = options;
  
  return new Promise((resolve) => {
    chrome.storage.sync.get(['whitelist', 'settings'], async (result) => {
      const whitelist = result.whitelist || [];
      const settings = result.settings || { rateLimitDelay: 1000 };
      
      const deleteResults = {
        deleted: 0,
        markedRead: 0,
        skipped: 0,
        errors: []
      };
      
      try {
        // Find all unread emails in current view
        const emailElements = getEmailListElements();
        
        if (emailElements.length === 0) {
          resolve({
            success: false,
            message: 'No emails found in current view',
            results: deleteResults
          });
          return;
        }
        
        // Filter for unread emails - Gmail marks unread emails with specific classes
        const unreadEmails = emailElements.filter(el => {
          // Check if email is unread (Gmail uses various indicators)
          const isUnread = el.classList.contains('zE') || // Unread class
                          !el.classList.contains('zF') || // Not read class
                          el.querySelector('.zF') === null || // No read indicator
                          el.getAttribute('aria-label')?.includes('unread');
          return isUnread;
        });
        
        if (unreadEmails.length === 0) {
          resolve({
            success: false,
            message: 'No unread emails found in current view',
            results: deleteResults
          });
          return;
        }
        
        // Process each unread email
        for (let i = 0; i < unreadEmails.length; i++) {
          const emailEl = unreadEmails[i];
          
          try {
            // Click to open email
            emailEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
            await delay(300);
            emailEl.click();
            await delay(settings.rateLimitDelay);
            
            // Wait for email to load
            await delay(500);
            
            const emailData = getCurrentEmailData();
            if (!emailData) {
              deleteResults.skipped++;
              continue;
            }
            
            // Check whitelist if respectWhitelist is true
            if (respectWhitelist) {
              const senderEmail = (emailData.senderEmail || '').toLowerCase();
              const senderName = (emailData.senderName || '').toLowerCase();
              
              const isWhitelisted = whitelist.some(item => {
                const normalizedItem = item.toLowerCase();
                return senderEmail.includes(normalizedItem) || 
                       senderName.includes(normalizedItem) ||
                       normalizedItem.includes(senderEmail);
              });
              
              if (isWhitelisted) {
                // Mark as read instead of deleting
                await markEmailAsRead();
                deleteResults.markedRead++;
                await delay(settings.rateLimitDelay);
                continue;
              }
            }
            
            // Delete the email
            const deleteResult = await deleteCurrentEmail();
            if (deleteResult.success) {
              deleteResults.deleted++;
              // Log deletion
              logActivity('deleted', emailData, `Deleted unread email${respectWhitelist ? ' (whitelist checked)' : ' (all unread)'}`);
            }
            
            await delay(settings.rateLimitDelay);
            
          } catch (error) {
            deleteResults.errors.push({ index: i, error: error.message });
            console.error(`Error processing unread email ${i}:`, error);
          }
        }
        
        // Update stats
        chrome.storage.local.get(['stats'], (result) => {
          const stats = result.stats || { unsubscribed: 0, deleted: 0, processed: 0 };
          stats.deleted = (stats.deleted || 0) + deleteResults.deleted;
          stats.processed = (stats.processed || 0) + deleteResults.deleted + deleteResults.markedRead;
          chrome.storage.local.set({ stats });
        });
        
        resolve({
          success: true,
          results: deleteResults,
          message: `Processed ${unreadEmails.length} unread emails`
        });
        
      } catch (error) {
        console.error('Delete unread error:', error);
        resolve({
          success: false,
          error: error.message,
          results: deleteResults
        });
      }
    });
  });
}

/**
 * Mark current email as read
 */
async function markEmailAsRead() {
  try {
    // Find Gmail's mark as read button/action
    const markReadSelectors = [
      '[aria-label*="Mark as read" i]',
      '[data-tooltip*="Mark as read" i]',
      'div[role="button"][aria-label*="Mark as read" i]'
    ];
    
    for (const selector of markReadSelectors) {
      const button = document.querySelector(selector);
      if (button && button.offsetParent !== null) {
        button.click();
        await delay(300);
        return { success: true };
      }
    }
    
    // Alternative: Try to find and click the "Mark as read" option in Gmail's UI
    const moreOptions = document.querySelector('[aria-label*="More" i]');
    if (moreOptions) {
      moreOptions.click();
      await delay(200);
      const markRead = document.querySelector('[aria-label*="Mark as read" i]');
      if (markRead) {
        markRead.click();
        await delay(300);
        return { success: true };
      }
    }
    
    return { success: false, message: 'Mark as read button not found' };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Utility: Delay function
 */
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Start initialization
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', waitForGmail);
} else {
  waitForGmail();
}
