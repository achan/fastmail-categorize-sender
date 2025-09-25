#!/bin/bash

# Helper script for maintaining the Categorize Sender shortcut

echo "📱 Shortcut Maintenance Helper"
echo "=============================="
echo ""

echo "To update the shortcut template:"
echo "1. Open Shortcuts app"
echo "2. Make your changes to the 'Categorize Sender' shortcut"
echo "3. Export the shortcut (share → Export Shortcut)"
echo "4. Save as 'Categorize Sender Template.shortcut' in this directory"
echo "5. Commit the changes to git"
echo ""

echo "Current shortcut files:"
ls -la *.shortcut 2>/dev/null || echo "No .shortcut files found"
echo ""

echo "💡 Alternative: Document changes in README.md for manual recreation"