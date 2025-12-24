// Advanced filtering rules engine
// Allows users to create custom rules for email processing

/**
 * Evaluate a single rule against email data
 */
function evaluateRule(rule, emailData) {
  if (!rule.enabled) return false;
  
  const conditions = rule.conditions || [];
  if (conditions.length === 0) return false;
  
  // All conditions must match (AND logic)
  return conditions.every(condition => evaluateCondition(condition, emailData));
}

/**
 * Evaluate a single condition
 */
function evaluateCondition(condition, emailData) {
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
    default:
      return false;
  }
  
  const conditionValue = (value || '').toLowerCase();
  
  switch (operator) {
    case 'contains':
      return fieldValue.includes(conditionValue);
    case 'notContains':
      return !fieldValue.includes(conditionValue);
    case 'equals':
      return fieldValue === conditionValue;
    case 'notEquals':
      return fieldValue !== conditionValue;
    case 'startsWith':
      return fieldValue.startsWith(conditionValue);
    case 'endsWith':
      return fieldValue.endsWith(conditionValue);
    case 'matchesRegex':
      try {
        const regex = new RegExp(conditionValue, 'i');
        return regex.test(fieldValue);
      } catch (e) {
        return false;
      }
    case 'greaterThan':
      return parseFloat(fieldValue) > parseFloat(conditionValue);
    case 'lessThan':
      return parseFloat(fieldValue) < parseFloat(conditionValue);
    case 'greaterThanOrEqual':
      return parseFloat(fieldValue) >= parseFloat(conditionValue);
    case 'lessThanOrEqual':
      return parseFloat(fieldValue) <= parseFloat(conditionValue);
    default:
      return false;
  }
}

/**
 * Evaluate all rules and return matching actions
 */
async function evaluateRules(emailData) {
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
        shouldAddLabel: null,
        priority: 0 // Higher priority rules override lower priority
      };
      
      // Sort rules by priority (higher first)
      const sortedRules = [...rules].sort((a, b) => (b.priority || 0) - (a.priority || 0));
      
      for (const rule of sortedRules) {
        if (evaluateRule(rule, emailData)) {
          // Apply rule actions
          if (rule.actions.unsubscribe) actions.shouldUnsubscribe = true;
          if (rule.actions.delete) actions.shouldDelete = true;
          if (rule.actions.archive) actions.shouldArchive = true;
          if (rule.actions.markAsRead) actions.shouldMarkAsRead = true;
          if (rule.actions.markAsUnread) actions.shouldMarkAsUnread = true;
          if (rule.actions.star) actions.shouldStar = true;
          if (rule.actions.addLabel) actions.shouldAddLabel = rule.actions.addLabel;
          
          // Stop at first matching rule if stopOnMatch is true
          if (rule.stopOnMatch) break;
        }
      }
      
      resolve(actions);
    });
  });
}

/**
 * Get default rule template
 */
function getDefaultRule() {
  return {
    id: Date.now().toString(),
    name: 'New Rule',
    enabled: true,
    priority: 0,
    stopOnMatch: false,
    conditions: [
      {
        field: 'senderEmail',
        operator: 'contains',
        value: ''
      }
    ],
    actions: {
      unsubscribe: false,
      delete: false,
      archive: false,
      markAsRead: false,
      markAsUnread: false,
      star: false,
      addLabel: null
    }
  };
}

/**
 * Save a rule
 */
function saveRule(rule) {
  return new Promise((resolve) => {
    chrome.storage.sync.get(['filterRules'], (result) => {
      const rules = result.filterRules || [];
      const existingIndex = rules.findIndex(r => r.id === rule.id);
      
      if (existingIndex >= 0) {
        rules[existingIndex] = rule;
      } else {
        rules.push(rule);
      }
      
      chrome.storage.sync.set({ filterRules: rules }, () => {
        resolve({ success: true });
      });
    });
  });
}

/**
 * Delete a rule
 */
function deleteRule(ruleId) {
  return new Promise((resolve) => {
    chrome.storage.sync.get(['filterRules'], (result) => {
      const rules = result.filterRules || [];
      const filtered = rules.filter(r => r.id !== ruleId);
      
      chrome.storage.sync.set({ filterRules: filtered }, () => {
        resolve({ success: true });
      });
    });
  });
}

/**
 * Get all rules
 */
function getAllRules() {
  return new Promise((resolve) => {
    chrome.storage.sync.get(['filterRules'], (result) => {
      resolve(result.filterRules || []);
    });
  });
}

