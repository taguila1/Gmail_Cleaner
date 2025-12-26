#!/bin/bash
# Script to create a Chrome Web Store ready ZIP package

echo "📦 Creating Chrome Web Store package..."

# Create temporary directory
TEMP_DIR="gmail-cleaner-publish"
ZIP_NAME="gmail-cleaner.zip"

# Remove old publish directory and ZIP if they exist
rm -rf "$TEMP_DIR"
rm -f "$ZIP_NAME"

# Create publish directory
mkdir -p "$TEMP_DIR"

# Copy necessary files
echo "📋 Copying files..."
cp -r background "$TEMP_DIR/"
cp -r content "$TEMP_DIR/"
cp -r popup "$TEMP_DIR/"
cp -r options "$TEMP_DIR/"
cp -r utils "$TEMP_DIR/"
cp -r assets "$TEMP_DIR/"
cp -r onboarding "$TEMP_DIR/"
cp -r privacy "$TEMP_DIR/"
cp manifest.json "$TEMP_DIR/"
cp README.md "$TEMP_DIR/"
cp LICENSE "$TEMP_DIR/"

# Create ZIP
echo "🗜️  Creating ZIP file..."
cd "$TEMP_DIR"
zip -r "../$ZIP_NAME" . -x "*.DS_Store" "*.log"
cd ..

# Clean up
rm -rf "$TEMP_DIR"

echo "✅ Package created: $ZIP_NAME"
echo "📊 Package size: $(du -h $ZIP_NAME | cut -f1)"
echo ""
echo "📝 Next steps:"
echo "1. Go to https://chrome.google.com/webstore/devconsole"
echo "2. Click 'New Item'"
echo "3. Upload $ZIP_NAME"
echo "4. Complete the store listing"
echo "5. Submit for review"

