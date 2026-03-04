# Quick Fix for Build Cache Errors

If you see `Cannot find module './276.js'` or similar errors:

## Windows PowerShell (Quick Fix)
```powershell
# Stop dev server (Ctrl+C first)
Get-Process | Where-Object {$_.ProcessName -like "*node*"} | Stop-Process -Force

# Delete corrupted cache
Remove-Item -Recurse -Force .next

# Restart
npm run dev
```

## Permanent Solution

**Exclude `.next` from OneDrive sync:**
1. Right-click `.next` folder → "Always keep on this device"
2. Or move project outside OneDrive (e.g., `C:\dev\`)

The `.next` folder is build cache and should never be synced to OneDrive.
