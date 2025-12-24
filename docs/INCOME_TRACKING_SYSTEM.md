# Income Tracking System

## Overview
The Income Tracking System is a comprehensive feature within the Cash & Liquidity card that allows users to manage and track all their income sources including salaries, side hustles, freelance work, and one-time payments.

## Features

### 📊 Income Types Supported
- **Salary** - Regular employment income
- **Side Hustle** - Secondary income streams
- **Freelance** - Project-based income
- **Passive Income** - Investments, royalties, etc.
- **Bonus** - One-time or periodic bonuses
- **Other** - Any other income type

### 💰 Income Frequencies
- **Weekly** - Paid every week
- **Bi-Weekly** - Paid every two weeks
- **Monthly** - Paid once per month
- **Yearly** - Annual payments
- **One-Time** - Non-recurring payments

### 🔗 Key Features
1. **Bank Account Connection** - Link each income source to a specific cash account
2. **Recurring vs One-Time** - Track both recurring and one-time income
3. **Next Payment Tracking** - Optional date tracking for upcoming payments
4. **Monthly Equivalent Calculation** - Automatically converts all frequencies to monthly amounts
5. **Visual Organization** - Color-coded income sources for easy identification
6. **Notes Support** - Add custom notes to each income source

## User Interface

### Income Tab Components

#### Summary Cards (Top Row)
1. **Monthly Income Card** 
   - Shows total monthly income from all recurring sources
   - Displays number of recurring sources

2. **Yearly Income Card**
   - Projects annual income based on monthly totals
   - Helps with annual budgeting and tax planning

3. **Total Sources Card**
   - Shows total number of income sources
   - Breaks down one-time vs recurring

#### Income Lists

**Recurring Income Section**
- Lists all recurring income sources
- Shows monthly equivalent for each source
- Displays connected bank account
- Shows next payment date (if set)
- Edit and delete actions

**One-Time Income Section**
- Lists all one-time payments
- Useful for tracking bonuses, gifts, tax refunds
- Edit and delete actions

## Income Management

### Adding Income Sources
1. Click "Add Income Source" button
2. Fill in required fields:
   - **Name** - Descriptive name (e.g., "Google Salary", "Upwork Freelance")
   - **Amount** - Income amount per payment period
   - **Frequency** - How often you receive this income
   - **Category** - Type of income
   - **Connected Account** - Which bank account receives this income
3. Optional fields:
   - **Recurring** - Toggle for one-time payments
   - **Next Payment Date** - Track when next payment is due
   - **Notes** - Additional details
   - **Color** - Visual identifier

### Editing Income Sources
- Click the edit icon (blue pencil)
- Modify any field
- Changes save immediately

### Deleting Income Sources
- Click the delete icon (red trash)
- Confirm deletion
- Removes from all calculations

## Calculations

### Monthly Income Calculation
The system automatically converts all frequencies to monthly equivalents:

- **Weekly**: `amount × 4.33` (52 weeks ÷ 12 months)
- **Bi-Weekly**: `amount × 2.17` (26 periods ÷ 12 months)
- **Monthly**: `amount × 1` (no conversion)
- **Yearly**: `amount ÷ 12`
- **One-Time**: Not included in monthly calculations

### Total Monthly Income
Sum of all recurring income sources converted to monthly amounts.

### Yearly Income
`Total Monthly Income × 12`

## Database Schema

### Table: `income_sources`

```sql
id                  TEXT PRIMARY KEY
user_id            UUID REFERENCES auth.users
name               TEXT NOT NULL
amount             DECIMAL(15, 2) NOT NULL
frequency          TEXT (weekly|bi-weekly|monthly|yearly|one-time)
category           TEXT (salary|side-hustle|freelance|passive|bonus|other)
connected_account  TEXT NOT NULL
is_recurring       BOOLEAN DEFAULT true
next_payment_date  DATE
notes              TEXT
color              TEXT DEFAULT '#10b981'
created_at         TIMESTAMP
updated_at         TIMESTAMP
```

### Indexes
- `idx_income_sources_user_id` - Fast user queries
- `idx_income_sources_is_recurring` - Filter by recurring status
- `idx_income_sources_category` - Filter by category

