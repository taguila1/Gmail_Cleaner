# Gmail Cleaner Chrome Extension - Brainstorming & Architecture

## 📊 Project Status

**Phase 1 (MVP):** ✅ **COMPLETED**  
**Phase 2 (Enhanced Features):** ✅ **COMPLETED**  
**Phase 3 (Advanced Features):** ⏳ **PENDING**

### Key Achievements
- ✅ Hybrid unsubscribe detection (DOM + Gmail native button)
- ✅ Smart email classification with heuristic scoring
- ✅ Bulk email processing with preview mode
- ✅ Whitelist/blacklist with domain matching support
- ✅ Activity logging and statistics dashboard
- ✅ Enhanced preview mode with detailed results table
- ✅ Delete unread functionality

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

**Implementation Strategy**: ✅ **IMPLEMENTED**
1. ✅ Content Script to inject into Gmail pages - *Implemented in `content/content-script.js`*
2. ✅ Background Service Worker for coordination - *Implemented in `background/service-worker.js`*
3. ✅ Parse email headers via Gmail API or DOM inspection - *Implemented with DOM-based detection*
4. ✅ Pattern matching for unsubscribe links (regex + heuristics) - *Enhanced with 15+ patterns*
5. ✅ Queue system for batch processing - *Implemented with iterative processing*
6. ✅ Rate limiting to avoid triggering spam detection - *Configurable delay (default: 1000ms)*

### 2. Smart Email Classification
**Challenge**: Distinguishing junk from legitimate emails without false positives

**Approach Options**:
- **Option A**: Heuristic-based filtering (sender domain, subject patterns, etc.)
- **Option B**: Machine learning classification (requires training data)
- **Option C**: User-defined rules (whitelist/blacklist)
- **Option D**: Integration with existing spam filters

**Recommended**: Option C + Option A (User rules + heuristics)

**Implementation Strategy**: ✅ **IMPLEMENTED**
1. ✅ Whitelist system (never delete from these senders/domains) - *Supports exact emails, domains (`@domain.com`), and wildcards (`*@domain.com`)*
2. ✅ Blacklist system (always safe to delete) - *Same domain matching support as whitelist*
3. ✅ Heuristic scoring - *Implemented `calculateJunkScore()` with:*
   - ✅ Sender reputation (known domains) - *Marketing domains, noreply patterns*
   - ✅ Email age - *Older emails (>30 days) get higher junk score*
   - ✅ Engagement history (opened, replied, starred) - *Starred, important, attachments reduce score*
   - ✅ Subject line patterns - *Junk patterns and marketing keywords*
   - ✅ Attachment presence - *Attachments reduce junk score*
4. ✅ Confidence threshold before deletion - *Configurable (default: 0.7)*
5. ✅ Preview mode before actual deletion - *Full preview with detailed results table*

### 3. Additional Feature Ideas

#### A. Bulk Operations
- ✅ Batch unsubscribe from multiple emails - *Implemented*
- ✅ Bulk delete with preview - *Implemented*
- ⏳ Archive instead of delete (safer option) - *Not yet implemented*
- ⏳ Mark as read/unread - *Not yet implemented*

#### B. Email Analytics
- ✅ Statistics dashboard (emails processed, unsubscribed, deleted) - *Implemented in options page*
- ⏳ Sender frequency analysis - *Not yet implemented*
- ⏳ Email volume trends - *Not yet implemented*
- ⏳ Time saved estimate - *Not yet implemented*

#### C. Smart Filters
- Auto-categorize by sender domain
- Group similar emails (newsletters, receipts, etc.)
- Identify subscription emails vs. transactional
- Find duplicate emails

#### D. Safety Features
- ⏳ Undo functionality (Gmail's native undo + extension backup) - *Not yet implemented*
- ✅ Dry-run mode (preview without changes) - *Implemented as Preview Mode*
- ✅ Confirmation dialogs for bulk operations - *Implemented*
- ✅ Activity log/audit trail - *Implemented with three log types: Auto-Unsubscribed, Auto-Deleted, Failed Unsubscribe Attempts*
- ⏳ Backup before deletion (optional) - *Not yet implemented*

#### E. Automation
- Scheduled cleanup (daily/weekly)
- Auto-unsubscribe on new emails
- Auto-delete based on age + classification
- Smart archiving rules

#### F. User Experience
- ✅ Progress indicators for bulk operations - *Implemented with status messages and results table*
- ⏳ Pause/resume functionality - *Not yet implemented*
- ⏳ Customizable keyboard shortcuts - *Not yet implemented*
- ✅ Quick actions toolbar - *Implemented in popup (Unsubscribe, Process Emails, Delete Unread)*
- ⏳ Notification system - *Not yet implemented*

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

### Phase 1: MVP (Minimum Viable Product) ✅ **COMPLETED**
1. ✅ Basic unsubscribe detection (List-Unsubscribe headers) - *Implemented with hybrid approach*
2. ✅ Simple whitelist/blacklist - *Implemented with domain matching support (`@domain.com`, `domain.com`, `*@domain.com`)*
3. ✅ Manual trigger (button in popup) - *Implemented with "Unsubscribe From Current Email" and "Process Emails" buttons*
4. ✅ Basic safety checks - *Implemented: preview mode, confirmation dialogs, rate limiting, whitelist protection*

### Phase 2: Enhanced Features ✅ **COMPLETED**
1. ✅ DOM-based unsubscribe detection - *Enhanced implementation with:*
   - Multiple pattern matching (unsubscribe, opt-out, manage preferences, etc.)
   - Gmail native unsubscribe button detection
   - Mailto unsubscribe link detection
   - URL pattern matching
   - Confidence scoring (high/medium/low)
2. ✅ Heuristic classification - *Implemented `calculateJunkScore()` with:*
   - Sender domain analysis (marketing domains, noreply patterns)
   - Subject line pattern matching
   - Email age consideration
   - Engagement indicators (starred, important, attachments, labels)
   - Confidence threshold system
3. ✅ Bulk operations - *Implemented `handleProcessEmails()` with:*
   - Batch processing of up to 50 emails
   - Iterative email opening and processing
   - Auto-unsubscribe and auto-delete options
   - Rate limiting between actions
   - Detailed per-email results tracking
4. ✅ Preview mode - *Fully implemented with:*
   - Preview-only mode (no actual changes)
   - Detailed results table showing per-email outcomes
   - Status indicators (will unsubscribe, won't unsubscribe, will delete, won't delete, protected, etc.)
   - Whitelist/blacklist quick actions from preview table
   - Comprehensive email data extraction

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

### Completed ✅
1. ✅ Set up basic extension structure
2. ✅ Implement Gmail DOM detection
3. ✅ Build unsubscribe detection (hybrid: headers + DOM scanning)
4. ✅ Create simple UI for manual triggering
5. ✅ Add whitelist/blacklist functionality (with domain matching)
6. ✅ Test with real Gmail account

### Phase 3: Advanced Features (Next)
1. ⏳ Scheduled automation (daily/weekly cleanup)
2. ⏳ Enhanced analytics dashboard (sender frequency, trends, time saved)
3. ⏳ Advanced filtering rules (custom rules engine)
4. ⏳ Archive instead of delete option
5. ⏳ Mark as read/unread functionality
6. ⏳ Pause/resume for bulk operations
7. ⏳ Export/import settings
8. ⏳ ML-based classification (optional, future enhancement)

