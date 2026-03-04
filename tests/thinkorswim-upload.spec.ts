import { test, expect } from '@playwright/test';
import { readFileSync } from 'fs';
import { join } from 'path';

test.describe('ThinkOrSwim CSV Upload Flow', () => {
  test('should upload ThinkOrSwim CSV and extract closed trades', async ({ page }) => {
    // Navigate to landing page
    await page.goto('/');
    
    // Verify landing page
    await expect(page.locator('h1')).toContainText('Is your trading strategy real');
    await expect(page.getByRole('link', { name: /Upload ThinkOrSwim CSV/i })).toBeVisible();

    // Click upload button
    await page.getByRole('link', { name: /Upload ThinkOrSwim CSV/i }).click();
    
    // Verify upload page
    await expect(page.locator('h1')).toContainText('Upload Your ThinkOrSwim Trade History');

    // Read the test CSV file
    const csvPath = join(process.cwd(), '2026-02-10-AccountStatement.csv');
    const csvContent = readFileSync(csvPath, 'utf-8');

    // Upload file
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles({
      name: '2026-02-10-AccountStatement.csv',
      mimeType: 'text/csv',
      buffer: Buffer.from(csvContent),
    });

    // Wait for upload to complete
    await page.waitForSelector('text=/closed trades found/i', { timeout: 10000 });

    // Verify detection result
    await expect(page.locator('text=/We detected/i')).toBeVisible();
    await expect(page.locator('text=/closed trades found/i')).toBeVisible();
    
    // Verify detected columns
    const detectionText = await page.locator('text=/Symbol.*Open time.*Close time.*Side.*P&L/i').textContent();
    expect(detectionText).toBeTruthy();

    // Click continue
    await page.getByRole('button', { name: /Looks good.*Continue/i }).click();

    // Verify rule builder page
    await expect(page.locator('h1')).toContainText('Define Your Strategy Rule');
    
    // Fill in a simple rule (optional fields can be skipped)
    await page.getByLabel(/Direction/i).first().check(); // Select a direction
    
    // Submit the rule
    await page.getByRole('button', { name: /Run Check.*Generate Stats/i }).click();

    // Wait for analysis to complete
    await page.waitForSelector('text=/Strategy Analysis Results/i', { timeout: 15000 });

    // Verify results page
    await expect(page.locator('h1')).toContainText('Strategy Analysis Results');
    
    // Verify metrics are displayed
    await expect(page.locator('text=/Expected value/i')).toBeVisible();
    await expect(page.locator('text=/Win rate/i')).toBeVisible();
    await expect(page.locator('text=/Profit factor/i')).toBeVisible();
    await expect(page.locator('text=/Probability of randomness/i')).toBeVisible();
    
    // Verify verdict is displayed
    const verdict = page.locator('text=/Likely real edge|Not statistically reliable/i');
    await expect(verdict).toBeVisible();

    // Verify stability check
    await expect(page.locator('text=/Stability Check/i')).toBeVisible();
    await expect(page.locator('text=/First half/i')).toBeVisible();
    await expect(page.locator('text=/Second half/i')).toBeVisible();
  });

  test('should handle invalid CSV gracefully', async ({ page }) => {
    await page.goto('/upload');

    // Upload an invalid file
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles({
      name: 'invalid.csv',
      mimeType: 'text/csv',
      buffer: Buffer.from('invalid,csv,data\n1,2,3'),
    });

    // Wait for error message
    await page.waitForSelector('text=/error|failed|could not/i', { timeout: 5000 });
    
    // Verify error is displayed
    const errorMessage = page.locator('[class*="red"], [class*="error"]').first();
    await expect(errorMessage).toBeVisible();
  });

  test('should validate minimum trade count', async ({ page }) => {
    await page.goto('/upload');

    // Create a CSV with less than 5 trades
    const smallCsv = `Account Trade History
,Exec Time,Spread,Side,Qty,Pos Effect,Symbol,Exp,Strike,Type,Price,Net Price,Order Type
,2/1/26 10:00:00,SINGLE,BUY,+1,TO OPEN,SPX,1 FEB 26,5000,CALL,10.00,10.00,LMT
,2/1/26 10:05:00,SINGLE,SELL,-1,TO CLOSE,SPX,1 FEB 26,5000,CALL,10.50,10.50,LMT`;

    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles({
      name: 'small.csv',
      mimeType: 'text/csv',
      buffer: Buffer.from(smallCsv),
    });

    // Wait for error about insufficient trades
    await page.waitForSelector('text=/not enough trades|at least 5/i', { timeout: 5000 });
    
    const errorMessage = page.locator('[class*="red"], [class*="error"]').first();
    await expect(errorMessage).toBeVisible();
  });
});
