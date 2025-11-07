# Visual Guide: New Tax Profile Wizard

## 📱 User Interface Overview

### Navigation Flow
```
┌─────────────┐      ┌─────────────┐      ┌─────────────┐
│   Step 1    │  →   │   Step 2    │  →   │   Step 3    │
│ Basic Info  │      │   Income    │      │   Review    │
└─────────────┘      └─────────────┘      └─────────────┘
```

---

## Step 1: Basic Info 🎯

### Visual Elements

```
┌──────────────────────────────────────────────┐
│  ✨ Create Tax Profile                  [X]  │
│  Smart tax calculations based on country     │
├──────────────────────────────────────────────┤
│                                              │
│  ● Basic Info  →  Income Details  →  Review │
│  ════════════                                │
│                                              │
│  Profile Name *                              │
│  ┌────────────────────────────────────────┐ │
│  │ [Your profile name here]               │ │
│  └────────────────────────────────────────┘ │
│                                              │
│  Country * [Search: 40+ countries]           │
│  ┌────────────────────────────────────────┐ │
│  │  🇬🇷  Greece                          ▼ │ │
│  │      EUR (€)                            │ │
│  └────────────────────────────────────────┘ │
│                                              │
│  Employment Status *                         │
│  ┌────────┐  ┌────────┐  ┌────────┐        │
│  │   💼   │  │   🏢   │  │   ⏸️   │        │
│  │Employed│  │  Self  │  │Unemploy│        │
│  │  ✓     │  │Employed│  │  -ed   │        │
│  └────────┘  └────────┘  └────────┘        │
│                                              │
│  ┌────────┐  ┌────────┐                    │
│  │   🏖️   │  │   🎓   │                    │
│  │ Retired│  │ Student│                    │
│  └────────┘  └────────┘                    │
│                                              │
│  Company Type *                              │
│  ┌──────────────────────────────────────┐  │
│  │ ✓ Individual/Employed         [✓]    │  │
│  │   Standard employment                 │  │
│  │   ✓ Simple filing  ✓ Deductions      │  │
│  │   ⚠ Higher rates  ⚠ Limited benefits │  │
│  │   👥 Employees, First-timers          │  │
│  └──────────────────────────────────────┘  │
│                                              │
│  ┌──────────────────────────────────────┐  │
│  │   Sole Proprietor                     │  │
│  │   Self-employed business              │  │
│  │   ✓ Full control  ✓ More deductions  │  │
│  │   ⚠ Personal liability                │  │
│  │   👥 Freelancers, Small business      │  │
│  └──────────────────────────────────────┘  │
│                                              │
│  [Cancel]                        [Next →]   │
└──────────────────────────────────────────────┘
```

### Key Features in Step 1

✅ **Country Picker**
- Searchable dropdown
- Flags for visual identification
- Currency shown with symbol
- 40+ countries supported

✅ **Employment Status Cards**
- Visual icons
- Clear categories
- Single selection
- Affects form in Step 2

✅ **Company Type Cards**
- Expandable details
- Pros & cons listed
- Recommended for info
- Tax rate displayed

---

## Step 2: Income Details 💰

### Visual Elements

```
┌──────────────────────────────────────────────┐
│  ✨ Create Tax Profile                  [X]  │
│  Smart tax calculations based on Greek laws  │
├──────────────────────────────────────────────┤
│                                              │
│  Basic Info  →  ● Income Details  →  Review │
│                 ════════════════             │
│                                              │
│  ℹ️ Enter your annual income                │
│  All amounts in EUR (€). Enter 0 if N/A     │
│                                              │
│  ┌────────────────────────────────────────┐ │
│  │ 💼 Employment Income                   │ │
│  │    Salary, wages, benefits             │ │
│  │                                         │ │
│  │    Annual Salary/Wages (?)             │ │
│  │    ┌────────────────────────┐          │ │
│  │    │ 35000.00               │          │ │
│  │    └────────────────────────┘          │ │
│  │    Your gross income before taxes      │ │
│  └────────────────────────────────────────┘ │
│                                              │
│  ┌────────────────────────────────────────┐ │
│  │ 📈 Investment Income                   │ │
│  │    Capital gains, dividends            │ │
│  │                                         │ │
│  │    Short-term Gains (?) [< 1 year]     │ │
│  │    ┌────────────────────────┐          │ │
│  │    │ 2000.00                │          │ │
│  │    └────────────────────────┘          │ │
│  │                                         │ │
│  │    Long-term Gains (?) [≥ 1 year]      │ │
│  │    ┌────────────────────────┐          │ │
│  │    │ 5000.00                │          │ │
│  │    └────────────────────────┘          │ │
│  │                                         │ │
│  │    Dividends (?)                       │ │
│  │    ┌────────────────────────┐          │ │
│  │    │ 1000.00                │          │ │
│  │    └────────────────────────┘          │ │
│  └────────────────────────────────────────┘ │
│                                              │
│  ┌────────────────────────────────────────┐ │
│  │ 🧮 Tax Preview    [Real-time update]  │ │
│  │                                         │ │
│  │  💚 Total Income      €43,000.00       │ │
│  │  ❤️ Est. Tax          €9,460.00       │ │
│  │  💙 Net Income        €33,540.00       │ │
│  │  💜 Tax Rate          22.0%            │ │
│  └────────────────────────────────────────┘ │
│                                              │
│  [Cancel]  [← Back]              [Next →]   │
└──────────────────────────────────────────────┘
```

