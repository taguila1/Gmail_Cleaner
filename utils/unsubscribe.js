// Unsubscribe detection and execution utilities

/**
 * Extract List-Unsubscribe headers from email
 * Gmail stores email data in the DOM, we need to find it
 */
export function findUnsubscribeHeaders(emailElement) {
  // Gmail stores email data in various places
  // Try to find email headers in the DOM
  const headers = {
    listUnsubscribe: null,
    listUnsubscribePost: null
  };
  
  // Method 1: Check if Gmail exposes email data
  // Gmail sometimes stores email data in data attributes or in the email view
  const emailView = emailElement?.closest('[data-message-id]');
  if (emailView) {
    // Try to extract from Gmail's internal data structure
    // This is a simplified version - Gmail's structure is complex
  }
  
  return headers;
}

/**
 * Find unsubscribe links in email DOM
 */
function findUnsubscribeLinks(emailElement) {
  const links = [];
  
  if (!emailElement) return links;
  
  // Common unsubscribe patterns
  const unsubscribePatterns = [
    /unsubscribe/i,
    /opt.?out/i,
    /remove.*subscription/i,
    /manage.*preferences/i,
    /email.*preferences/i,
    /preference.*center/i,
    /update.*subscription/i
  ];
  
  // Find all links in the email
  const allLinks = emailElement.querySelectorAll('a[href]');
  
  allLinks.forEach(link => {
    const href = link.getAttribute('href') || '';
    const text = link.textContent?.toLowerCase() || '';
    const title = link.getAttribute('title')?.toLowerCase() || '';
    
    // Check if link matches unsubscribe patterns
    const matches = unsubscribePatterns.some(pattern => 
      pattern.test(text) || pattern.test(title) || pattern.test(href)
    );
    
    // Also check for common unsubscribe URLs
    const isUnsubscribeUrl = /unsubscribe|optout|preferences|manage/i.test(href);
    
    if (matches || isUnsubscribeUrl) {
      // Avoid false positives (like "subscribe" links)
      if (!/subscribe|sign.?up|join/i.test(text) || /unsubscribe/i.test(text)) {
        links.push({
          element: link,
          href: href,
          text: text.trim(),
          method: 'GET' // Default, will check for POST later
        });
      }
    }
  });
  
  return links;
}

/**
 * Find Gmail's native unsubscribe button
 */
function findGmailUnsubscribeButton() {
  // Gmail's unsubscribe button has specific selectors
  // These may change, so we use multiple strategies
  const selectors = [
    '[data-action="unsubscribe"]',
    '[aria-label*="unsubscribe" i]',
    'div[role="button"][aria-label*="unsubscribe" i]',
    '.unsubscribe-button',
    'button:has-text("Unsubscribe")'
  ];
  
  for (const selector of selectors) {
    try {
      const button = document.querySelector(selector);
      if (button && button.offsetParent !== null) { // Check if visible
        return button;
      }
    } catch (e) {
      // Invalid selector, continue
    }
  }
  
  // Fallback: search by text content
  const buttons = document.querySelectorAll('button, div[role="button"]');
  for (const button of buttons) {
    const text = button.textContent?.toLowerCase() || '';
    const ariaLabel = button.getAttribute('aria-label')?.toLowerCase() || '';
    if ((text.includes('unsubscribe') || ariaLabel.includes('unsubscribe')) &&
        !text.includes('subscribe') && !ariaLabel.includes('subscribe')) {
      if (button.offsetParent !== null) {
        return button;
      }
    }
  }
  
  return null;
}

/**
 * Execute unsubscribe action
 */
async function executeUnsubscribe(unsubscribeLink, method = 'GET') {
  try {
    if (method === 'POST') {
      // Handle POST unsubscribe (List-Unsubscribe-Post)
      const response = await fetch(unsubscribeLink.href, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      });
      return { success: response.ok, method: 'POST' };
    } else {
      // Handle GET unsubscribe or click button
      if (unsubscribeLink.element) {
        // Click the element
        unsubscribeLink.element.click();
        return { success: true, method: 'CLICK' };
      } else if (unsubscribeLink.href) {
        // Open the unsubscribe URL
        window.open(unsubscribeLink.href, '_blank');
        return { success: true, method: 'GET' };
      }
    }
  } catch (error) {
    console.error('Unsubscribe error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Process all unsubscribe opportunities in current email view
 */
async function processUnsubscribeForCurrentEmail() {
  const results = {
    found: [],
    executed: [],
    errors: []
  };
  
  // Try Gmail's native button first
  const gmailButton = findGmailUnsubscribeButton();
  if (gmailButton) {
    results.found.push({
      type: 'gmail-native',
      element: gmailButton
    });
    
    try {
      gmailButton.click();
      results.executed.push({
        type: 'gmail-native',
        success: true
      });
      return results;
    } catch (error) {
      results.errors.push({
        type: 'gmail-native',
        error: error.message
      });
    }
  }
  
  // Find email content element
  // Gmail's email view structure
  const emailView = document.querySelector('[data-message-id]') || 
                    document.querySelector('.nH.if') ||
                    document.querySelector('.a3s');
  
  if (emailView) {
    // Find unsubscribe links in email content
    const links = findUnsubscribeLinks(emailView);
    results.found.push(...links.map(link => ({ type: 'link', ...link })));
    
    // Execute first valid unsubscribe link
    if (links.length > 0) {
      const link = links[0];
      const result = await executeUnsubscribe(link, link.method);
      results.executed.push({
        type: 'link',
        href: link.href,
        ...result
      });
    }
  }
  
  return results;
}

