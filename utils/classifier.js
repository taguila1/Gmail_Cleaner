// Email classification utilities for determining if email is junk/safe to delete

/**
 * Check if email is in whitelist
 */
async function isWhitelisted(senderEmail, senderName) {
  return new Promise((resolve) => {
    chrome.storage.sync.get(['whitelist'], (result) => {
      const whitelist = result.whitelist || [];
      const normalizedSender = senderEmail?.toLowerCase() || '';
      const normalizedName = senderName?.toLowerCase() || '';
      
      const isWhitelisted = whitelist.some(item => {
        const normalizedItem = item.toLowerCase().trim();
        if (!normalizedItem) return false;
        
        const senderDomain = normalizedSender.includes('@') 
          ? normalizedSender.split('@')[1] 
          : '';
        
        // Exact match
        if (normalizedSender === normalizedItem || normalizedName === normalizedItem) {
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
        return normalizedSender.includes(normalizedItem) || normalizedName.includes(normalizedItem);
      });
      
      resolve(isWhitelisted);
    });
  });
}

/**
 * Check if email is in blacklist
 */
async function isBlacklisted(senderEmail, senderName) {
  return new Promise((resolve) => {
    chrome.storage.sync.get(['blacklist'], (result) => {
      const blacklist = result.blacklist || [];
      const normalizedSender = senderEmail?.toLowerCase() || '';
      const normalizedName = senderName?.toLowerCase() || '';
      
      const isBlacklisted = blacklist.some(item => {
        const normalizedItem = item.toLowerCase().trim();
        if (!normalizedItem) return false;
        
        const senderDomain = normalizedSender.includes('@') 
          ? normalizedSender.split('@')[1] 
          : '';
        
        // Exact match
        if (normalizedSender === normalizedItem || normalizedName === normalizedItem) {
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
        return normalizedSender.includes(normalizedItem) || normalizedName.includes(normalizedItem);
      });
      
      resolve(isBlacklisted);
    });
  });
}

/**
 * Calculate confidence score for email being junk (0-1)
 * Higher score = more likely to be junk
 */
function calculateJunkScore(emailData) {
  let score = 0;
  const factors = [];
  
  const {
    senderEmail = '',
    senderName = '',
    subject = '',
    body = '',
    date = null,
    hasAttachments = false,
    isStarred = false,
    isImportant = false,
    hasLabels = []
  } = emailData;
  
  // Negative factors (reduce junk score - these indicate legitimate email)
  if (isStarred) {
    score -= 0.3;
    factors.push({ factor: 'starred', impact: -0.3 });
  }
  
  if (isImportant) {
    score -= 0.2;
    factors.push({ factor: 'important', impact: -0.2 });
  }
  
  if (hasAttachments) {
    score -= 0.15;
    factors.push({ factor: 'has_attachments', impact: -0.15 });
  }
  
  // Check for personal/important labels
  const importantLabels = ['important', 'work', 'personal', 'family', 'friends'];
  if (hasLabels.some(label => importantLabels.some(imp => label.toLowerCase().includes(imp)))) {
    score -= 0.2;
    factors.push({ factor: 'important_labels', impact: -0.2 });
  }
  
  // Positive factors (increase junk score)
  
  // Common junk email patterns in subject
  const junkSubjectPatterns = [
    /^(re|fwd?|fw):\s*(re|fwd?|fw):/i, // Multiple forwards
    /^\[.*spam.*\]/i,
    /viagra|cialis|pills|pharmacy/i,
    /winner|prize|congratulations.*won/i,
    /urgent.*action.*required/i,
    /limited.*time.*offer/i,
    /click.*here.*now/i
  ];
  
  junkSubjectPatterns.forEach(pattern => {
    if (pattern.test(subject)) {
      score += 0.2;
      factors.push({ factor: 'junk_subject_pattern', impact: 0.2 });
    }
  });
  
  // Newsletter/marketing indicators
  const marketingPatterns = [
    /newsletter/i,
    /promotional/i,
    /marketing/i,
    /special.*offer/i,
    /sale.*now/i,
    /discount.*code/i
  ];
  
  marketingPatterns.forEach(pattern => {
    if (pattern.test(subject) || pattern.test(body?.substring(0, 500))) {
      score += 0.15;
      factors.push({ factor: 'marketing_pattern', impact: 0.15 });
    }
  });
  
  // Sender domain analysis
  const senderDomain = senderEmail.split('@')[1]?.toLowerCase() || '';
  
  // Known newsletter/marketing domains (partial list)
  const marketingDomains = [
    'mailchimp', 'constantcontact', 'campaign', 'newsletter',
    'noreply', 'no-reply', 'donotreply', 'mailer'
  ];
  
  if (marketingDomains.some(domain => senderDomain.includes(domain))) {
    score += 0.2;
    factors.push({ factor: 'marketing_domain', impact: 0.2 });
  }
  
  // Sender name patterns
  if (/noreply|no-reply|donotreply/i.test(senderName || senderEmail)) {
    score += 0.15;
    factors.push({ factor: 'noreply_sender', impact: 0.15 });
  }
  
  // Email age (older emails more likely to be junk if unread)
  if (date) {
    const emailDate = new Date(date);
    const daysOld = (Date.now() - emailDate.getTime()) / (1000 * 60 * 60 * 24);
    if (daysOld > 30) {
      score += 0.1;
      factors.push({ factor: 'old_email', impact: 0.1 });
    }
  }
  
  // Normalize score to 0-1 range
  score = Math.max(0, Math.min(1, score));
  
  return {
    score,
    factors,
    recommendation: score > 0.6 ? 'likely_junk' : score < 0.3 ? 'likely_legitimate' : 'uncertain'
  };
}

/**
 * Determine if email should be deleted based on classification
 */
async function shouldDeleteEmail(emailData) {
  // Never delete if whitelisted
  const whitelisted = await isWhitelisted(emailData.senderEmail, emailData.senderName);
  if (whitelisted) {
    return {
      shouldDelete: false,
      reason: 'whitelisted',
      confidence: 1.0
    };
  }
  
  // Always safe to delete if blacklisted
  const blacklisted = await isBlacklisted(emailData.senderEmail, emailData.senderName);
  if (blacklisted) {
    return {
      shouldDelete: true,
      reason: 'blacklisted',
      confidence: 1.0
    };
  }
  
  // Calculate junk score
  const classification = calculateJunkScore(emailData);
  
  // Get minimum confidence threshold from settings
  return new Promise((resolve) => {
    chrome.storage.sync.get(['settings'], (result) => {
      const minConfidence = result.settings?.minConfidenceForDelete || 0.7;
      const shouldDelete = classification.score >= minConfidence;
      
      resolve({
        shouldDelete,
        reason: classification.recommendation,
        confidence: classification.score,
        factors: classification.factors
      });
    });
  });
}

/**
 * Extract email data from Gmail DOM
 */
function extractEmailData(emailElement) {
  // This is a simplified version - Gmail's DOM structure is complex
  // In production, you'd need more robust selectors
  
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
  const senderSelectors = [
    '.gD', // Gmail's sender class
    '[email]',
    '.go'
  ];
  
  for (const selector of senderSelectors) {
    const senderEl = emailElement.querySelector(selector);
    if (senderEl) {
      data.senderEmail = senderEl.getAttribute('email') || senderEl.textContent || '';
      data.senderName = senderEl.textContent || '';
      break;
    }
  }
  
  // Try to find subject
  const subjectEl = emailElement.querySelector('h2') || 
                    emailElement.querySelector('.hP');
  if (subjectEl) {
    data.subject = subjectEl.textContent || '';
  }
  
  // Try to find date
  const dateEl = emailElement.querySelector('.g3') || 
                 emailElement.querySelector('[title*=":"]');
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

