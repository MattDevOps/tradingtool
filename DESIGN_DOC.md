# Design Doc: Strategy Reality Check MVP

**Owner:** Matt H  
**Date:** 2026-03-02  
**Version:** 5.0

---

## 1. Product Vision

### Problem
Traders cannot easily determine if their trading strategy is statistically valid. Existing tools are either too complex (full journaling platforms) or focus on dashboards rather than providing a clear statistical answer.

### Solution
Single-purpose tool that answers one question:

**"Is this trading strategy real — or just luck?"**

### Core Promise
- Upload closed trades from ThinkOrSwim (CSV export)
- Filter by a single strategy rule
- Run statistical tests (Monte-Carlo, permutation tests)
- Get a clear verdict instantly

### Target Audience
**ThinkOrSwim traders:** self-funded, futures/options traders using ThinkOrSwim platform.

### Pricing
**Free MVP** — designed as a lead magnet and funnel to InsightTrader app.

### Growth Strategy
- SEO/content marketing for "strategy validation" keywords
- Social/forum outreach (Reddit r/Daytrading, Discord, Twitter)
- Email capture → nurture → upsell to InsightTrader
- No account creation required for MVP (optional email to unlock full verdict)

---

## 2. Core MVP Features

### 2.1 CSV Upload & Auto-Inference
- Users upload ThinkOrSwim closed-trade CSV export
- **Auto-detect columns** using header normalization + value inference:
  - `open_time` → datetime parsing
  - `close_time` → datetime parsing
  - `symbol` → short token, repeated frequently
  - `side` → {LONG, SHORT, BUY, SELL, B, S}
  - `pnl` → numeric, both positive & negative values
- **One-line confirmation banner:**
  ```
  We detected: Symbol · Open time · Close time · Side · P&L
  1,284 closed trades found
  [Looks good → Continue]   [Something's wrong → Fix]
  ```
- **Fallback:** Only if detection fails → single-field correction UI (one dropdown per missing column, show 5-10 rows preview)

### 2.2 Rule Builder (Single Strategy Filter)
Minimal interface to define one strategy rule:
- **Instrument** (optional dropdown/text input)
- **Time window** (optional: start time - end time)
- **Direction** (Long / Short / Both)
- **Max holding time** (optional: minutes/hours)
- **Button:** "Check if strategy is real"

No tagging, no complex rules, no journaling features.

### 2.3 Statistical Analysis Engine
**Input:** Filtered trades from uploaded CSV

**Compute:**
- Win rate = # wins / total trades
- Expected value (R) = average R per trade
- Profit factor = sum(profits) / sum(losses)
- **Monte-Carlo / permutation test:**
  - Shuffle trade sequence N times (e.g., 10,000)
  - Compute cumulative distribution
  - Probability edge is random = fraction of simulations ≥ observed EV
- **Stability check:**
  - Split dataset into first half vs second half
  - Compare metrics (detect degradation)

**Output:**
- Probability the edge is random (percentage)
- Verdict:
  - `probability_random < 20%` → 🟢 **Likely real edge**
  - `probability_random ≥ 20%` → 🔴 **Not statistically reliable**

### 2.4 Result Page / Verdict Box
Clean display showing:
```
Expected value: +0.18R
Win rate: 56%
Profit factor: 1.32
Probability of randomness: 41%
Verdict: ❌ Not statistically reliable
```

**Optional email capture:**
- "Enter your email to unlock full report / PDF download"
- Stores email in Neon DB for InsightTrader funnel
- Optional upsell CTA: "Check multi-strategy report → InsightTrader"

### 2.5 Email Funnel / Lead Capture
- Email stored in Neon DB `users` table
- Optional signup for InsightTrader app or future premium features
- No account creation required for MVP (email is optional to unlock full verdict)

---

## 3. Tech Stack

- **Frontend:** React + Tailwind CSS
- **Backend:** Python (FastAPI) or Node.js
- **Database:** Neon Postgres (serverless, Vercel-compatible)
- **CSV Processing:** pandas (Python) or Papaparse (JS)
- **Statistical Engine:** numpy / scipy / pandas
- **Storage:** Neon table for raw CSV data (optional: Vercel-compatible cloud storage)
- **Deployment:** Vercel (frontend + API routes)

