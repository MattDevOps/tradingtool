#!/bin/bash
# Script to remove .env files from Git history
# WARNING: This rewrites Git history. Make sure you have a backup!

echo "Checking for .env files in Git history..."

# Check if any .env files exist in history
ENV_FILES=$(git log --all --full-history --name-only --pretty=format: | grep -E "\.env" | sort -u)

if [ -z "$ENV_FILES" ]; then
    echo "✓ No .env files found in Git history. You're safe!"
    exit 0
fi

echo "⚠ Found .env files in history. Removing them..."
echo "Files found:"
echo "$ENV_FILES" | sed 's/^/  - /'

echo ""
echo "This will rewrite Git history. Make sure you:"
echo "  1. Have a backup of your repository"
echo "  2. Have pushed all important work"
echo "  3. Are ready to force push after this"

read -p "Continue? (yes/no): " confirm
if [ "$confirm" != "yes" ]; then
    echo "Aborted."
    exit 1
fi

# Method 1: Using git filter-branch (more widely available)
echo ""
echo "Removing .env files from Git history using git filter-branch..."

git filter-branch --force --index-filter \
    'git rm --cached --ignore-unmatch .env .env.local .env*.local .env.development .env.production .env.test' \
    --prune-empty --tag-name-filter cat -- --all

# Clean up refs
git for-each-ref --format="%(refname)" refs/original/ | xargs -n 1 git update-ref -d

# Force garbage collection
git reflog expire --expire=now --all
git gc --prune=now --aggressive

echo ""
echo "✓ Done! .env files have been removed from Git history."
echo ""
echo "Next steps:"
echo "  1. Verify: git log --all --full-history -- .env*"
echo "  2. Force push: git push origin --force --all"
echo "  3. Force push tags: git push origin --force --tags"
echo ""
echo "⚠ WARNING: Force pushing rewrites remote history. Coordinate with your team!"
