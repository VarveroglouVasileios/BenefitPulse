#!/bin/bash
# Script to remove .history/ files from git tracking
# This script removes .history/ from git index but keeps files locally

set -e

echo "🔒 Security Fix: Removing .history/ files from git tracking"
echo ""

# Check if .history/ exists
if [ ! -d ".history" ]; then
    echo "✅ No .history/ directory found"
    exit 0
fi

# Count files to be removed
HISTORY_COUNT=$(git ls-files | grep "^\.history/" | wc -l | tr -d ' ')
if [ "$HISTORY_COUNT" -eq 0 ]; then
    echo "✅ No .history/ files are tracked by git"
    exit 0
fi

echo "⚠️  Found $HISTORY_COUNT .history/ files tracked by git"
echo ""
echo "This will remove them from git tracking but keep them locally."
echo "Press Ctrl+C to cancel, or Enter to continue..."
read

# Remove from git index
echo "Removing .history/ from git index..."
git rm -r --cached .history/ 2>&1 | head -20

echo ""
echo "✅ Removed .history/ files from git tracking"
echo ""
echo "Next steps:"
echo "  1. Commit this change: git commit -m 'security: remove .history/ files from tracking'"
echo "  2. Revoke exposed credentials immediately (see SECURITY_FIX.md)"
echo "  3. If files were already pushed, clean git history (see SECURITY_FIX.md)"

