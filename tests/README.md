# E2E Tests with Playwright

## Running Tests

### Run all tests
```bash
npm run test:e2e
```

### Run tests with UI
```bash
npm run test:e2e:ui
```

### Run tests in headed mode (see browser)
```bash
npm run test:e2e:headed
```

### Run specific test file
```bash
npx playwright test thinkorswim-upload
```

## Test Files

- `thinkorswim-upload.spec.ts` - Tests the full ThinkOrSwim CSV upload and analysis flow

## Test Data

Tests use the real ThinkOrSwim CSV file: `2026-02-10-AccountStatement.csv`

## Configuration

Tests are configured in `playwright.config.ts`:
- Base URL: `http://localhost:3000` (or set `PLAYWRIGHT_TEST_BASE_URL` env var)
- Automatically starts dev server before tests
- Uses Chromium browser by default

## CI/CD

For CI environments, set:
- `CI=true` - Enables retries and single worker
- `PLAYWRIGHT_TEST_BASE_URL` - Your deployed URL (e.g., Vercel preview URL)
