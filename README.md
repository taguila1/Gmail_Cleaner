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

### 3. Additional Features
- Statistics tracking (unsubscribed, deleted, processed)
- Bulk email processing
- Rate limiting to avoid triggering Gmail's spam detection
- Settings page for configuration
- Safety features (preview mode, confirmation dialogs)

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

- **Whitelist**: Emails from these senders will NEVER be deleted
- **Blacklist**: Emails from these senders will be considered for deletion

You can add emails or domains (e.g., `example.com` will match all emails from that domain).

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
│   └── content-script.js  # Gmail DOM interaction
├── popup/
│   ├── popup.html         # Popup UI
│   ├── popup.js
│   └── popup.css
├── options/
│   ├── options.html       # Settings page
│   ├── options.js
│   └── options.css
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

## Future Enhancements

- Machine learning-based email classification
- Scheduled automatic cleanup
- Email analytics dashboard
- Multi-account support
- Integration with Gmail API for better email access

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

