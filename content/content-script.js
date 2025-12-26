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
    
    if (request.action === 'getCurrentEmail') {
      const emailData = getCurrentEmailData();
      sendResponse({ emailData });
      return false;
    }
    
    if (request.action === 'archiveEmail') {
      archiveCurrentEmail().then(result => {
        sendResponse(result);
      });
      return true;
    }
    
    if (request.action === 'markAsUnread') {
      markEmailAsUnread().then(result => {
        sendResponse(result);
      });
      return true;
    }
    
    if (request.action === 'pauseProcessing') {
      chrome.storage.local.set({ processingPaused: true }, () => {
        sendResponse({ success: true });
      });
      return true;
    }
    
    if (request.action === 'resumeProcessing') {
      chrome.storage.local.set({ processingPaused: false }, () => {
        sendResponse({ success: true });
      });
      return true;
    }
    
    if (request.action === 'stopProcessing') {
      chrome.storage.local.set({ processingStopped: true, processingPaused: false }, () => {
        sendResponse({ success: true });
      });
      return true;
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
  
  // Try multiple methods to get sender email - Gmail's DOM structure varies
  // Method 1: Try to find element with email attribute
  const headerWithEmail = emailView.querySelector('[email]') || 
                          document.querySelector('.gD[email]') ||
                          document.querySelector('[data-email]');
  
  if (headerWithEmail) {
    const emailAttr = headerWithEmail.getAttribute('email') || 
                     headerWithEmail.getAttribute('data-email');
    if (emailAttr && emailAttr.includes('@')) {
      emailData.senderEmail = emailAttr.trim();
    }
  }
  
  // Method 2: Try to find sender header element
  const header = emailView.querySelector('.gD') || 
                 emailView.querySelector('.go') ||
                 emailView.querySelector('.g2') ||
                 emailView.querySelector('[role="main"] .gD');
  
  if (header && !emailData.senderEmail) {
    // First try the email attribute
    const emailAttr = header.getAttribute('email');
    if (emailAttr && emailAttr.includes('@')) {
      emailData.senderEmail = emailAttr.trim();
    } else {
      // Get all text content from header and its children (handles split text nodes)
      let fullText = '';
      if (header.innerText) {
        fullText = header.innerText.trim();
      } else {
        // Fallback: recursively get text from all child nodes
        const walker = document.createTreeWalker(
          header,
          NodeFilter.SHOW_TEXT,
          null,
          false
        );
        let node;
        while (node = walker.nextNode()) {
          fullText += node.textContent;
        }
        fullText = fullText.trim();
      }
      
      // Try to extract email from full text using improved regex
      // This regex handles emails with various formats
      const emailMatch = fullText.match(/[\w\.\+\-]+@[\w\.\-]+\.[\w]{2,}/);
      if (emailMatch && emailMatch[0].length > 3) { // Ensure we got a real email, not just a fragment
        emailData.senderEmail = emailMatch[0].trim();
      }
    }
    
    // Get sender name (text before email or full text)
    let headerText = '';
    if (header.innerText) {
      headerText = header.innerText.trim();
    } else {
      headerText = header.textContent?.trim() || '';
    }
    
    if (headerText && !headerText.includes('@')) {
      emailData.senderName = headerText;
    } else if (headerText && emailData.senderEmail) {
      // Extract name before email
      const emailIndex = headerText.indexOf(emailData.senderEmail);
      if (emailIndex > 0) {
        emailData.senderName = headerText.substring(0, emailIndex).trim();
      } else {
        // Try regex to extract name
        const nameMatch = headerText.match(/^(.+?)\s*[\w\.\+\-]+@/);
        if (nameMatch) {
          emailData.senderName = nameMatch[1].trim();
        }
      }
    }
  }
  
  // Method 3: Try alternative method to get sender from Gmail's thread view
  if (!emailData.senderEmail || emailData.senderEmail.length < 5) {
    const threadHeader = document.querySelector('.gD[email]') ||
                        document.querySelector('[email]');
    if (threadHeader) {
      const emailAttr = threadHeader.getAttribute('email');
      if (emailAttr && emailAttr.includes('@') && emailAttr.length > 5) {
        emailData.senderEmail = emailAttr.trim();
      }
      if (!emailData.senderName) {
        const nameText = threadHeader.innerText || threadHeader.textContent;
        if (nameText && !nameText.includes('@')) {
          emailData.senderName = nameText.trim();
        }
      }
    }
  }
  
  // Method 4: Try to find email in the entire email view using a comprehensive search
  if (!emailData.senderEmail || emailData.senderEmail.length < 5) {
    // Search for common email patterns in the header area
    const headerArea = emailView.querySelector('.gD') || 
                      emailView.querySelector('.go') ||
                      emailView;
    
    if (headerArea) {
      // Get all text content from header area
      const allText = headerArea.innerText || headerArea.textContent || '';
      // Use a more comprehensive email regex
      const emailPattern = /[a-zA-Z0-9][a-zA-Z0-9\.\+\-_]*@[a-zA-Z0-9][a-zA-Z0-9\.\-]*\.[a-zA-Z]{2,}/g;
      const matches = allText.match(emailPattern);
      if (matches && matches.length > 0) {
        // Take the first valid email (usually the sender)
        const validEmail = matches.find(email => email.length > 5 && email.includes('@'));
        if (validEmail) {
          emailData.senderEmail = validEmail.trim();
        }
      }
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
  
  // Try to find sender info with improved extraction
  const senderSelectors = ['.gD', '[email]', '.go', '[data-email]'];
  for (const selector of senderSelectors) {
    const senderEl = emailElement.querySelector(selector);
    if (senderEl) {
      // First try email attribute
      const emailAttr = senderEl.getAttribute('email') || senderEl.getAttribute('data-email');
      if (emailAttr && emailAttr.includes('@') && emailAttr.length > 5) {
        data.senderEmail = emailAttr.trim();
      } else {
        // Try to extract from text content using innerText (handles split nodes better)
        const textContent = senderEl.innerText || senderEl.textContent || '';
        const emailMatch = textContent.match(/[a-zA-Z0-9][a-zA-Z0-9\.\+\-_]*@[a-zA-Z0-9][a-zA-Z0-9\.\-]*\.[a-zA-Z]{2,}/);
        if (emailMatch && emailMatch[0].length > 5) {
          data.senderEmail = emailMatch[0].trim();
        }
      }
      
      // Get sender name
      const nameText = senderEl.innerText || senderEl.textContent || '';
      if (nameText && data.senderEmail) {
        // Extract name before email
        const emailIndex = nameText.indexOf(data.senderEmail);
        if (emailIndex > 0) {
          data.senderName = nameText.substring(0, emailIndex).trim();
        } else if (!nameText.includes('@')) {
          data.senderName = nameText.trim();
        }
      } else if (nameText && !nameText.includes('@')) {
        data.senderName = nameText.trim();
      }
      
      if (data.senderEmail) break;
    }
  }
  
  // Try to find subject
  const subjectEl = emailElement.querySelector('h2') || 
                   emailElement.querySelector('.hP') ||
                   emailElement.querySelector('[data-thread-perm-id] + div h2');
  if (subjectEl) {
    data.subject = (subjectEl.innerText || subjectEl.textContent || '').trim();
  }
  
  // Try to find date
  const dateEl = emailElement.querySelector('.g3') || 
                emailElement.querySelector('[title*=":"]') ||
                emailElement.querySelector('.g3[title]');
  if (dateEl) {
    const dateText = dateEl.getAttribute('title') || dateEl.textContent || '';
    if (dateText) {
      data.date = new Date(dateText);
    }
  }
  
  // Check for attachments
  data.hasAttachments = !!emailElement.querySelector('[data-attachment-id]') ||
                        !!emailElement.querySelector('.aZo') ||
                        !!emailElement.querySelector('[aria-label*="attachment" i]');
  
  // Check if starred
  data.isStarred = !!emailElement.querySelector('.T-KT') ||
                   !!emailElement.querySelector('[aria-label*="starred" i]') ||
                   !!emailElement.querySelector('[data-tooltip*="starred" i]');
  
  // Check if important
  data.isImportant = !!emailElement.querySelector('[aria-label*="important" i]') ||
                     !!emailElement.querySelector('[data-tooltip*="important" i]');
  
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
          
          // For regular links, open in new tab without focusing
          // Store original target to restore if needed
          const originalTarget = link.element.target;
          const href = link.element.href || link.href;
          
          // Notify background that a tab will be opened
          chrome.runtime.sendMessage({ action: 'unsubscribeTabOpened' });
          
          // Open link in new tab without focusing
          // Use chrome.tabs.create to have control over focus
          if (href && href.startsWith('http')) {
            chrome.runtime.sendMessage({
              action: 'openUnsubscribeTab',
              url: href
            });
            
            results.executed.push({ 
              type: 'link', 
              href: href, 
              method: link.method || 'GET',
              confidence: link.confidence || 'medium',
              success: true 
            });
            
            // Wait a bit for the tab to open
            await delay(300);
            
            return results;
          } else {
            // Fallback: use target="_blank" if URL is not valid
            link.element.target = '_blank';
            link.element.scrollIntoView({ behavior: 'smooth', block: 'center' });
            await delay(200);
            link.element.click();
            
            results.executed.push({ 
              type: 'link', 
              href: href, 
              method: link.method || 'GET',
              confidence: link.confidence || 'medium',
              success: true 
            });
            
            // Restore original target after a delay
            setTimeout(() => {
              if (link.element) {
                link.element.target = originalTarget || '';
              }
            }, 1000);
          }
          
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
      
      // Check whitelist with domain matching support
      const isWhitelisted = whitelist.some(item => {
        const normalizedItem = item.toLowerCase().trim();
        
        // Skip empty items
        if (!normalizedItem) return false;
        
        // Extract domain from sender email
        const senderDomain = senderEmail.includes('@') 
          ? senderEmail.split('@')[1] 
          : '';
        
        // Exact email match
        if (senderEmail === normalizedItem || senderName === normalizedItem) {
          return true;
        }
        
        // Domain-only match (e.g., '@dvusd.edu' or 'dvusd.edu')
        if (normalizedItem.startsWith('@')) {
          const domain = normalizedItem.substring(1);
          if (senderDomain === domain || senderEmail.endsWith(normalizedItem)) {
            return true;
          }
        } else if (normalizedItem.includes('@') && !normalizedItem.includes('*')) {
          // Exact domain match without @ prefix (e.g., 'dvusd.edu')
          if (senderDomain === normalizedItem) {
            return true;
          }
        }
        
        // Wildcard domain match (e.g., '*@dvusd.edu')
        if (normalizedItem.includes('*@')) {
          const domain = normalizedItem.split('@')[1];
          if (senderDomain === domain) {
            return true;
          }
        }
        
        // Substring match (for partial matches)
        if (senderEmail.includes(normalizedItem) || senderName.includes(normalizedItem)) {
          return true;
        }
        
        return false;
      });
      
      if (isWhitelisted) {
        resolve({ shouldDelete: false, reason: 'whitelisted', confidence: 1.0 });
        return;
      }
      
      // Check blacklist with domain matching support
      const isBlacklisted = blacklist.some(item => {
        const normalizedItem = item.toLowerCase().trim();
        
        // Skip empty items
        if (!normalizedItem) return false;
        
        // Extract domain from sender email
        const senderDomain = senderEmail.includes('@') 
          ? senderEmail.split('@')[1] 
          : '';
        
        // Exact email match
        if (senderEmail === normalizedItem || senderName === normalizedItem) {
          return true;
        }
        
        // Domain-only match (e.g., '@dvusd.edu' or 'dvusd.edu')
        if (normalizedItem.startsWith('@')) {
          const domain = normalizedItem.substring(1);
          if (senderDomain === domain || senderEmail.endsWith(normalizedItem)) {
            return true;
          }
        } else if (normalizedItem.includes('@') && !normalizedItem.includes('*')) {
          // Exact domain match without @ prefix (e.g., 'dvusd.edu')
          if (senderDomain === normalizedItem) {
            return true;
          }
        }
        
        // Wildcard domain match (e.g., '*@dvusd.edu')
        if (normalizedItem.includes('*@')) {
          const domain = normalizedItem.split('@')[1];
          if (senderDomain === domain) {
            return true;
          }
        }
        
        // Substring match (for partial matches)
        if (senderEmail.includes(normalizedItem) || senderName.includes(normalizedItem)) {
          return true;
        }
        
        return false;
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
 * Evaluate advanced filtering rules
 */
async function evaluateFilteringRules(emailData) {
  return new Promise((resolve) => {
    chrome.storage.sync.get(['filterRules'], (result) => {
      const rules = result.filterRules || [];
      const actions = {
        shouldUnsubscribe: false,
        shouldDelete: false,
        shouldArchive: false,
        shouldMarkAsRead: false,
        shouldMarkAsUnread: false,
        shouldStar: false,
        priority: 0
      };
      
      // Sort rules by priority (higher first)
      const sortedRules = [...rules].sort((a, b) => (b.priority || 0) - (a.priority || 0));
      
      for (const rule of sortedRules) {
        if (!rule.enabled) continue;
        
        const conditions = rule.conditions || [];
        if (conditions.length === 0) continue;
        
        // Check if all conditions match (AND logic)
        const allMatch = conditions.every(condition => {
          const { field, operator, value } = condition;
          let fieldValue = '';
          
          switch (field) {
            case 'senderEmail':
              fieldValue = (emailData.senderEmail || '').toLowerCase();
              break;
            case 'senderName':
              fieldValue = (emailData.senderName || '').toLowerCase();
              break;
            case 'subject':
              fieldValue = (emailData.subject || '').toLowerCase();
              break;
            case 'body':
              fieldValue = (emailData.body || '').toLowerCase();
              break;
            case 'hasAttachments':
              fieldValue = emailData.hasAttachments ? 'true' : 'false';
              break;
            case 'isStarred':
              fieldValue = emailData.isStarred ? 'true' : 'false';
              break;
            case 'isImportant':
              fieldValue = emailData.isImportant ? 'true' : 'false';
              break;
            case 'daysOld':
              if (emailData.date) {
                const emailDate = new Date(emailData.date);
                const daysOld = Math.floor((Date.now() - emailDate.getTime()) / (1000 * 60 * 60 * 24));
                fieldValue = daysOld.toString();
              }
              break;
          }
          
          const conditionValue = (value || '').toLowerCase();
          
          switch (operator) {
            case 'contains':
              return fieldValue.includes(conditionValue);
            case 'notContains':
              return !fieldValue.includes(conditionValue);
            case 'equals':
              return fieldValue === conditionValue;
            case 'startsWith':
              return fieldValue.startsWith(conditionValue);
            case 'endsWith':
              return fieldValue.endsWith(conditionValue);
            case 'greaterThan':
              return parseFloat(fieldValue) > parseFloat(conditionValue);
            case 'lessThan':
              return parseFloat(fieldValue) < parseFloat(conditionValue);
            default:
              return false;
          }
        });
        
        if (allMatch) {
          // Apply rule actions
          if (rule.actions.unsubscribe) actions.shouldUnsubscribe = true;
          if (rule.actions.delete) actions.shouldDelete = true;
          if (rule.actions.archive) actions.shouldArchive = true;
          if (rule.actions.markAsRead) actions.shouldMarkAsRead = true;
          if (rule.actions.star) actions.shouldStar = true;
          
          // Stop at first matching rule if stopOnMatch is true
          if (rule.stopOnMatch) break;
        }
      }
      
      resolve(actions);
    });
  });
}

/**
 * Track sender frequency for analytics
 */
function trackSenderFrequency(senderEmail, senderName) {
  chrome.storage.local.get(['senderAnalytics'], (result) => {
    const analytics = result.senderAnalytics || {};
    const key = senderEmail.toLowerCase();
    
    if (!analytics[key]) {
      analytics[key] = {
        email: senderEmail,
        name: senderName,
        count: 0,
        firstSeen: new Date().toISOString(),
        lastSeen: new Date().toISOString()
      };
    }
    
    analytics[key].count++;
    analytics[key].lastSeen = new Date().toISOString();
    
    chrome.storage.local.set({ senderAnalytics: analytics });
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
 * Check if email is whitelisted (helper function)
 */
async function checkIfWhitelisted(emailData) {
  return new Promise((resolve) => {
    chrome.storage.sync.get(['whitelist'], (result) => {
      const whitelist = result.whitelist || [];
      const senderEmail = (emailData.senderEmail || '').toLowerCase();
      const senderName = (emailData.senderName || '').toLowerCase();
      
      const isWhitelisted = whitelist.some(item => {
        const normalizedItem = item.toLowerCase().trim();
        if (!normalizedItem) return false;
        
        const senderDomain = senderEmail.includes('@') 
          ? senderEmail.split('@')[1] 
          : '';
        
        // Exact match
        if (senderEmail === normalizedItem || senderName === normalizedItem) {
          return true;
        }
        
        // Domain match with @ prefix (e.g., '@dvusd.edu')
        if (normalizedItem.startsWith('@') && senderDomain === normalizedItem.substring(1)) {
          return true;
        }
        
        // Domain match without @ prefix (e.g., 'dvusd.edu')
        if (!normalizedItem.includes('@') && senderDomain === normalizedItem) {
          return true;
        }
        
        // Wildcard domain match (e.g., '*@dvusd.edu')
        if (normalizedItem.includes('*@')) {
          const domain = normalizedItem.split('@')[1];
          if (senderDomain === domain) {
            return true;
          }
        }
        
        // Substring match (for backward compatibility)
        return senderEmail.includes(normalizedItem) || senderName.includes(normalizedItem);
      });
      
      resolve(isWhitelisted);
    });
  });
}

/**
 * Handle unsubscribe action
 */
async function handleUnsubscribe() {
  try {
    // Notify background that unsubscribe operation is starting
    chrome.runtime.sendMessage({ action: 'unsubscribeOperationStart' });
    
    const emailData = getCurrentEmailData();
    
    // Check whitelist BEFORE attempting unsubscribe
    if (emailData) {
      const isWhitelisted = await checkIfWhitelisted(emailData);
      if (isWhitelisted) {
        // Notify background that operation ended
        chrome.runtime.sendMessage({ action: 'unsubscribeOperationEnd' });
        return {
          success: false,
          results: { found: [], executed: [], errors: [] },
          message: 'Email is whitelisted - skipping unsubscribe'
        };
      }
    }
    
    const results = await processUnsubscribeForCurrentEmail();
    
    // Notify background that operation ended
    chrome.runtime.sendMessage({ action: 'unsubscribeOperationEnd' });
    
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
    
    // Notify background that operation ended (even on error)
    chrome.runtime.sendMessage({ action: 'unsubscribeOperationEnd' });
    
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
      
      // Notify background that batch unsubscribe operation is starting
      if (autoUnsubscribe) {
        chrome.runtime.sendMessage({ action: 'unsubscribeOperationStart' });
      }
      
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
        
        // Mark processing as active and reset pause/stop flags
        chrome.storage.local.set({ 
          processingActive: true, 
          processingPaused: false, 
          processingStopped: false 
        });
        
        for (let i = 0; i < emailsToProcess.length; i++) {
          // Check for pause/stop
          const state = await new Promise((resolve) => {
            chrome.storage.local.get(['processingPaused', 'processingStopped'], (result) => {
              resolve({
                paused: result.processingPaused === true,
                stopped: result.processingStopped === true
              });
            });
          });
          
          if (state.stopped) {
            processResults.stopped = true;
            processResults.message = 'Processing stopped by user';
            // Mark processing as inactive
            chrome.storage.local.set({ 
              processingActive: false, 
              processingPaused: false, 
              processingStopped: true 
            });
            // Notify background that operation ended
            if (autoUnsubscribe) {
              chrome.runtime.sendMessage({ action: 'unsubscribeOperationEnd' });
            }
            break;
          }
          
          // Wait if paused
          while (state.paused && !state.stopped) {
            await delay(500);
            const newState = await new Promise((resolve) => {
              chrome.storage.local.get(['processingPaused', 'processingStopped'], (result) => {
                resolve({
                  paused: result.processingPaused === true,
                  stopped: result.processingStopped === true
                });
              });
            });
            if (newState.stopped) {
              processResults.stopped = true;
              processResults.message = 'Processing stopped by user';
              // Mark processing as inactive
              chrome.storage.local.set({ 
                processingActive: false, 
                processingPaused: false, 
                processingStopped: true 
              });
              // Notify background that operation ended
              if (autoUnsubscribe) {
                chrome.runtime.sendMessage({ action: 'unsubscribeOperationEnd' });
              }
              break;
            }
            if (!newState.paused) break;
          }
          
          if (state.stopped) break;
          
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
              const skippedDetail = {
                index: i,
                sender: 'Unknown',
                subject: 'Could not extract',
                unsubscribeStatus: 'not_found',
                unsubscribeReason: 'Could not extract email data',
                deleteStatus: 'uncertain',
                deleteReason: 'Could not extract email data - skipped',
                confidence: 0
              };
              processResults.emailDetails.push(skippedDetail);
              
              // Save results incrementally even for skipped emails
              chrome.storage.local.set({ 
                persistedResults: processResults.emailDetails,
                processingResults: processResults
              });
              
              continue;
            }
            
            // Check for unsubscribe options
            const unsubscribeInfo = await checkUnsubscribeOptions();
            const deleteDecision = await shouldDeleteEmail(emailData);
            
            // IMPORTANT: Check whitelist directly for unsubscribe protection
            const isWhitelistedForUnsubscribe = await checkIfWhitelisted(emailData);
            
            // Evaluate advanced filtering rules
            const ruleActions = await evaluateFilteringRules(emailData);
            
            // Initialize status variables
            let unsubscribeStatus = 'not_found';
            let unsubscribeReason = 'No unsubscribe option found';
            let deleteStatus = 'will_not_delete';
            let deleteReason = deleteDecision.reason || 'Does not meet deletion criteria';
            
            // Determine unsubscribe status - Check rules first (rules can override normal logic)
            if (ruleActions && ruleActions.shouldUnsubscribe && !isWhitelistedForUnsubscribe) {
              unsubscribeStatus = 'will_unsubscribe';
              unsubscribeReason = 'Matched filtering rule';
            } else if (unsubscribeInfo.found.length > 0) {
              if (isWhitelistedForUnsubscribe) {
                unsubscribeStatus = 'protected';
                unsubscribeReason = 'Email is whitelisted - unsubscribe skipped';
              } else if (unsubscribeInfo.found.some(f => f.type === 'gmail-native')) {
                unsubscribeStatus = 'will_unsubscribe';
                unsubscribeReason = 'Gmail native unsubscribe button found';
              } else if (unsubscribeInfo.found.some(f => f.type === 'link')) {
                unsubscribeStatus = 'will_unsubscribe';
                unsubscribeReason = 'Unsubscribe link found in email';
              }
            } else if (isWhitelistedForUnsubscribe) {
              unsubscribeStatus = 'protected';
              unsubscribeReason = 'Email is whitelisted';
            }
            
            // Determine delete status - Check rules first (rules can override normal logic)
            if (ruleActions && ruleActions.shouldDelete) {
              deleteStatus = 'will_delete';
              deleteReason = 'Matched filtering rule';
            } else if (ruleActions && ruleActions.shouldArchive) {
              deleteStatus = 'will_delete'; // Archive is treated as delete for status
              deleteReason = 'Matched filtering rule (archive)';
            } else if (deleteDecision.shouldDelete) {
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
            const emailDetail = {
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
            };
            
            processResults.emailDetails.push(emailDetail);
            
            // Save results incrementally to storage so they persist even if popup is closed
            chrome.storage.local.set({ 
              persistedResults: processResults.emailDetails,
              processingResults: processResults
            });
            
            // Execute actions if not in preview mode
            // IMPORTANT: Whitelist check already done above - unsubscribeStatus will be 'protected' for whitelisted emails
            
            if (autoUnsubscribe && !previewOnly && unsubscribeStatus === 'will_unsubscribe') {
              // Only unsubscribe if status is 'will_unsubscribe' (not 'protected' for whitelisted)
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
                // Log failed unsubscribe attempt (unless it was skipped due to whitelist)
                if (!unsubscribeResult.message?.includes('whitelisted')) {
                  logActivity('failed', emailData, unsubscribeResult.message || 'Unsubscribe failed during batch processing');
                }
              }
              await delay(settings.rateLimitDelay);
            } else if (autoUnsubscribe && !previewOnly && unsubscribeStatus === 'protected') {
              // Whitelisted emails are skipped (already marked as protected above)
              // No action needed - they won't be unsubscribed
            }
            
            // IMPORTANT: deleteDecision already checks whitelist, so shouldDelete will be false for whitelisted emails
            if (autoDelete && deleteDecision.shouldDelete && !previewOnly) {
              // Check if archive is enabled instead of delete
              const useArchive = settings.useArchiveInsteadOfDelete === true;
              
              if (useArchive) {
                const archiveResult = await archiveCurrentEmail();
                if (archiveResult.success) {
                  processResults.deleted++; // Count as deleted for stats
                  // Log auto-archive
                  logActivity('deleted', emailData, `Auto-archived: ${deleteDecision.reason || 'Met deletion criteria'} (confidence: ${(deleteDecision.confidence * 100).toFixed(0)}%)`);
                }
              } else {
                const deleteResult = await deleteCurrentEmail();
                if (deleteResult.success) {
                  processResults.deleted++;
                  // Log auto-delete
                  logActivity('deleted', emailData, `Auto-deleted: ${deleteDecision.reason || 'Met deletion criteria'} (confidence: ${(deleteDecision.confidence * 100).toFixed(0)}%)`);
                }
              }
              await delay(settings.rateLimitDelay);
            }
            
            processResults.processed++;
            
            // Track sender frequency for analytics
            if (emailData.senderEmail) {
              trackSenderFrequency(emailData.senderEmail, emailData.senderName || '');
            }
            
          } catch (error) {
            processResults.errors.push({ index: i, error: error.message });
            // Only add to emailDetails if it's a critical error
            // For minor errors, we'll just log it
            let errorDetail;
            if (error.message && !error.message.includes('timeout') && !error.message.includes('not found')) {
              errorDetail = {
                index: i,
                sender: 'Error',
                subject: 'Processing failed',
                unsubscribeStatus: 'error',
                unsubscribeReason: `Error: ${error.message}`,
                deleteStatus: 'error',
                deleteReason: `Error: ${error.message}`,
                confidence: 0
              };
              processResults.emailDetails.push(errorDetail);
            } else {
              // For non-critical errors, mark as skipped
              processResults.skipped++;
              errorDetail = {
                index: i,
                sender: 'Unknown',
                subject: 'Skipped',
                unsubscribeStatus: 'not_found',
                unsubscribeReason: 'Email processing skipped',
                deleteStatus: 'uncertain',
                deleteReason: 'Email processing skipped',
                confidence: 0
              };
              processResults.emailDetails.push(errorDetail);
            }
            
            // Save results incrementally even for errors
            chrome.storage.local.set({ 
              persistedResults: processResults.emailDetails,
              processingResults: processResults
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
        
        // Save final results to storage (in case popup was closed during processing)
        chrome.storage.local.set({ 
          persistedResults: processResults.emailDetails,
          processingResults: processResults
        });
        
        // Mark processing as inactive
        chrome.storage.local.set({ 
          processingActive: false, 
          processingPaused: false, 
          processingStopped: false 
        });
        
        // Notify background that batch unsubscribe operation ended
        if (autoUnsubscribe) {
          chrome.runtime.sendMessage({ action: 'unsubscribeOperationEnd' });
        }
        
        resolve({
          success: true,
          results: processResults,
          message: `Processed ${processResults.processed} emails`
        });
        
      } catch (error) {
        console.error('Process emails error:', error);
        
        // Mark processing as inactive
        chrome.storage.local.set({ 
          processingActive: false, 
          processingPaused: false, 
          processingStopped: false 
        });
        
        // Notify background that operation ended (even on error)
        if (autoUnsubscribe) {
          chrome.runtime.sendMessage({ action: 'unsubscribeOperationEnd' });
        }
        
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
 * Archive currently open email
 */
async function archiveCurrentEmail() {
  try {
    const archiveSelectors = [
      '[aria-label*="Archive" i]',
      '[data-tooltip*="Archive" i]',
      '.T-I-J3[data-tooltip*="Archive" i]',
      'div[role="button"][aria-label*="Archive" i]',
      '[aria-label*="Move to Inbox" i]' // Sometimes archive is shown as "Move to Inbox" when viewing archived
    ];
    
    for (const selector of archiveSelectors) {
      const archiveButton = document.querySelector(selector);
      if (archiveButton && archiveButton.offsetParent !== null) {
        archiveButton.click();
        await delay(300);
        return { success: true };
      }
    }
    
    // Try keyboard shortcut (e) for archive
    const emailView = document.querySelector('[data-message-id]');
    if (emailView) {
      emailView.focus();
      const keyEvent = new KeyboardEvent('keydown', {
        key: 'e',
        code: 'KeyE',
        keyCode: 69,
        which: 69,
        bubbles: true,
        cancelable: true
      });
      document.dispatchEvent(keyEvent);
      await delay(300);
      return { success: true };
    }
    
    return { success: false, message: 'Archive button not found' };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Mark email as unread
 */
async function markEmailAsUnread() {
  try {
    const markUnreadSelectors = [
      '[aria-label*="Mark as unread" i]',
      '[data-tooltip*="Mark as unread" i]',
      'div[role="button"][aria-label*="Mark as unread" i]'
    ];
    
    for (const selector of markUnreadSelectors) {
      const button = document.querySelector(selector);
      if (button && button.offsetParent !== null) {
        button.click();
        await delay(300);
        return { success: true };
      }
    }
    
    // Try keyboard shortcut (Shift+U) for mark as unread
    const emailView = document.querySelector('[data-message-id]');
    if (emailView) {
      emailView.focus();
      const keyEvent = new KeyboardEvent('keydown', {
        key: 'u',
        code: 'KeyU',
        keyCode: 85,
        which: 85,
        shiftKey: true,
        bubbles: true,
        cancelable: true
      });
      document.dispatchEvent(keyEvent);
      await delay(300);
      return { success: true };
    }
    
    return { success: false, message: 'Mark as unread button not found' };
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
                const normalizedItem = item.toLowerCase().trim();
                if (!normalizedItem) return false;
                
                const senderDomain = senderEmail.includes('@') 
                  ? senderEmail.split('@')[1] 
                  : '';
                
                // Exact match
                if (senderEmail === normalizedItem || senderName === normalizedItem) {
                  return true;
                }
                
                // Domain match with @ prefix
                if (normalizedItem.startsWith('@') && senderDomain === normalizedItem.substring(1)) {
                  return true;
                }
                
                // Domain match without @ prefix
                if (!normalizedItem.includes('@') && senderDomain === normalizedItem) {
                  return true;
                }
                
                // Wildcard domain match
                if (normalizedItem.includes('*@')) {
                  const domain = normalizedItem.split('@')[1];
                  if (senderDomain === domain) {
                    return true;
                  }
                }
                
                // Substring match
                return senderEmail.includes(normalizedItem) || senderName.includes(normalizedItem);
              });
              
              if (isWhitelisted) {
                // Mark as read instead of deleting
                await markEmailAsRead();
                deleteResults.markedRead++;
                await delay(settings.rateLimitDelay);
                continue;
              }
            }
            
            // Delete or archive the email
            const useArchive = settings.useArchiveInsteadOfDelete === true;
            let actionResult;
            
            if (useArchive) {
              actionResult = await archiveCurrentEmail();
            } else {
              actionResult = await deleteCurrentEmail();
            }
            
            if (actionResult.success) {
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
