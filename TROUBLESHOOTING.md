# Troubleshooting Guide

## OneDrive Build Cache Issues

If you're seeing errors like:
```
Error: EINVAL: invalid argument, readlink 'C:\Users\...\.next\package.json'
```

This is caused by OneDrive interfering with Next.js build cache. Here's how to fix it:

### Quick Fix
1. Stop the dev server (Ctrl+C)
2. Delete the `.next` folder:
   ```powershell
   Remove-Item -Recurse -Force .next
   ```
3. Restart the dev server:
   ```powershell
   npm run dev
   ```

### Permanent Solution

**Option 1: Exclude `.next` from OneDrive Sync**
1. Right-click the `.next` folder
2. Select "Always keep on this device" (or exclude from sync)
3. Or add `.next` to OneDrive's exclusion list in OneDrive settings

**Option 2: Move Project Outside OneDrive**
- Move your project to a location outside OneDrive (e.g., `C:\dev\tradingtool`)
- This prevents OneDrive from syncing build artifacts

**Option 3: Use `.onedriveignore` (if available)**
Create a `.onedriveignore` file in your project root:
```
.next/
.next/**
```

### Why This Happens
OneDrive tries to sync the `.next` folder, which contains:
- Symlinks (which OneDrive doesn't handle well)
- Temporary build files
- Cache files that change frequently

This causes corruption and build failures.

### Prevention
The `.next` folder is already in `.gitignore`, so it won't be committed. The issue is OneDrive trying to sync it locally.
