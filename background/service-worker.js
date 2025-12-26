// Background Service Worker for Gmail Cleaner
// Handles coordination between content scripts and popup

chrome.runtime.onInstalled.addListener((details) => {
  console.log('Gmail Cleaner extension installed', details);
  
  // Handle first install - show onboarding
  if (details.reason === 'install') {
    chrome.storage.local.get(['onboardingCompleted'], (result) => {
      if (!result.onboardingCompleted) {
        // Open onboarding page
        chrome.tabs.create({ url: chrome.runtime.getURL('onboarding/onboarding.html') });
      }
    });
  }
  
  // Handle updates - migrate storage if needed
  if (details.reason === 'update') {
    handleUpdate(details.previousVersion);
  }
  
  // Initialize default settings
  chrome.storage.sync.get(['settings', 'whitelist', 'blacklist'], (result) => {
    const defaults = {
      settings: {
        autoUnsubscribe: false,
        autoDelete: false,
        previewMode: true,
        rateLimitDelay: 1000, // ms between actions
        minConfidenceForDelete: 0.7,
        useArchiveInsteadOfDelete: false,
        groupUnsubscribeTabs: true,
        scheduledCleanup: {
          enabled: false,
          frequency: 'daily', // 'daily' or 'weekly'
          time: '09:00', // HH:MM format
          autoUnsubscribe: false,
          autoDelete: false
        }
      },
      whitelist: [],
      blacklist: []
    };
    
    if (!result.settings) {
      chrome.storage.sync.set({ settings: defaults.settings });
    } else {
      // Merge with defaults to add new settings
      const mergedSettings = { ...defaults.settings, ...result.settings };
      if (!mergedSettings.useArchiveInsteadOfDelete) {
        mergedSettings.useArchiveInsteadOfDelete = false;
      }
      if (!mergedSettings.scheduledCleanup) {
        mergedSettings.scheduledCleanup = defaults.settings.scheduledCleanup;
      }
      chrome.storage.sync.set({ settings: mergedSettings });
    }
    if (!result.whitelist) {
      chrome.storage.sync.set({ whitelist: defaults.whitelist });
    }
    if (!result.blacklist) {
      chrome.storage.sync.set({ blacklist: defaults.blacklist });
    }
    
    // Setup scheduled cleanup alarm if enabled
    setupScheduledCleanup();
  });
});

/**
 * Setup scheduled cleanup alarm
 */
function setupScheduledCleanup() {
  chrome.storage.sync.get(['settings'], (result) => {
    const settings = result.settings || {};
    const scheduledCleanup = settings.scheduledCleanup || {};
    
    // Clear existing alarm
    chrome.alarms.clear('scheduledCleanup');
    
    if (scheduledCleanup.enabled) {
      const time = scheduledCleanup.time || '09:00';
      const [hours, minutes] = time.split(':').map(Number);
      const frequency = scheduledCleanup.frequency || 'daily';
      
      // Calculate when to trigger
      const now = new Date();
      const triggerTime = new Date();
      triggerTime.setHours(hours, minutes, 0, 0);
      
      // If time has passed today, schedule for tomorrow
      if (triggerTime <= now) {
        triggerTime.setDate(triggerTime.getDate() + 1);
      }
      
      // For weekly, find next occurrence of the day
      if (frequency === 'weekly') {
        const daysUntilNext = (7 - now.getDay() + 1) % 7 || 7;
        triggerTime.setDate(triggerTime.getDate() + daysUntilNext);
      }
      
      const delayInMinutes = Math.round((triggerTime.getTime() - now.getTime()) / (1000 * 60));
      const periodInMinutes = frequency === 'daily' ? 24 * 60 : 7 * 24 * 60;
      
      chrome.alarms.create('scheduledCleanup', {
        delayInMinutes: delayInMinutes,
        periodInMinutes: periodInMinutes
      });
      
      console.log(`Scheduled cleanup set for ${triggerTime.toLocaleString()}, repeating ${frequency}`);
    }
  });
}

