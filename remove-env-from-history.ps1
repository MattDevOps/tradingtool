# Script to remove .env files from Git history
# WARNING: This rewrites Git history. Make sure you have a backup!

Write-Host "Checking for .env files in Git history..." -ForegroundColor Yellow

# Check if any .env files exist in history
$envFiles = git log --all --full-history --name-only --pretty=format: | Select-String -Pattern "\.env" | Select-Object -Unique

if ($envFiles.Count -eq 0) {
    Write-Host "✓ No .env files found in Git history. You're safe!" -ForegroundColor Green
    exit 0
}

Write-Host "⚠ Found .env files in history. Removing them..." -ForegroundColor Red
Write-Host "Files found:" -ForegroundColor Yellow
$envFiles | ForEach-Object { Write-Host "  - $_" }

Write-Host "`nThis will rewrite Git history. Make sure you:" -ForegroundColor Yellow
Write-Host "  1. Have a backup of your repository" -ForegroundColor Yellow
Write-Host "  2. Have pushed all important work" -ForegroundColor Yellow
Write-Host "  3. Are ready to force push after this" -ForegroundColor Yellow

$confirm = Read-Host "`nContinue? (yes/no)"
if ($confirm -ne "yes") {
    Write-Host "Aborted." -ForegroundColor Red
    exit 1
}

# Method 1: Using git filter-branch (more widely available)
Write-Host "`nRemoving .env files from Git history using git filter-branch..." -ForegroundColor Cyan

# Remove .env files from all branches and tags
git filter-branch --force --index-filter `
    "git rm --cached --ignore-unmatch .env .env.local .env*.local .env.development .env.production .env.test" `
    --prune-empty --tag-name-filter cat -- --all

# Clean up refs
git for-each-ref --format="%(refname)" refs/original/ | ForEach-Object { git update-ref -d $_ }

# Force garbage collection
git reflog expire --expire=now --all
git gc --prune=now --aggressive

Write-Host "`n✓ Done! .env files have been removed from Git history." -ForegroundColor Green
Write-Host "`nNext steps:" -ForegroundColor Yellow
Write-Host "  1. Verify: git log --all --full-history -- .env*" -ForegroundColor White
Write-Host "  2. Force push: git push origin --force --all" -ForegroundColor White
Write-Host "  3. Force push tags: git push origin --force --tags" -ForegroundColor White
Write-Host "`n⚠ WARNING: Force pushing rewrites remote history. Coordinate with your team!" -ForegroundColor Red
