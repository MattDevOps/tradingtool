# Permanent Fix for OneDrive Build Cache Errors

## The Problem
OneDrive is syncing the `.next` build folder, which contains symlinks and temporary files that OneDrive cannot handle. This causes corruption and `Cannot find module './XXX.js'` errors.

## Solution 1: Exclude `.next` from OneDrive Sync (RECOMMENDED)

### Step-by-Step Instructions

1. **Create the `.next` folder** (if it doesn't exist):
   ```powershell
   npm run dev
   ```
   Wait for it to create the folder, then stop it (Ctrl+C).

2. **Exclude from OneDrive:**
   - Right-click the `.next` folder in File Explorer
   - Select **"Always keep on this device"** (or "Free up space" → then "Always keep")
   - This tells OneDrive to stop syncing this folder

3. **Alternative: Use OneDrive Settings**
   - Open OneDrive settings (click OneDrive icon in system tray → Settings)
   - Go to **Sync and backup** → **Advanced settings**
   - Click **"Choose folders"** or look for exclusion options
   - Add `.next` to excluded folders (if this option exists)

## Solution 2: Move Project Outside OneDrive (BEST)

This is the most reliable solution:

1. **Move your project:**
   ```powershell
   # Create a dev folder outside OneDrive
   mkdir C:\dev
   
   # Move your project (adjust paths as needed)
   Move-Item "C:\Users\matts\OneDrive\Documents\git\tradingtool" "C:\dev\tradingtool"
   ```

2. **Update your Git remote** (if needed):
   ```powershell
   cd C:\dev\tradingtool
   # Git will still work, just update any absolute paths
   ```

3. **Benefits:**
   - No more OneDrive interference
   - Faster builds (local SSD)
   - No sync delays

## Solution 3: Create .onedriveignore (If Available)

Some OneDrive versions support `.onedriveignore`:

1. Create `.onedriveignore` in your project root:
   ```
   .next/
   .next/**
   node_modules/
   ```

2. This tells OneDrive to ignore these folders (similar to `.gitignore`)

## Quick Fix Script (Temporary)

If you need a quick fix right now, use the script I created:

```powershell
.\fix-cache.ps1
```

Or manually:
```powershell
Get-Process | Where-Object {$_.ProcessName -like "*node*"} | Stop-Process -Force
Remove-Item -Recurse -Force .next
npm run dev
```

## Recommended Action

**I strongly recommend Solution 2 (move project outside OneDrive).**

Why:
- OneDrive is designed for documents, not development projects
- Build artifacts should never be synced
- Prevents all future issues
- Better performance

## After Fixing

Once you've excluded `.next` or moved the project:
- The errors will stop
- You won't need to delete `.next` anymore
- Builds will be faster and more reliable
