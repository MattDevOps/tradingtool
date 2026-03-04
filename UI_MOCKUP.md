# Visual UI Mockup: Strategy Reality Check MVP

**For AI Agent:** Use this document as a blueprint to render the frontend exactly as specified.

---

## 1. Landing Page (Hero Section)

### Layout Structure
```
┌─────────────────────────────────────────────────────────────┐
│  [Logo: InsightTrader]                    [Sign In] (future)│
├─────────────────────────────────────────────────────────────┤
│                                                              │
│              Is your trading strategy real                   │
│                  — or just luck?                            │
│                                                              │
│     Upload your closed trades and instantly see if          │
│     your edge is statistically valid. Free, fast, and        │
│              no setup required.                              │
│                                                              │
│              [Upload CSV → Check Strategy]                   │
│                                                              │
│        Supported formats: CSV (comma or tab-separated)      │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Component Specifications
- **Header:**
  - Left: Logo (InsightTrader symbol + name, optional)
  - Right: "Sign In" / "Sign up" (future, optional for MVP)

- **Hero Text:**
  - **Headline:** "Is your trading strategy real — or just luck?"
    - Font: Large, bold (2.5rem - 3rem)
    - Color: Dark (e.g., #1a1a1a)
    - Centered
  
  - **Subheadline:** "Upload your closed trades and instantly see if your edge is statistically valid. Free, fast, and no setup required."
    - Font: Medium (1.125rem - 1.25rem)
    - Color: Gray (#666)
    - Centered
    - Max width: 600px

- **CTA Button:**
  - Text: "Upload CSV → Check Strategy"
  - Style: Large, prominent (primary color, e.g., blue #3b82f6)
  - Size: Padding 1rem 2rem, rounded corners
  - Hover: Slight scale/color change
  - Centered

- **Supporting Text:**
  - "Supported formats: CSV (comma or tab-separated)"
  - Font: Small (0.875rem)
  - Color: Light gray (#999)
  - Centered, below button

- **Visual Aid (Optional):**
  - Illustration: CSV sheet → result card transformation
  - Or: Simple chart/graph icon
  - Position: Below hero text or as background element

---

## 2. CSV Upload / Auto-Detect Screen

### Layout Structure
```
┌─────────────────────────────────────────────────────────────┐
│  [Logo]                                                      │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│              Upload Your Trade History                       │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │                                                      │  │
│  │        Drag & drop CSV file here                     │  │
│  │              or click to browse                       │  │
│  │                                                      │  │
│  │              [📁 Choose File]                        │  │
│  │                                                      │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
│  (Loading spinner appears while parsing...)                  │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### After Parsing - Confirmation Banner
```
┌─────────────────────────────────────────────────────────────┐
│  [Logo]                                                      │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  ✅ We detected:                                      │  │
│  │     Symbol · Open time · Close time · Side · P&L     │  │
│  │                                                       │  │
│  │     1,284 closed trades found                        │  │
│  │                                                       │  │
│  │  [Looks good → Continue]  [Something's wrong → Fix]  │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Component Specifications
- **Upload Dropzone:**
  - Border: Dashed, 2px, gray (#ddd)
  - Background: Light gray (#f9fafb) on hover
  - Padding: 3rem
  - Border radius: 8px
  - Centered, max width: 600px
  - Text: "Drag & drop CSV file here or click to browse"
  - Button: "Choose File" (secondary style)

- **Loading State:**
  - Spinner: Centered, medium size
  - Text: "Scanning your file..." (optional)

- **Confirmation Banner:**
  - Background: Light green (#f0fdf4) or light blue (#eff6ff)
  - Border: 1px solid green/blue
  - Padding: 1.5rem
  - Border radius: 8px
  - Icon: ✅ checkmark
  - Text: "We detected: [columns]"
  - Trade count: Bold, larger font
  - Buttons:
    - Primary: "Looks good → Continue" (green/blue)
    - Secondary: "Something's wrong → Fix" (gray outline)

---

## 3. Fallback Single-Field Correction UI

### Layout Structure (Only shown if detection fails)
```
┌─────────────────────────────────────────────────────────────┐
│  [Logo]                                                      │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  We couldn't auto-detect all required fields.               │
│  Please help us map the missing column:                     │
│                                                              │
│  Missing: P&L                                                │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  CSV Preview (first 5-10 rows):                      │  │
│  │                                                      │  │
│  │  Column 1  |  Column 2  |  Column 3  |  Column 4   │  │
│  │  ES         |  09:30:00  |  09:45:00  |  +125.50    │  │
│  │  NQ         |  10:00:00  |  10:15:00  |  -75.25     │  │
│  │  ...                                                    │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
│  Which column contains P&L?                                  │
│  [Dropdown: Column 1 | Column 2 | Column 3 | Column 4]    │
│                                                              │
│  [Continue]                                                  │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Component Specifications
- **Header Text:**
  - "We couldn't auto-detect all required fields."
  - "Please help us map the missing column:"
  - Font: Medium, gray