---

## 4. Importer Pipeline (AI-Friendly Instructions)

### Goal
Fully automated column detection with minimal user input. Fallback only if detection fails.

### Step 1: Read CSV
- Support comma/tab-separated files
- UTF-8 encoding
- Handle various line endings

### Step 2: Header Normalization
- Lowercase, strip spaces/punctuation
- Map common aliases:
  - `pnl, netpl, profit, gain/loss, net p&l` → `pnl`
  - `open, entry_time, entry` → `open_time`
  - `close, exit_time, exit` → `close_time`
  - `long/short, side, direction` → `side`
  - `symbol, instrument, ticker` → `symbol`

### Step 3: Column Value Inference
For each column, compute heuristics:

**Datetime detection:**
- % of rows parseable as timestamp
- Score: `datetime_score = parseable_ratio`

**Side detection:**
- % of rows in {LONG, SHORT, BUY, SELL, B, S}
- Score: `side_score = match_ratio`

**Symbol detection:**
- Short strings (2-10 chars), repeated frequently
- Score: `symbol_score = (avg_length < 10) * uniqueness_ratio`

**PnL detection:**
- Numeric, both positive & negative, plausible range
- Score: `pnl_score = (is_numeric) * (has_positive_and_negative) * (magnitude_looks_like_money)`

**Quantity detection (optional):**
- Numeric, small integer values
- Score: `qty_score = (is_numeric) * (is_integer) * (small_values)`

### Step 4: Column Scoring & Auto-Mapping
- Assign scores per column for each role
- Pick highest scoring column per required field
- Example:
  ```
  column_5:
    pnl_score = 0.93
    qty_score = 0.12
    time_score = 0.01
  → Assign column_5 as pnl
  ```

### Step 5: Validate Required Columns
**Must have:** `open_time`, `close_time`, `symbol`, `side`, `pnl`

**If missing:**
- Show lightweight correction UI
- Only ask for the missing column (single dropdown)
- Show first ~10 rows for context
- Avoid full column mapping screen

### Step 6: Closed Trade Validation
- Check if `open_time == close_time` for all rows
- If yes → warn: "Executions detected, not closed trades. Please export closed positions."

### Step 7: Build Normalized Table
Store in Neon DB `trades` table:
- `id` (UUID PK)
- `upload_id` (UUID FK)
- `open_time` (timestamptz)
- `close_time` (timestamptz)
- `symbol` (text)
- `side` (text: LONG/SHORT)
- `pnl` (numeric)
- `quantity` (integer, optional)

---

## 5. Statistical Analysis Engine (AI Instructions)

### Input
Filtered trades from Neon DB (based on user-defined rule)

### Compute Metrics
1. **Win rate:**
   ```python
   win_rate = sum(trades['pnl'] > 0) / len(trades)
   ```

2. **Expected value (R):**
   ```python
   # If R-multiples available, use them; otherwise normalize by avg loss
   avg_loss = abs(trades[trades['pnl'] < 0]['pnl'].mean())
   r_multiples = trades['pnl'] / avg_loss
   expected_value = r_multiples.mean()
   ```

3. **Profit factor:**
   ```python
   profits = trades[trades['pnl'] > 0]['pnl'].sum()
   losses = abs(trades[trades['pnl'] < 0]['pnl'].sum())
   profit_factor = profits / losses if losses > 0 else float('inf')
   ```

### Monte-Carlo / Permutation Test
```python
observed_ev = expected_value
n_simulations = 10000
random_evs = []

for _ in range(n_simulations):
    shuffled_pnl = np.random.permutation(trades['pnl'])
    shuffled_r = shuffled_pnl / avg_loss
    random_evs.append(shuffled_r.mean())

probability_random = sum(random_evs >= observed_ev) / n_simulations
```

### Stability Check
```python
midpoint = len(trades) // 2
first_half = trades[:midpoint]
second_half = trades[midpoint:]

first_ev = compute_expected_value(first_half)
second_ev = compute_expected_value(second_half)

degradation = second_ev < first_ev * 0.8  # 20% drop threshold
```

