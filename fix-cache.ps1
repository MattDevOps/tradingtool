# Quick fix script for OneDrive build cache corruption
# Run this whenever you see "Cannot find module './XXX.js'" errors

Write-Host "Stopping Node processes..." -ForegroundColor Yellow
Get-Process | Where-Object {$_.ProcessName -like "*node*"} | Stop-Process -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 1

Write-Host "Deleting corrupted .next folder..." -ForegroundColor Yellow
if (Test-Path .next) {
    Remove-Item -Path .next -Recurse -Force -ErrorAction SilentlyContinue
    Write-Host "✓ .next folder deleted" -ForegroundColor Green
} else {
    Write-Host "✓ .next folder doesn't exist" -ForegroundColor Green
}

Write-Host "`nStarting dev server..." -ForegroundColor Yellow
npm run dev