/**
 * Handle scheduled cleanup alarm
 */
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'scheduledCleanup') {
    console.log('Scheduled cleanup triggered');
    
    chrome.storage.sync.get(['settings'], (result) => {
      const settings = result.settings || {};
      const scheduledCleanup = settings.scheduledCleanup || {};
      
      if (scheduledCleanup.enabled) {
        // Find Gmail tab and trigger cleanup
        chrome.tabs.query({ url: 'https://mail.google.com/*' }, (tabs) => {
          if (tabs.length > 0) {
            // Use the first Gmail tab
            const gmailTab = tabs[0];
            chrome.tabs.sendMessage(gmailTab.id, {
              action: 'processEmails',
              options: {
                maxEmails: 50,
                previewOnly: false,
                autoUnsubscribe: scheduledCleanup.autoUnsubscribe || false,
                autoDelete: scheduledCleanup.autoDelete || false
              }
            }, (response) => {
              if (chrome.runtime.lastError) {
                console.error('Scheduled cleanup error:', chrome.runtime.lastError);
              } else {
                console.log('Scheduled cleanup completed:', response);
              }
            });
          } else {
            console.log('No Gmail tab found for scheduled cleanup');
          }
        });
      }
    });
  }
});

// Tab grouping state
let unsubscribeOperationActive = false;
let unsubscribeTabs = new Set();
const GROUP_NAME = 'Further Unsubscribe Action Required';

// Listen for messages from content script or popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'getSettings') {
    chrome.storage.sync.get(['settings', 'whitelist', 'blacklist'], (result) => {
      sendResponse(result);
    });
    return true; // Will respond asynchronously
  }
  
  // Track unsubscribe operation start
  if (request.action === 'unsubscribeOperationStart') {
    unsubscribeOperationActive = true;
    unsubscribeTabs.clear();
    if (sender.tab) {
      unsubscribeTabs.add(sender.tab.id);
    }
    sendResponse({ success: true });
    return true;
  }
  
  // Track unsubscribe operation end
  if (request.action === 'unsubscribeOperationEnd') {
    unsubscribeOperationActive = false;
    // Group all tracked tabs
    groupUnsubscribeTabs().then(() => {
      unsubscribeTabs.clear();
    });
    sendResponse({ success: true });
    return true;
  }
  
  // Track tab opened during unsubscribe
  if (request.action === 'unsubscribeTabOpened' && unsubscribeOperationActive) {
    if (sender.tab) {
      unsubscribeTabs.add(sender.tab.id);
    }
    sendResponse({ success: true });
    return true;
  }
  
  // Open unsubscribe tab without focusing
  if (request.action === 'openUnsubscribeTab') {
    chrome.tabs.create({
      url: request.url,
      active: false // Open in background (no focus)
    }, (tab) => {
      if (tab && unsubscribeOperationActive) {
        unsubscribeTabs.add(tab.id);
        // Group the tab
        chrome.storage.sync.get(['settings'], (result) => {
          const settings = result.settings || {};
          if (settings.groupUnsubscribeTabs !== false) {
            setTimeout(() => {
              groupUnsubscribeTabs();
            }, 500);
          }
        });
      }
      sendResponse({ success: true, tabId: tab?.id });
    });
    return true;
  }
  
  if (request.action === 'saveSettings') {
    chrome.storage.sync.set({ settings: request.settings }, () => {
      sendResponse({ success: true });
    });
    return true;
  }
  
  if (request.action === 'addToWhitelist') {
    chrome.storage.sync.get(['whitelist'], (result) => {
      const whitelist = result.whitelist || [];
      if (!whitelist.includes(request.email)) {
        whitelist.push(request.email);
        chrome.storage.sync.set({ whitelist }, () => {
          sendResponse({ success: true });
        });
      } else {
        sendResponse({ success: true, message: 'Already in whitelist' });
      }
    });
    return true;
  }
  
  if (request.action === 'addToBlacklist') {
    chrome.storage.sync.get(['blacklist'], (result) => {
      const blacklist = result.blacklist || [];
      if (!blacklist.includes(request.email)) {
        blacklist.push(request.email);
        chrome.storage.sync.set({ blacklist }, () => {
          sendResponse({ success: true });
        });
      } else {
        sendResponse({ success: true, message: 'Already in blacklist' });
      }
    });
    return true;
  }
  
  if (request.action === 'getStats') {
    chrome.storage.local.get(['stats'], (result) => {
      sendResponse({ stats: result.stats || { unsubscribed: 0, deleted: 0, processed: 0 } });
    });
    return true;
  }
  
  if (request.action === 'updateStats') {
    chrome.storage.local.get(['stats'], (result) => {
      const stats = result.stats || { unsubscribed: 0, deleted: 0, processed: 0 };
      Object.assign(stats, request.stats);
      chrome.storage.local.set({ stats }, () => {
        sendResponse({ success: true });
      });
    });
    return true;
  }
  
  if (request.action === 'saveSettings') {
    chrome.storage.sync.set({ settings: request.settings }, () => {
      // Re-setup scheduled cleanup if settings changed
      setupScheduledCleanup();
      sendResponse({ success: true });
    });
    return true;
  }
});