### Output Verdict
- `probability_random < 20%` → 🟢 **Likely real edge**
- `probability_random ≥ 20%` → 🔴 **Not statistically reliable**

Store results in Neon `strategy_results` table.

---

## 6. UX / UI Flow

### 6.1 Landing Page
**Hero Section:**
- **Headline:** "Is your trading strategy real — or just luck?"
- **Subheadline:** "Upload your closed trades and instantly see if your edge is statistically valid. Free, fast, and no setup required."
- **CTA Button:** "Upload CSV → Check Strategy"
- **Visual:** Illustration of CSV transforming into result card (optional)

### 6.2 Upload & Auto-Detect Flow
1. **CSV Dropzone:**
   - Drag & drop or click to open file picker
   - Loading spinner while parsing

2. **Auto-Detection Banner:**
   ```
   We detected:
   Symbol · Open time · Close time · Side · P&L
   1,284 closed trades found
   [Looks good → Continue]   [Something's wrong → Fix]
   ```

3. **Fallback UI (only if missing columns):**
   - Single dropdown per missing column
   - Show 5-10 rows of CSV for reference
   - Minimal clicks

### 6.3 Rule Builder
**Form Fields:**
- Instrument (optional text input)
- Time window (optional: start - end time picker)
- Direction: dropdown/radio → Long / Short / Both
- Max holding time (optional: numeric input, minutes/hours)
- **Button:** "Run Check → Generate Stats"

### 6.4 Result Page
**Metrics Card:**
```
Expected value: +0.18R
Win rate: 56%
Profit factor: 1.32
Probability of randomness: 41%
Verdict: ❌ Not statistically reliable
```

**Optional Email Capture:**
- "Enter your email to unlock full report / PDF download"
- Input field + submit button
- Stores email in Neon DB for InsightTrader funnel

**Optional Upsell CTA:**
- "Check multi-strategy report → InsightTrader"

### 6.5 Visual Flow Diagram
```
[Landing Page: Hero + CTA]
        |
        v
[Upload CSV: Drag & Drop + Auto-Detect]
        |
        v
[Column Confirmation Banner] -- Fallback → [Single-Field Fixer]
        |
        v
[Rule Builder: Single Strategy Filter]
        |
        v
[Statistical Engine: Compute Metrics + Monte-Carlo]
        |
        v
[Result Page / Verdict Box]
        |
        v
[Optional Email Capture → InsightTrader Funnel]
        |
       Done
```

---

## 7. Neon Database Schema

### 7.1 `users` Table
```sql
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT UNIQUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 7.2 `trade_uploads` Table
```sql
CREATE TABLE trade_uploads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    original_file_url TEXT,
    uploaded_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 7.3 `trades` Table
```sql
CREATE TABLE trades (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    upload_id UUID REFERENCES trade_uploads(id),
    open_time TIMESTAMPTZ NOT NULL,
    close_time TIMESTAMPTZ NOT NULL,
    symbol TEXT NOT NULL,
    side TEXT NOT NULL, -- 'LONG' or 'SHORT'
    pnl NUMERIC NOT NULL,
    quantity INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_trades_upload ON trades(upload_id);
CREATE INDEX idx_trades_symbol ON trades(symbol);
CREATE INDEX idx_trades_time ON trades(open_time, close_time);
```

### 7.4 `strategy_results` Table
```sql
CREATE TABLE strategy_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    upload_id UUID REFERENCES trade_uploads(id),
    user_id UUID REFERENCES users(id),
    rule_definition JSONB NOT NULL,
    metrics JSONB NOT NULL, -- {win_rate, expected_value, profit_factor}
    probability_random NUMERIC NOT NULL,
    verdict TEXT NOT NULL, -- 'LIKELY_REAL_EDGE' or 'NOT_STATISTICALLY_RELIABLE'
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_strategy_results_upload ON strategy_results(upload_id);
CREATE INDEX idx_strategy_results_user ON strategy_results(user_id);
```

---

## 8. Edge Cases / Error Handling

