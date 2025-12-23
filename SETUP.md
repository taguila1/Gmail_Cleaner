# Setup Instructions

## Quick Start

1. **Create Icon Files** (Required)
   - The extension needs icon files to load properly
   - Create three PNG files in `assets/icons/`:
     - `icon16.png` (16x16 pixels)
     - `icon48.png` (48x48 pixels)
     - `icon128.png` (128x128 pixels)
   - You can use any image editor or online tool to create simple icons
   - For testing, you can use colored squares or download free icons

2. **Load Extension in Chrome**
   - Open Chrome and go to `chrome://extensions/`
   - Enable "Developer mode" (toggle in top right)
   - Click "Load unpacked"
   - Select the `GmailCleaner` folder
   - The extension should now appear in your extensions list

3. **First Use**
   - Open Gmail in a new tab
   - Click the Gmail Cleaner extension icon in the toolbar
   - The popup should open showing statistics and controls

## Icon Creation Options

### Option 1: Online Tools
- Use [Favicon Generator](https://www.favicon-generator.org/)
- Use [Icon Generator](https://icon-generator.net/)
- Upload a simple image and generate all sizes

### Option 2: Simple Placeholder
Create three simple colored squares:
- Use any image editor
- Create 16x16, 48x48, and 128x128 pixel images
- Use a color like #1a73e8 (Gmail blue) or #ea4335 (red)
- Save as PNG files

### Option 3: Use Existing Icons
- Download free icons from [Flaticon](https://www.flaticon.com/) or [Icons8](https://icons8.com/)
- Resize to required dimensions
- Save in the `assets/icons/` directory

## Testing

1. **Test Unsubscribe**
   - Open an email with an unsubscribe link
   - Click the extension icon
   - Click "Unsubscribe from Current Email"
   - Check if unsubscribe action is triggered

2. **Test Whitelist/Blacklist**
   - Open an email
   - Click "Add to Whitelist" or "Add to Blacklist"
   - Go to Settings to verify it was added

3. **Test Preview Mode**
   - Click "Process Emails (Preview)"
   - Check the results without actually deleting

## Troubleshooting

### Extension won't load
- Check that all icon files exist in `assets/icons/`
- Check browser console for errors (F12)
- Verify `manifest.json` is valid JSON

### Content script not working
- Make sure you're on `mail.google.com`
- Check browser console for errors
- Try refreshing the Gmail page

### Unsubscribe not working
- Gmail's DOM structure may have changed
- Check browser console for selector errors
- Some unsubscribe links may require manual clicking

## Next Steps

1. Test with a few emails first
2. Set up your whitelist with important senders
3. Start with preview mode enabled
4. Gradually increase confidence threshold if needed
5. Monitor statistics to see what's being processed