/**
 * Handle extension updates
 */
function handleUpdate(previousVersion) {
  console.log(`Updating from version ${previousVersion}`);
  
  // Get current version from manifest
  const currentVersion = chrome.runtime.getManifest().version;
  
  // Store version for future migrations
  chrome.storage.local.set({ 
    lastVersion: previousVersion,
    currentVersion: currentVersion,
    lastUpdateTime: new Date().toISOString()
  });
  
  // Perform storage migrations if needed
  migrateStorage(previousVersion, currentVersion);
  
  // Handle content script updates
  // Note: Old content scripts in open tabs won't be updated automatically
  // We'll inject new scripts when tabs are accessed
  chrome.tabs.query({ url: 'https://mail.google.com/*' }, (tabs) => {
    tabs.forEach(tab => {
      // Inject updated content script
      chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ['content/content-script.js']
      }).catch(err => {
        // Tab might not be ready, that's okay
        console.log('Could not inject updated script:', err);
      });
    });
  });
}

/**
 * Migrate storage schema between versions
 */
function migrateStorage(oldVersion, newVersion) {
  chrome.storage.sync.get(['settings'], (result) => {
    const settings = result.settings || {};
    let needsUpdate = false;
    
    // Migration: Add new settings fields if they don't exist
    if (!settings.hasOwnProperty('advancedUser')) {
      settings.advancedUser = false;
      needsUpdate = true;
    }
    
    if (!settings.hasOwnProperty('useArchiveInsteadOfDelete')) {
      settings.useArchiveInsteadOfDelete = false;
      needsUpdate = true;
    }
    
    if (!settings.scheduledCleanup) {
      settings.scheduledCleanup = {
        enabled: false,
        frequency: 'daily',
        time: '09:00',
        autoUnsubscribe: false,
        autoDelete: false
      };
      needsUpdate = true;
    }
    
    if (needsUpdate) {
      chrome.storage.sync.set({ settings }, () => {
        console.log('Storage migrated successfully');
      });
    }
  });
}

/**
 * Handle keyboard shortcuts (commands)
 */