### Less than 5 trades
- Show: "Not enough trades to evaluate statistically. Please upload at least 5 closed trades."

### Invalid CSV
- Show: "We couldn't detect required fields. Try another file or check the format."

### Duplicate column scores
- Pick highest confidence column
- Show small tooltip: "Auto-detected [column_name] as [field_name]"

### Executions instead of closed trades
- Warn: "This looks like executions, not closed trades. Please export closed positions from your broker."

### Missing required columns after inference
- Show lightweight correction UI (single dropdown per missing field)
- Don't force full column mapping

---

## 9. Growth & Lead Capture Strategy

### Free Tier
- Allow one strategy test per file upload
- No account creation required
- Optional email capture before viewing full result

### Email Capture Flow
1. User uploads CSV → auto-detects → builds rule → runs check
2. Result page shows basic metrics
3. Optional: "Enter email to unlock full report / PDF download"
4. Email stored in Neon DB → feed into InsightTrader funnel

### Future Upsell
- Multi-strategy testing
- Weekly/monthly performance trends
- PDF export / shareable reports
- Integration with InsightTrader app

### SEO Strategy
- Target keywords: "check trading strategy", "strategy validation", "is my trading profitable"
- Content: blog posts about statistical significance in trading
- Landing page optimized for conversion

---

## 10. Future Integration / v2 Notes

### API Integrations (Future)
- Topstep ProjectX API integration for auto-import
- Apex via third-party bridge (TradersPost)
- Tradovate / NinjaTrader API

### Additional Features
- Multi-rule strategy testing
- Charts / shareable reports
- Prop firm-specific rules (Topstep, Apex challenge requirements)
- Weekly/monthly performance trends

### Authentication & User Accounts (Future - End Phase)
**Note:** This feature will be added at the end, after core functionality is proven.

- **Email sign-in** - Allow users to create accounts and save their analysis history
- User dashboard to view past strategy analyses
- Ability to re-run analyses on saved trade data
- Export history and share results
- Integration with InsightTrader app for existing users
- Persistent storage of trade uploads and analysis results per user

**Implementation Notes:**
- Use Supabase Auth or NextAuth.js for email authentication
- Extend existing `users` table in Neon DB
- Add user session management
- Protect user-specific routes and data
- Maintain backward compatibility (anonymous usage still works)

### Importer Reuse
- The auto-inference importer can be reused in InsightTrader app
- Modular design allows easy integration

---

## 11. AI Agent Build Instructions Summary

### Implementation Order
1. **Set up project structure:**
   - React + Tailwind frontend
   - FastAPI backend (or Node.js)
   - Neon DB connection

2. **Implement CSV upload + auto-inference:**
   - Header normalization
   - Column value inference
   - Scoring & auto-mapping
   - Store normalized trades in Neon DB

3. **Build column confirmation banner:**
   - One-line auto-detect summary
   - Fallback single-field correction only

4. **Implement Rule Builder UI:**
   - Minimal form (instrument, time window, direction, max holding time)
   - Filter trades based on rule

5. **Build Statistical Analysis Engine:**
   - Compute metrics (win rate, EV, profit factor)
   - Monte-Carlo / permutation test
   - Stability check
   - Store results in Neon DB

6. **Create Result Page:**
   - Display metrics + verdict
   - Optional email capture
   - Upsell CTA to InsightTrader

7. **Add email capture funnel:**
   - Store emails in Neon DB
   - Link to InsightTrader app

### Key Principles
- **Modular design:** Importer, stats engine, UI are separate components
- **Minimal friction:** No account creation required, optional email only
- **Auto-detection first:** Manual mapping only as last resort
- **Free MVP:** Lead magnet for InsightTrader funnel
- **All traders:** Universal CSV import, not broker-specific

---

## 12. References & Inspiration

- **InsightTrader.io** (current platform - source of importer logic)
- **TraderSync / Edgewonk** (journaling & analytics reference)
- **Topstep / Apex** (target audience statements)
- **Monte-Carlo statistical testing** for trade sequences
- **Bootstrap / permutation tests** for randomness detection

---

**End of Design Doc**