### Key Features in Step 2

✅ **Categorized Income**
- 💼 Employment
- 🏢 Business
- 📈 Investments
- 🏠 Property
- ₿ Crypto
- 📝 Deductions

✅ **Smart Fields**
- Only show relevant categories
- Tooltips with explanations
- Help text below each field
- Placeholder values

✅ **Real-Time Preview**
- Updates as you type
- Color-coded (green/red/blue/purple)
- Shows 4 key metrics
- Instant feedback

---

## Step 3: Review & Save ✅

### Visual Elements

```
┌──────────────────────────────────────────────┐
│  ✨ Create Tax Profile                  [X]  │
│  Smart tax calculations based on Greek laws  │
├──────────────────────────────────────────────┤
│                                              │
│  Basic Info  →  Income Details  →  ● Review │
│                                    ═════════ │
│                                              │
│  ┌────────────────────────────────────────┐ │
│  │ ✓ Review Your Tax Profile             │ │
│  │                                         │ │
│  │ Profile Name                            │ │
│  │ ┌────────────────────────────────────┐ │ │
│  │ │ 2024 Tax Profile                   │ │ │
│  │ └────────────────────────────────────┘ │ │
│  │                                         │ │
│  │ Country & Type                          │ │
│  │ ┌──────────────┐  ┌──────────────────┐ │ │
│  │ │ 🇬🇷 Greece   │  │ Individual       │ │ │
│  │ └──────────────┘  └──────────────────┘ │ │
│  │                                         │ │
│  │ Tax Summary                             │ │
│  │ ┌────────────────────────────────────┐ │ │
│  │ │ Total Income    €43,000.00         │ │ │
│  │ │ Estimated Tax   €9,460.00          │ │ │
│  │ │ Net Income      €33,540.00         │ │ │
│  │ │ Effective Rate  22.0%              │ │ │
│  │ └────────────────────────────────────┘ │ │
│  └────────────────────────────────────────┘ │
│                                              │
│  ┌────────────────────────────────────────┐ │
│  │ 📈 Smart Tax Tips                      │ │
│  │                                         │ │
│  │ 💡 Keep detailed records of expenses   │ │
│  │ 💡 Consider salary vs dividend split   │ │
│  │ 💡 Track rental property costs         │ │
│  │ 💡 Use tax-advantaged accounts         │ │
│  └────────────────────────────────────────┘ │
│                                              │
│  Notes (Optional)                            │
│  ┌────────────────────────────────────────┐ │
│  │ [Any notes about this profile...]      │ │
│  └────────────────────────────────────────┘ │
│                                              │
│  [✓] Set as active profile                  │
│                                              │
│  [Cancel]  [← Back]    [✓ Create Profile]  │
└──────────────────────────────────────────────┘
```

### Key Features in Step 3

✅ **Summary Cards**
- Profile name
- Country with flag
- Company type
- Complete tax breakdown

✅ **Smart Suggestions**
- Personalized to profile
- Country-specific
- Employment-aware
- Actionable tips

✅ **Final Options**
- Optional notes field
- Set as active toggle
- Create/Update button

---

## 🎨 Design Elements

### Color Scheme

```
Primary Colors:
- Blue (#3B82F6)    - Primary actions, selected items
- Purple (#9333EA)  - Gradients, accents
- Green (#10B981)   - Positive values, income
- Red (#EF4444)     - Negative values, tax
- Gray (#6B7280)    - Text, borders

Status Colors:
- Success: Green (✓)
- Warning: Orange (⚠)
- Info: Blue (ℹ️)
- Error: Red (❌)

Background:
- Light: White (#FFFFFF), Gray-50 (#F9FAFB)
- Dark: Gray-800 (#1F2937), Gray-900 (#111827)
```

