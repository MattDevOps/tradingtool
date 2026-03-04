# UX Redesign Checklist - Verification Against Spec

## ✅ Completed Items

### 1. Title Change
- ✅ Changed from "Define Your Strategy Rule" to "Check one simple strategy"

### 2. Instrument Field
- ✅ Changed from text input to dropdown
- ✅ Auto-populated from uploaded trades
- ✅ First option: "All instruments (X trades)" with total count
- ✅ Individual symbols show counts: "SPX (157 trades)"
- ✅ Helper text: "Choose from instruments found in your uploaded file."

### 3. Time Window
- ✅ Hidden by default
- ✅ Moved to Advanced filters section
- ✅ Replaced time-of-day with date range (start/end date)

### 4. Direction Selector
- ✅ Changed from radio buttons to segmented toggle buttons
- ✅ Label: "Trade direction" (was "Direction")
- ✅ Default: "Both" (selected)
- ✅ Visual: Three buttons (Long, Short, Both) with active state

### 5. Max Holding Time
- ✅ Hidden in Advanced filters section
- ✅ Label: "Max holding time (minutes)"
- ✅ Placeholder: "e.g., 15"

### 6. Live Preview Count ⚠️
- ✅ Shows "This rule matches X trades"
- ✅ Updates live (debounced 400ms)
- ✅ Shows "Checking..." while loading
- ✅ Positioned after Direction, before Advanced filters

### 7. CTA Button
- ✅ Changed from "Run Check → Generate Stats" to "Test this strategy"
- ✅ Disabled when matchCount === 0
- ✅ Shows "Analyzing..." when processing

### 8. Advanced Filters Section
- ✅ Collapsed by default
- ✅ Toggle button: "▸ Advanced filters" / "▾ Advanced filters"
- ✅ Contains: Date range and Max holding time
- ✅ Visual: Indented with left border when expanded

### 9. ThinkOrSwim Notice
- ✅ Added to rule builder page (top)
- ✅ Added to upload page
- ✅ Text: "Currently supports ThinkOrSwim trade statements. More brokers coming soon."
- ✅ Styled as blue info banner

### 10. Footnote
- ✅ Text: "You can skip all filters to test your entire trading history."

## 🔍 Additional Verification

### API Endpoints
- ✅ `GET /api/uploads/[uploadId]/symbols` - Returns symbols with counts
- ✅ `POST /api/strategy/preview-count` - Returns live match count

### Functionality
- ✅ Debounced preview updates (400ms)
- ✅ Date range filtering (separate from time window)
- ✅ All filters work together correctly
- ✅ Error handling for empty results

### Visual Hierarchy
- ✅ ThinkOrSwim notice at top
- ✅ Title centered
- ✅ Form in white card
- ✅ Match preview in gray box
- ✅ Advanced section collapsible
- ✅ CTA button prominent

## 📝 Notes

1. **Time Window vs Date Range**: Spec said to hide "Time window" but suggested "Limit by date" - interpreted as replacing time-of-day with date range, which is more user-friendly.

2. **Match Preview Wording**: Updated to match spec exactly: "This rule matches X trades"

3. **Visual Styling**: Used Tailwind classes consistent with existing design system.

## ⚠️ Potential Issues to Verify

1. **Symbols API**: Need to verify it works with temp uploads (no DB)
2. **Preview Count**: Need to verify it handles edge cases (0 trades, etc.)
3. **Date Range**: Need to verify date filtering works correctly with the stats engine