- **Missing Field Indicator:**
  - "Missing: [field_name]" (e.g., P&L, Open Time)
  - Font: Bold, red/orange

- **CSV Preview Table:**
  - Show first 5-10 rows
  - Border: 1px solid #ddd
  - Padding: 1rem
  - Max height: 300px, scrollable
  - Column headers: "Column 1", "Column 2", etc.

- **Dropdown:**
  - Label: "Which column contains [field_name]?"
  - Options: All CSV columns
  - Style: Standard select dropdown
  - Width: Full width, max 400px

- **Continue Button:**
  - Primary style
  - Text: "Continue"
  - Enabled after selection

---

## 4. Rule Builder Screen

### Layout Structure
```
┌─────────────────────────────────────────────────────────────┐
│  [Logo]                                                      │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│              Define Your Strategy Rule                       │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │                                                      │  │
│  │  Instrument / Symbol (optional)                      │  │
│  │  [Text input: e.g., ES, NQ, BTC]                    │  │
│  │                                                      │  │
│  │  Time Window (optional)                              │  │
│  │  Start: [Time picker: 09:30]                        │  │
│  │  End:   [Time picker: 10:15]                         │  │
│  │                                                      │  │
│  │  Direction                                            │  │
│  │  ○ Long  ○ Short  ● Both                             │  │
│  │                                                      │  │
│  │  Max Holding Time (optional)                         │  │
│  │  [Number input: 15] [Dropdown: minutes / hours]      │  │
│  │                                                      │  │
│  │  [Run Check → Generate Stats]                        │  │
│  │                                                      │  │
│  │  Note: You can skip optional fields for a general   │  │
│  │  check of all your trades.                           │  │
│  │                                                      │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Component Specifications
- **Header:**
  - "Define Your Strategy Rule"
  - Font: Large, bold (2rem)
  - Centered

- **Form Container:**
  - Background: White
  - Border: 1px solid #e5e7eb
  - Border radius: 8px
  - Padding: 2rem
  - Max width: 600px
  - Centered

- **Form Fields:**
  - **Instrument:**
    - Label: "Instrument / Symbol (optional)"
    - Input: Text input, placeholder "e.g., ES, NQ, BTC"
    - Width: Full width

  - **Time Window:**
    - Label: "Time Window (optional)"
    - Two inputs: Start time, End time
    - Type: Time picker (HH:MM format)
    - Side by side layout

  - **Direction:**
    - Label: "Direction"
    - Radio buttons: Long / Short / Both
    - Default: Both
    - Horizontal layout

  - **Max Holding Time:**
    - Label: "Max Holding Time (optional)"
    - Number input + dropdown (minutes / hours)
    - Side by side layout

- **CTA Button:**
  - Text: "Run Check → Generate Stats"
  - Style: Primary, large
  - Width: Full width
  - Position: Below form fields

- **Helper Text:**
  - "Note: You can skip optional fields for a general check of all your trades."
  - Font: Small, gray
  - Position: Below button

---

## 5. Result Page / Verdict Screen

### Layout Structure
```
┌─────────────────────────────────────────────────────────────┐
│  [Logo]                                                      │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│              Strategy Analysis Results                       │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │                                                      │  │
│  │  Expected value: +0.18R                              │  │
│  │  Win rate: 56%                                       │  │
│  │  Profit factor: 1.32                                 │  │
│  │  Probability of randomness: 41%                      │  │
│  │                                                      │  │
│  │  ┌──────────────────────────────────────────────┐    │  │
│  │  │  Verdict: ❌ Not statistically reliable     │    │  │
│  │  └──────────────────────────────────────────────┘    │  │
│  │                                                      │  │
│  │  Stability Check:                                    │  │
│  │  First half: +0.21R                                  │  │
│  │  Second half: -0.04R                                 │  │
│  │                                                      │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Enter your email to unlock full report / PDF        │  │
│  │                                                      │  │
│  │  [Email input field]                                 │  │
│  │  [Submit]                                            │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
│  [Check multi-strategy report → InsightTrader] (upsell)     │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Component Specifications
- **Header:**
  - "Strategy Analysis Results"
  - Font: Large, bold (2rem)
  - Centered