chrome.commands.onCommand.addListener((command) => {
  if (command === 'unsubscribe-current') {
    // Find active Gmail tab and send unsubscribe command
    chrome.tabs.query({ active: true, url: 'https://mail.google.com/*' }, (tabs) => {
      if (tabs.length > 0) {
        chrome.tabs.sendMessage(tabs[0].id, { action: 'unsubscribe' });
      } else {
        // Open Gmail if not already open
        chrome.tabs.create({ url: 'https://mail.google.com' });
      }
    });
  } else if (command === 'process-emails') {
    // Find active Gmail tab and send process command
    chrome.tabs.query({ active: true, url: 'https://mail.google.com/*' }, (tabs) => {
      if (tabs.length > 0) {
        chrome.tabs.sendMessage(tabs[0].id, { 
          action: 'processEmails',
          options: { maxEmails: 50, previewOnly: true }
        });
      } else {
        chrome.tabs.create({ url: 'https://mail.google.com' });
      }
    });
  } else if (command === 'open-settings') {
    chrome.runtime.openOptionsPage();
  }
});

/**
 * Track new tabs created during unsubscribe operations
 */
chrome.tabs.onCreated.addListener((tab) => {
  if (unsubscribeOperationActive && tab.url && !tab.url.startsWith('chrome://') && !tab.url.startsWith('chrome-extension://')) {
    unsubscribeTabs.add(tab.id);
    // Group immediately if setting is enabled (with a small delay to ensure tab is fully created)
    chrome.storage.sync.get(['settings'], (result) => {
      const settings = result.settings || {};
      if (settings.groupUnsubscribeTabs !== false) {
        setTimeout(() => {
          groupUnsubscribeTabs();
        }, 500);
      }
    });
  }
});

/**
 * Group tabs opened during unsubscribe operations
 */
async function groupUnsubscribeTabs() {
  try {
    // Check if feature is enabled
    const result = await new Promise((resolve) => {
      chrome.storage.sync.get(['settings'], resolve);
    });
    const settings = result.settings || {};
    if (settings.groupUnsubscribeTabs === false) {
      return;
    }
    
    if (unsubscribeTabs.size === 0) {
      return;
    }
    
    const tabIds = Array.from(unsubscribeTabs).filter(id => id !== undefined && id !== null);
    if (tabIds.length === 0) {
      return;
    }
    
    // Check if tabs still exist
    const existingTabs = await new Promise((resolve) => {
      chrome.tabs.query({}, (tabs) => {
        resolve(tabs.map(t => t.id));
      });
    });
    
    const validTabIds = tabIds.filter(id => existingTabs.includes(id));
    if (validTabIds.length === 0) {
      return;
    }
    
    // Find existing group with the same name
    const groups = await new Promise((resolve) => {
      chrome.tabGroups.query({ title: GROUP_NAME }, resolve);
    });
    
    let groupId;
    if (groups.length > 0) {
      // Use existing group
      groupId = groups[0].id;
      // Get current tabs in the group
      const currentTabs = await new Promise((resolve) => {
        chrome.tabs.query({ groupId: groupId }, (tabs) => {
          resolve(tabs.map(t => t.id));
        });
      });
      // Add new tabs to existing group
      const tabsToAdd = validTabIds.filter(id => !currentTabs.includes(id));
      if (tabsToAdd.length > 0) {
        chrome.tabs.group({ groupId: groupId, tabIds: tabsToAdd }, (newGroupId) => {
          if (chrome.runtime.lastError) {
            console.error('Error adding tabs to existing group:', chrome.runtime.lastError);
          } else {
            console.log(`Added ${tabsToAdd.length} tabs to existing group "${GROUP_NAME}"`);
          }
        });
      }
    } else {
      // Create new group
      chrome.tabs.group({ tabIds: validTabIds }, (newGroupId) => {
        if (chrome.runtime.lastError) {
          console.error('Error creating tab group:', chrome.runtime.lastError);
        } else {
          // Update group title and color
          chrome.tabGroups.update(newGroupId, {
            title: GROUP_NAME,
            color: 'blue'
          }, () => {
            if (chrome.runtime.lastError) {
              console.error('Error updating group:', chrome.runtime.lastError);
            } else {
              console.log(`Created new group "${GROUP_NAME}" with ${validTabIds.length} tabs`);
            }
          });
        }
      });
    }
  } catch (error) {
    console.error('Error grouping unsubscribe tabs:', error);
  }
}