### Row Level Security (RLS)
- Users can only view/edit/delete their own income sources
- Automatic user_id filtering
- Secure by default

## Integration with Cash Accounts

### Account Connection
- Each income source must be connected to a cash account
- Dropdown shows all user's cash accounts
- Format: "Account Name - Bank Name"

### Future Enhancements
- Automatic balance updates when income is received
- Income history tracking
- Income vs expenses comparison
- Tax estimation based on income
- Multi-currency support

## Data Persistence

### Storage Options
1. **Supabase** (Primary)
   - Cloud-based storage
   - Multi-device sync
   - Secure authentication

2. **LocalStorage** (Fallback)
   - Offline support
   - No authentication required
   - Single-device only

### Data Sync
- Real-time updates across components
- Event-based synchronization (`financialDataChanged`)
- Automatic fallback handling

## Usage Examples

### Example 1: Full-Time Employee
```
Name: "Google Software Engineer Salary"
Amount: $8,000
Frequency: Monthly
Category: Salary
Connected Account: "Main Checking - Chase Bank"
Recurring: Yes
Next Payment: Last day of month
```

### Example 2: Freelance Work
```
Name: "Upwork Web Development"
Amount: $500
Frequency: Weekly
Category: Freelance
Connected Account: "Business Checking - Mercury"
Recurring: Yes
Notes: "Average weekly earnings from ongoing projects"
```

### Example 3: One-Time Bonus
```
Name: "Year-End Performance Bonus"
Amount: $10,000
Frequency: One-Time
Category: Bonus
Connected Account: "Main Checking - Chase Bank"
Recurring: No
Notes: "Annual bonus received December 2024"
```

### Example 4: Side Hustle
```
Name: "YouTube Ad Revenue"
Amount: $450
Frequency: Monthly
Category: Side-Hustle
Connected Account: "PayPal Business Account"
Recurring: Yes
Notes: "Average monthly AdSense earnings"
```

## Best Practices

### 1. Accurate Categorization
- Use appropriate categories for tax purposes
- Keep side hustles separate from main salary
- Track bonuses as one-time unless truly recurring

### 2. Regular Updates
- Update amounts when income changes
- Remove old income sources
- Add new sources promptly

### 3. Use Notes Field
- Document income source details
- Note any special conditions
- Track changes over time

### 4. Next Payment Dates
- Set for salary and regular income
- Helps with cash flow planning
- Useful for budgeting

### 5. Account Connections
- Connect to the actual receiving account
- Update if you change banks
- Helps track where money goes

## Technical Implementation

### Component Structure
```
CashCard
├── CashModalContent
│   ├── activeTab: 'income'
│   ├── incomeSources: IncomeSource[]
│   └── Income Tab UI
├── AddIncomeModal
│   └── Form for new income
└── EditIncomeModal
    └── Form for editing
```

### State Management
```typescript
const [incomeSources, setIncomeSources] = useState<IncomeSource[]>([]);
const [showAddIncomeModal, setShowAddIncomeModal] = useState(false);
const [showEditIncomeModal, setShowEditIncomeModal] = useState(false);
const [editingIncome, setEditingIncome] = useState<IncomeSource | null>(null);
```

### CRUD Operations
- `addIncomeSource()` - Create new income source
- `updateIncomeSource()` - Modify existing source
- `deleteIncomeSource()` - Remove source
- `editIncomeSource()` - Open edit modal

## Future Roadmap

### Phase 2 Features
- [ ] Income history and trends
- [ ] Income vs expenses dashboard
- [ ] Tax estimation calculator
- [ ] Income receipt uploads
- [ ] Automatic income detection (bank sync)

### Phase 3 Features
- [ ] Multi-currency income support
- [ ] Income forecasting
- [ ] Contract/invoice management
- [ ] Client management for freelancers
- [ ] Income analytics and reports

## Support

For issues or questions about the Income Tracking System:
1. Check this documentation
2. Review the database schema
3. Examine the component code
4. Test with sample data

## Summary

The Income Tracking System provides a comprehensive solution for managing all types of income in one place. With support for various frequencies, categories, and bank account connections, it offers flexibility for diverse financial situations while maintaining simplicity and ease of use.
