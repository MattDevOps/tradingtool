# Testing Instructions

## Manual Browser Testing

1. **Start the dev server:**
   ```bash
   npm run dev
   ```

2. **Open browser:** http://localhost:3000

3. **Test the upload flow:**
   - Click "Upload ThinkOrSwim CSV → Check Strategy"
   - Upload the file: `2026-02-10-AccountStatement.csv`
   - Verify it detects 157 closed trades
   - Click "Looks good → Continue"
   - Fill in rule builder (or skip optional fields)
   - Click "Run Check → Generate Stats"
   - Verify results page shows metrics and verdict

## Expected Results

- **Upload:** Should detect "Account Trade History" section
- **Trades:** Should extract 157 closed trades
- **Analysis:** Should show statistical metrics and verdict

## Troubleshooting

If upload fails with 400 error:
1. Check browser console for errors
2. Check server logs for detection/parsing issues
3. Verify CSV file has "Account Trade History" section
4. Make sure file is not corrupted

## Playwright E2E Tests

Run automated tests:
```bash
npm run test:e2e
```

Note: Make sure dev server is NOT running when using Playwright (it starts its own server).