### Icons

```
📊 Categories:
- 💼 Employment
- 🏢 Business
- 📈 Investments
- 🏠 Property
- ₿ Crypto
- 📝 Deductions

🎯 Actions:
- ✨ Wizard
- ✓ Success
- ⚠ Warning
- (?) Help
- → Next
- ← Back

🌍 Countries:
- 🇬🇷 Greece
- 🇺🇸 USA
- 🇬🇧 UK
- (+ 37 more)

💡 Features:
- 🧮 Calculator
- 💡 Tips
- 🎯 Goals
- 📊 Reports
```

### Typography

```
Headings:
- H1: 2xl, Bold (Main title)
- H2: xl, Bold (Section headers)
- H3: lg, Semibold (Subsections)
- H4: base, Semibold (Card titles)

Body:
- Regular: sm (14px)
- Small: xs (12px)
- Tiny: 2xs (10px)

Weight:
- Regular: 400
- Medium: 500
- Semibold: 600
- Bold: 700
```

### Spacing

```
Padding:
- Tight: 2 (8px)
- Normal: 4 (16px)
- Loose: 6 (24px)
- Extra: 8 (32px)

Gap:
- Compact: 2 (8px)
- Normal: 4 (16px)
- Wide: 6 (24px)

Border Radius:
- Small: 0.375rem (6px)
- Medium: 0.5rem (8px)
- Large: 0.75rem (12px)
- Extra: 1rem (16px)
```

---

## 🔄 Animation States

### Hover Effects
```css
.button:hover {
  transform: scale(1.02);
  box-shadow: 0 10px 25px rgba(0,0,0,0.1);
  transition: all 0.2s ease;
}

.card:hover {
  border-color: blue;
  background: light-blue;
}
```

### Focus States
```css
.input:focus {
  border-color: blue;
  ring: 2px blue;
  outline: none;
}
```

### Active States
```css
.selected {
  background: blue-50;
  border: 2px blue-500;
  color: blue-700;
}
```

### Step Transitions
```css
.step-enter {
  animation: fadeIn 0.3s ease-out;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
```

---

## 📱 Responsive Design

### Desktop (1024px+)
```
- Full 3-column grid for income categories
- Side-by-side company type cards
- Wide modal (900px)
- All features visible
```

### Tablet (768px - 1023px)
```
- 2-column grid for income
- Stacked company types
- Medium modal (700px)
- Scrollable content
```

### Mobile (< 768px)
```
- Single column layout
- Full-width cards
- Compact modal
- Touch-optimized
- Larger tap targets
```

---

## 🎯 Interaction Patterns

### Progressive Disclosure
```
Basic → Detailed → Review
  ↓       ↓         ↓
Simple  Complex   Summary
```

### Validation
```
Step 1: Profile name required
Step 2: Values must be ≥ 0
Step 3: Review before save
```

### Feedback
```
Input → Preview → Suggestion
  ↓       ↓          ↓
Type    Updates    Shows tip
```

---

## 🌟 Special Features

### Search (Country Picker)
```
Type: "gre"
↓
Shows: Greece 🇬🇷
       Greenland 🇬🇱
```

### Tooltips
```
Hover (?):
┌─────────────────────────┐
│ This is your gross      │
│ income before any       │
│ deductions or taxes     │
└─────────────────────────┘
```

### Real-Time Calc
```
Salary: 35000 → Preview: €7,700 tax
          ↓                   ↓
      +5000 →            €8,800 tax
                        (updates instantly)
```

### Smart Tips
```
Profile Analysis:
- High income → Retirement tip
- Short-term gains → Hold longer tip
- Business income → Deduction tip
- Country-specific → Local tax tip
```

---

## 🎨 Visual Hierarchy

```
Level 1: Modal Title (✨ + heading)
Level 2: Step Indicators (progress)
Level 3: Section Headers (categories)
Level 4: Field Labels (inputs)
Level 5: Help Text (descriptions)
```

---

## Summary

The new tax wizard uses:
- ✅ **Progressive disclosure** to reduce overwhelm
- ✅ **Visual hierarchy** for easy scanning
- ✅ **Clear iconography** for quick recognition
- ✅ **Real-time feedback** for confidence
- ✅ **Smart suggestions** for optimization
- ✅ **Beautiful design** for engagement

**Result: A delightful, educational, and efficient tax profile creation experience!** 🎉
