# Gmail Cleaner Chrome Extension

A Chrome extension to help you automatically unsubscribe from emails and intelligently clean up your Gmail inbox.

## Features

### 1. Auto-Unsubscribe
- Automatically detects unsubscribe links and buttons in emails
- Supports Gmail's native unsubscribe button
- Finds unsubscribe links in email content using pattern matching
- Handles both GET and POST unsubscribe requests

### 2. Smart Email Classification
- Whitelist system: Never delete emails from whitelisted senders
- Blacklist system: Mark senders as junk for deletion
- Heuristic scoring: Analyzes email characteristics to determine if it's junk
- Confidence threshold: Only deletes emails above a certain confidence score
- Preview mode: See what would be deleted before actually deleting

### 3. Bulk Email Processing
- Process up to 50 emails at once
- Preview mode: See what actions would be taken before executing
- Real-time progress tracking with detailed results table
- Pause/Resume/Stop controls during processing
- Results persist even if popup is closed during processing
- Sticky table headers for easy navigation

### 4. Advanced Filtering & Rules
- Custom filtering rules engine with conditions and actions
- Rule priority system
- Multiple condition types (contains, equals, starts with, etc.)
- Actions: unsubscribe, delete, archive, mark as read, star
- Advanced user mode for power users

### 5. Activity Logging & Analytics
- Auto-unsubscribed emails log
- Auto-deleted emails log
- Failed unsubscribe attempts log
- Top senders analytics dashboard
- Export functionality for logs
- Quick actions: Double-click logs to add to whitelist/blacklist

### 6. Smart Tab Management
- Automatic tab grouping for unsubscribe actions
- Groups new tabs into "Further Unsubscribe Action Required" group
- Quiet background tab opening (no focus interruption)
- Configurable via settings

### 7. User Experience Features
- Modern neumorphic design with Heroicons
- Keyboard shortcuts (Ctrl+Shift+U, Ctrl+Shift+P, Ctrl+Shift+,)
- Onboarding flow for first-time users
- Inline editing for whitelist/blacklist items
- Double-click preview items to quickly whitelist/blacklist
- Sticky status messages
- Persistent processing controls across popup closes
- Real-time results updates via storage listeners

### 8. Additional Features
- Statistics tracking (unsubscribed, deleted, processed)
- Rate limiting to avoid triggering Gmail's spam detection
- Settings page for comprehensive configuration
- Safety features (preview mode, confirmation dialogs)
- Scheduled automation (daily/weekly cleanup)
- Export/Import settings functionality
- Privacy policy page

## Installation

1. Clone or download this repository
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode" (toggle in top right)
4. Click "Load unpacked"
5. Select the `GmailCleaner` directory
6. The extension should now be installed

## Usage

### Basic Usage

1. Open Gmail in your browser
2. Click the Gmail Cleaner extension icon in the toolbar
3. Use the popup to:
   - Unsubscribe from the currently viewed email
   - Process emails in preview mode
   - Add senders to whitelist/blacklist

### Settings

1. Click the extension icon → "Settings" (or right-click extension → Options)
2. Configure:
   - Preview mode (recommended to keep enabled)
   - Auto unsubscribe/delete settings
   - Rate limit delay
   - Minimum confidence threshold for deletion
   - Whitelist/blacklist management

### Whitelist/Blacklist

- **Whitelist**: Emails from these senders will NEVER be deleted or unsubscribed from
- **Blacklist**: Emails from these senders will be considered for deletion

You can add:
- Full email addresses (e.g., `user@example.com`)
- Domains (e.g., `example.com` or `@example.com`)
- Wildcard patterns (e.g., `*@example.com`)

**Features:**
- Inline editing: Double-click any list item to edit it
- Domain extraction: Automatically extracts domains from email addresses
- Quick add: Double-click preview results or activity logs to add to lists

## Safety Features

- **Preview Mode**: By default, the extension shows what would be deleted without actually deleting
- **Confirmation Dialogs**: Bulk delete operations require confirmation
- **Whitelist Protection**: Whitelisted emails are never deleted
- **Confidence Threshold**: Only deletes emails above a certain confidence score (default: 0.7)

## Technical Details

### Architecture
- **Manifest V3**: Uses the latest Chrome extension API
- **Content Script**: Injected into Gmail pages for DOM interaction
- **Background Service Worker**: Handles coordination and storage
- **Popup UI**: User interface for manual controls
- **Options Page**: Settings and configuration management

### Permissions
- `storage`: For saving settings and whitelist/blacklist
- `tabs`: For detecting Gmail tabs
- `activeTab`: For interacting with Gmail pages
- `https://mail.google.com/*`: Host permission for Gmail

## Development

### Project Structure
```
GmailCleaner/
├── manifest.json          # Extension manifest
├── background/
│   └── service-worker.js  # Background service worker
├── content/
│   └── content-script.js # Gmail DOM interaction
├── popup/
│   ├── popup.html         # Popup UI
│   ├── popup.js
│   └── popup.css
├── options/
│   ├── options.html       # Settings page
│   ├── options.js
│   └── options.css
├── onboarding/
│   ├── onboarding.html    # First-run onboarding
│   ├── onboarding.js
│   └── onboarding.css
├── privacy/
│   ├── privacy.html       # Privacy policy page
│   ├── privacy.js
│   └── privacy.css
├── utils/
│   └── classifier.js      # Email classification logic
└── assets/
    └── icons/             # Extension icons
```

### Notes
- Gmail's DOM structure is dynamic and may change
- Some selectors may need adjustment as Gmail updates
- The extension respects Gmail's rate limits with configurable delays

## Limitations

- Gmail's UI changes frequently, so some selectors may break
- Email classification is heuristic-based, not perfect
- Requires manual testing with your Gmail account
- Some unsubscribe links may require manual interaction

## Recent Updates

### Version 1.0.0 Features
- ✅ Complete neumorphic UI redesign with Heroicons
- ✅ Advanced filtering rules engine
- ✅ Activity logging and analytics dashboard
- ✅ Tab grouping for unsubscribe actions
- ✅ Persistent processing results (survives popup closes)
- ✅ Real-time results updates
- ✅ Inline editing for whitelist/blacklist
- ✅ Double-click quick actions
- ✅ Keyboard shortcuts
- ✅ Onboarding flow
- ✅ Export/Import settings
- ✅ Scheduled automation

## Future Enhancements

- Machine learning-based email classification
- Multi-account support
- Integration with Gmail API for better email access
- Email content analysis (NLP)
- Undo functionality with backup system

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

The MIT License is a permissive open-source license that allows:
- ✅ Commercial use
- ✅ Modification
- ✅ Distribution
- ✅ Private use
- ✅ Patent use

The only requirement is that the license and copyright notice are included in copies of the software.

## Disclaimer

Use at your own risk. Always test with preview mode first and maintain backups of important emails. The extension is not affiliated with Google or Gmail.

