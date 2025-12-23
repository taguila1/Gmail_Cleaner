# Gmail Cleaner Chrome Extension - Brainstorming & Architecture

## Core Requirements

### 1. Auto-Unsubscribe Feature
**Challenge**: Gmail's unsubscribe links/buttons are not standardized and can appear in various formats:
- List-Unsubscribe headers (RFC 2369/8058)
- Unsubscribe links in email body
- Gmail's native unsubscribe button (when available)
- Various text patterns: "unsubscribe", "opt-out", "manage preferences", etc.

**Approach Options**:
- **Option A**: Parse email headers for `List-Unsubscribe` and `List-Unsubscribe-Post` headers (most reliable)
- **Option B**: DOM scanning for unsubscribe links/buttons in email content
- **Option C**: Hybrid approach - try headers first, fallback to DOM scanning
- **Option D**: Use Gmail's native unsubscribe UI when available

**Recommended**: Option C (Hybrid) - Most comprehensive coverage

**Implementation Strategy**:
1. Content Script to inject into Gmail pages
2. Background Service Worker for coordination
3. Parse email headers via Gmail API or DOM inspection
4. Pattern matching for unsubscribe links (regex + heuristics)
5. Queue system for batch processing
6. Rate limiting to avoid triggering spam detection

### 2. Smart Email Classification
**Challenge**: Distinguishing junk from legitimate emails without false positives

**Approach Options**:
- **Option A**: Heuristic-based filtering (sender domain, subject patterns, etc.)
- **Option B**: Machine learning classification (requires training data)
- **Option C**: User-defined rules (whitelist/blacklist)
- **Option D**: Integration with existing spam filters

**Recommended**: Option C + Option A (User rules + heuristics)

**Implementation Strategy**:
1. Whitelist system (never delete from these senders/domains)
2. Blacklist system (always safe to delete)
3. Heuristic scoring:
   - Sender reputation (known domains)
   - Email age
   - Engagement history (opened, replied, starred)
   - Subject line patterns
   - Attachment presence
4. Confidence threshold before deletion
5. Preview mode before actual deletion

### 3. Additional Feature Ideas

#### A. Bulk Operations
- Batch unsubscribe from multiple emails
- Bulk delete with preview
- Archive instead of delete (safer option)
- Mark as read/unread

#### B. Email Analytics
- Statistics dashboard (emails processed, unsubscribed, deleted)
- Sender frequency analysis
- Email volume trends
- Time saved estimate

#### C. Smart Filters
- Auto-categorize by sender domain
- Group similar emails (newsletters, receipts, etc.)
- Identify subscription emails vs. transactional
- Find duplicate emails

#### D. Safety Features
- Undo functionality (Gmail's native undo + extension backup)
- Dry-run mode (preview without changes)
- Confirmation dialogs for bulk operations
- Activity log/audit trail
- Backup before deletion (optional)

#### E. Automation
- Scheduled cleanup (daily/weekly)
- Auto-unsubscribe on new emails
- Auto-delete based on age + classification
- Smart archiving rules

#### F. User Experience
- Progress indicators for bulk operations
- Pause/resume functionality
- Customizable keyboard shortcuts
- Quick actions toolbar
- Notification system

#### G. Advanced Features
- Email content analysis (NLP for sentiment/importance)
- Integration with email rules/filters
- Export unsubscribe list
- Import/export settings
- Multi-account support

## Technical Architecture

### Extension Structure
```
GmailCleaner/
├── manifest.json          # Extension manifest (Manifest V3)
├── background/
│   └── service-worker.js  # Background service worker
├── content/
│   ├── content-script.js  # Injected into Gmail pages
│   └── gmail-api.js       # Gmail DOM/API interaction
├── popup/
│   ├── popup.html         # Extension popup UI
│   ├── popup.js
│   └── popup.css
├── options/
│   ├── options.html       # Settings page
│   ├── options.js
│   └── options.css
├── utils/
│   ├── unsubscribe.js     # Unsubscribe logic
│   ├── classifier.js      # Email classification
│   └── storage.js         # Chrome storage utilities
└── assets/
    └── icons/
```

### Key Technologies
- **Manifest V3** (required for modern Chrome extensions)
- **Chrome Storage API** (for settings and whitelist/blacklist)
- **Chrome Tabs API** (for Gmail tab detection)
- **DOM Manipulation** (for Gmail UI interaction)
- **Fetch API** (for unsubscribe requests)
- **Content Security Policy** compliant code

### Gmail Integration Challenges
1. **Dynamic DOM**: Gmail uses heavy JavaScript, DOM changes frequently
2. **Authentication**: Need to handle Gmail's auth state
3. **Rate Limiting**: Gmail may throttle rapid actions
4. **UI Detection**: Gmail's UI elements have dynamic class names
5. **Email Access**: May need Gmail API for full email headers

### Permissions Needed
```json
{
  "permissions": [
    "storage",
    "tabs",
    "activeTab"
  ],
  "host_permissions": [
    "https://mail.google.com/*"
  ],
  "content_scripts": [{
    "matches": ["https://mail.google.com/*"],
    "js": ["content/content-script.js"],
    "run_at": "document_idle"
  }]
}
```

## Implementation Phases

### Phase 1: MVP (Minimum Viable Product)
1. Basic unsubscribe detection (List-Unsubscribe headers)
2. Simple whitelist/blacklist
3. Manual trigger (button in popup)
4. Basic safety checks

### Phase 2: Enhanced Features
1. DOM-based unsubscribe detection
2. Heuristic classification
3. Bulk operations
4. Preview mode

### Phase 3: Advanced Features
1. Scheduled automation
2. Analytics dashboard
3. Advanced filtering rules
4. ML-based classification (optional)

## Safety Considerations

1. **Never delete without user confirmation** (at least for first version)
2. **Respect Gmail's rate limits** (add delays between actions)
3. **Handle errors gracefully** (network failures, auth issues)
4. **Provide undo mechanisms**
5. **Log all actions** for debugging
6. **Test extensively** with test Gmail account first

## Legal & Ethical Considerations

1. **Respect unsubscribe requests** (some emails may require POST requests)
2. **Comply with CAN-SPAM Act** (unsubscribe should be honored)
3. **User privacy** (don't send email data to external servers)
4. **Transparency** (clear about what the extension does)

## Next Steps

1. Set up basic extension structure
2. Implement Gmail DOM detection
3. Build unsubscribe detection (start with headers)
4. Create simple UI for manual triggering
5. Add whitelist/blacklist functionality
6. Test with real Gmail account (carefully!)

