# GitHub Setup Instructions

Your local repository is initialized and connected to GitHub, but you need to authenticate to push.

## Current Status
✅ Git repository initialized
✅ All files committed (23 files, 4598+ lines)
✅ Remote origin set to: https://github.com/taguila1/Gmail_Cleaner.git
❌ Authentication needed to push

## Authentication Options

### Option 1: Personal Access Token (Recommended)

1. **Create a Personal Access Token:**
   - Go to: https://github.com/settings/tokens
   - Click "Generate new token" → "Generate new token (classic)"
   - Name it: "Gmail Cleaner Extension"
   - Select scopes: `repo` (full control of private repositories)
   - Click "Generate token"
   - **Copy the token immediately** (you won't see it again!)

2. **Push using the token:**
   ```bash
   git push -u origin main
   ```
   - When prompted for username: enter `taguila1`
   - When prompted for password: paste your **Personal Access Token** (not your GitHub password)

### Option 2: GitHub CLI

If you have GitHub CLI installed:
```bash
gh auth login
git push -u origin main
```

### Option 3: SSH Keys (More Secure, One-Time Setup)

1. **Generate SSH key:**
   ```bash
   ssh-keygen -t ed25519 -C "your_email@example.com"
   # Press Enter to accept default location
   # Optionally set a passphrase
   ```

2. **Add SSH key to GitHub:**
   ```bash
   cat ~/.ssh/id_ed25519.pub
   # Copy the output
   ```
   - Go to: https://github.com/settings/keys
   - Click "New SSH key"
   - Paste the key and save

3. **Update remote to use SSH:**
   ```bash
   git remote set-url origin git@github.com:taguila1/Gmail_Cleaner.git
   git push -u origin main
   ```

## Quick Push Command

Once authenticated, run:
```bash
git push -u origin main
```

## Verify Connection

After pushing, verify at: https://github.com/taguila1/Gmail_Cleaner

## Future Pushes

After the first push, you can simply use:
```bash
git add .
git commit -m "Your commit message"
git push
```

## Troubleshooting

**If you get "Permission denied":**
- Make sure you're logged into the correct GitHub account
- Verify the repository exists and you have write access
- Try using a Personal Access Token instead of password

**If you get "branch not found":**
- The repository might be using `master` instead of `main`
- Run: `git push -u origin main:main` or `git push -u origin main:master`