- **Metrics Card:**
  - Background: White
  - Border: 1px solid #e5e7eb
  - Border radius: 8px
  - Padding: 2rem
  - Max width: 700px
  - Centered

- **Metrics Display:**
  - Each metric on its own line:
    - Label: Bold, gray
    - Value: Large, bold, primary color
  - Spacing: 1rem between metrics

- **Verdict Box:**
  - Background: Red (#fef2f2) for "Not reliable" or Green (#f0fdf4) for "Likely real edge"
  - Border: 2px solid red/green
  - Border radius: 8px
  - Padding: 1.5rem
  - Text: Large, bold
  - Icon: ❌ or ✅
  - Centered within metrics card

- **Stability Check:**
  - Label: "Stability Check:"
  - Two lines: "First half: [value]" and "Second half: [value]"
  - Font: Medium, gray

- **Email Capture Section:**
  - Background: Light gray (#f9fafb)
  - Border: 1px solid #e5e7eb
  - Border radius: 8px
  - Padding: 1.5rem
  - Max width: 500px
  - Centered
  - Text: "Enter your email to unlock full report / PDF"
  - Input: Email type, full width
  - Button: "Submit" (primary style)

- **Upsell CTA:**
  - Text: "Check multi-strategy report → InsightTrader"
  - Style: Secondary/link style
  - Position: Below email capture
  - Centered

---

## 6. Loading States

### While Processing Stats
```
┌─────────────────────────────────────────────────────────────┐
│  [Logo]                                                      │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│              Analyzing Your Strategy...                      │
│                                                              │
│                    [Loading Spinner]                         │
│                                                              │
│  Running statistical tests (this may take a few seconds)    │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## 7. Error States

### Invalid CSV / Detection Failure
```
┌─────────────────────────────────────────────────────────────┐
│  [Logo]                                                      │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  ⚠️  We couldn't detect required fields.             │  │
│  │                                                       │  │
│  │  Please try another file or check the format.        │  │
│  │  Required: Open time, Close time, Symbol, Side, P&L  │  │
│  │                                                       │  │
│  │  [Try Another File]                                   │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Not Enough Trades
```
┌─────────────────────────────────────────────────────────────┐
│  [Logo]                                                      │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  ⚠️  Not enough trades to evaluate statistically.   │  │
│  │                                                       │  │
│  │  Please upload at least 5 closed trades.             │  │
│  │  You uploaded: 3 trades                               │  │
│  │                                                       │  │
│  │  [Upload Another File]                                │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## 8. Responsive Design Notes

### Mobile (< 768px)
- Stack form fields vertically
- Reduce padding/margins
- Full-width buttons
- Smaller font sizes for hero text
- Collapse navigation to hamburger menu (if added)

### Tablet (768px - 1024px)
- Maintain desktop layout with adjusted spacing
- Slightly smaller max-widths for cards

### Desktop (> 1024px)
- Centered content, max-width: 1200px
- Generous whitespace
- Larger font sizes for hero

---

## 9. Color Palette Suggestions

- **Primary:** Blue (#3b82f6) or Green (#10b981)
- **Success:** Green (#10b981)
- **Error/Warning:** Red (#ef4444) or Orange (#f59e0b)
- **Text Primary:** Dark gray (#1a1a1a)
- **Text Secondary:** Gray (#666)
- **Background:** White (#ffffff)
- **Background Light:** Light gray (#f9fafb)
- **Border:** Light gray (#e5e7eb)

---

## 10. Typography Suggestions

- **Headlines:** Inter or System font, bold, 2rem - 3rem
- **Body:** Inter or System font, regular, 1rem
- **Small Text:** 0.875rem
- **Button Text:** Medium weight, 1rem

---

**End of UI Mockup**
