# Process Emails (Preview) - Feature Details

## Overview
The "Process Emails (Preview)" feature allows you to see what actions **would be taken** on your emails without actually performing them. This is a safe way to test the extension before committing to any changes.

## What It Does

### 1. **Email Scanning**
- Scans up to **10 emails** in your current Gmail view (inbox, folder, etc.)
- Opens each email to extract information
- Processes emails one by one with configurable delays

### 2. **Email Classification**
For each email, the extension:
- **Extracts email data:**
  - Sender email address
  - Sender name
  - Subject line
  - Date received
  - Whether it has attachments
  - Whether it's starred
  - Whether it's marked important

- **Applies classification rules:**
  - Checks against your **whitelist** (never delete)
  - Checks against your **blacklist** (mark as junk)
  - Calculates a **junk score** using heuristics:
    - Sender domain patterns (newsletter services, noreply addresses)
    - Subject line patterns (marketing keywords, promotional language)
    - Email age
    - Engagement indicators (starred, important, attachments)

### 3. **Decision Making**
For each email, determines:
- **Would unsubscribe?** - If unsubscribe links/buttons are found
- **Would delete?** - If email meets deletion criteria:
  - Is in blacklist, OR
  - Has junk score above confidence threshold (default: 0.7)
  - Is NOT in whitelist

### 4. **Preview Results**
After processing, shows you a summary:
```
Preview: X processed, Y would unsubscribe, Z would delete
```

Where:
- **X processed** = Total emails analyzed
- **Y would unsubscribe** = Emails with unsubscribe options found
- **Z would delete** = Emails that would be deleted based on classification

## What It Does NOT Do

In preview mode, the extension:
- ❌ **Does NOT unsubscribe** from any emails
- ❌ **Does NOT delete** any emails
- ❌ **Does NOT modify** your Gmail in any way
- ✅ **Only analyzes** and reports what would happen

## Current Limitations

Based on the current implementation:
- Processes maximum of **10 emails** per run
- Only analyzes emails in the **current Gmail view** (what you see on screen)
- Opens each email to extract data (you'll see emails opening/closing)
- Uses rate limiting delays between actions (default: 1000ms)

## How to Use

1. **Open Gmail** in your browser
2. **Navigate** to the folder/view you want to analyze (Inbox, Promotions, etc.)
3. **Click the extension icon** in Chrome toolbar
4. **Click "Process Emails (Preview)"**
5. **Wait for processing** (you'll see emails opening as they're analyzed)
6. **Review the results** shown in the popup status message

## Tips

- **Start with a small folder** to test
- **Check your whitelist** before processing to ensure important senders are protected
- **Review the confidence threshold** in Settings (higher = more conservative)
- **Use preview mode multiple times** to fine-tune your whitelist/blacklist
- **Check the statistics** after preview to see what would be affected

## Next Steps After Preview

After reviewing preview results:
1. **Adjust whitelist/blacklist** if needed (Settings page)
2. **Modify confidence threshold** if too many/few emails would be deleted
3. **Use "Process & Delete"** button when ready (requires confirmation)
4. **Or use individual actions** (unsubscribe from specific emails manually)

## Technical Details

### Processing Flow
1. Finds email list elements in current Gmail view
2. For each email (up to maxEmails):
   - Clicks to open email
   - Waits for email to load
   - Extracts email metadata
   - Runs classification algorithm
   - Checks for unsubscribe options
   - Determines delete decision
   - **Skips actual unsubscribe/delete actions** (previewOnly = true)
3. Aggregates results
4. Returns summary to popup

### Settings Used
- `previewMode`: Always true for this button
- `rateLimitDelay`: Delay between email processing (default: 1000ms)
- `minConfidenceForDelete`: Minimum score to delete (default: 0.7)
- Whitelist/Blacklist from storage

