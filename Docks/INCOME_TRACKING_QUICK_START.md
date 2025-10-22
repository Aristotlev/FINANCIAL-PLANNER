# Income Tracking - Quick Start Guide

## 🚀 Getting Started in 3 Steps

### Step 1: Access Income Tab
1. Open the **Cash & Liquidity** card
2. Click the **"Income"** tab (briefcase icon)
3. You'll see the income dashboard

### Step 2: Add Your First Income Source
1. Click the green **"Add Income Source"** button
2. Fill in the basic details:
   - **Name**: "My Salary" (or whatever you want to call it)
   - **Amount**: Your payment amount (e.g., $5000)
   - **Frequency**: How often you get paid (Monthly, Weekly, etc.)
   - **Category**: What type of income (Salary, Side Hustle, etc.)
   - **Connected Account**: Select which bank account receives this money

3. Click **"Add Income Source"**

### Step 3: View Your Income Summary
After adding income sources, you'll see:
- 💰 **Monthly Income** - Your total monthly income
- 📈 **Yearly Income** - Your projected annual income
- 💼 **Total Sources** - How many income streams you have

## 📱 Common Scenarios

### Scenario 1: Regular 9-5 Employee
```
✅ Add your main salary
   - Name: "Google Salary"
   - Amount: $8,000
   - Frequency: Monthly
   - Category: Salary
   - Account: Your main checking account
   - Recurring: ✓ YES
```

### Scenario 2: Freelancer with Multiple Clients
```
✅ Add each client as separate income
   - Name: "Client A - Web Design"
   - Amount: $2,000
   - Frequency: Monthly
   - Category: Freelance
   - Account: Your business account
   
✅ Add another client
   - Name: "Client B - Logo Design"
   - Amount: $500
   - Frequency: Bi-Weekly
   - Category: Freelance
```

### Scenario 3: Side Hustle Income
```
✅ Add your side income
   - Name: "Etsy Shop"
   - Amount: $300
   - Frequency: Monthly
   - Category: Side-Hustle
   - Account: Your PayPal account
   - Recurring: ✓ YES
```

### Scenario 4: One-Time Bonus
```
✅ Add the bonus
   - Name: "Year-End Bonus"
   - Amount: $5,000
   - Frequency: One-Time
   - Category: Bonus
   - Account: Your checking account
   - Recurring: ✗ NO
```

## 🎯 Pro Tips

### Tip 1: Use Descriptive Names
❌ Bad: "Income 1", "Money", "Job"
✅ Good: "Amazon Software Engineer Salary", "Uber Side Hustle", "Airbnb Rental"

### Tip 2: Connect to Actual Accounts
Make sure to select the bank account where the money actually goes. This helps with:
- Tracking where your money flows
- Reconciling your accounts
- Understanding which accounts grow from which sources

### Tip 3: Set Next Payment Dates
For recurring income, set the next payment date to:
- Know when to expect money
- Plan your cash flow
- Budget more accurately

### Tip 4: Use Notes Wisely
Add notes to remember:
- Special conditions (e.g., "Paid on last Friday of month")
- Recent changes (e.g., "Raise from $5k to $5.5k in Jan 2025")
- Important details (e.g., "Subject to 25% withholding")

### Tip 5: Keep It Updated
- Remove old income sources when they end
- Update amounts when you get raises
- Add new sources as you get them

## 🔧 Managing Income Sources

### To Edit an Income Source:
1. Find the income in the list
2. Click the **blue pencil icon** (Edit)
3. Make your changes
4. Click **"Update Income Source"**

### To Delete an Income Source:
1. Find the income in the list
2. Click the **red trash icon** (Delete)
3. Confirm the deletion

### To See Monthly Breakdown:
Each recurring income shows its "Monthly equivalent" - this is what it contributes to your monthly total, even if it's paid weekly or yearly.

## 📊 Understanding the Dashboard

### Monthly Income
- **Only includes recurring income**
- All frequencies converted to monthly
- Example: $500/week = $2,165/month (500 × 4.33)

### Yearly Income  
- Monthly Income × 12
- Good for tax planning
- Shows your gross annual income

### Total Sources
- All income sources (recurring + one-time)
- Helps you see income diversity
- More sources = more stable income

## 🏦 Bank Account Integration

### Why Connect Accounts?
1. **See where money goes** - Track which accounts grow
2. **Cash flow planning** - Know when accounts get funded
3. **Better budgeting** - Understand account purposes

### How It Works:
- Each income source links to ONE account
- You can have multiple incomes to the same account
- The account must exist in your Cash Accounts first

### Setting It Up:
1. Make sure your bank accounts are added in the "Accounts" tab
2. When adding income, select from the dropdown
3. The format shows: "Account Name - Bank Name"

## ⚙️ Database Setup (For Supabase Users)

If you're using Supabase for data persistence:

1. Run the SQL schema:
   ```bash
   # File: supabase-income-sources-schema.sql
   ```

2. The table will be created with:
   - Row-level security enabled
   - Automatic timestamps
   - User-specific data isolation

3. Your data will sync across devices!

## ❓ FAQ

**Q: What if I get paid weekly but want to see monthly?**
A: The system automatically converts! Just enter your weekly amount and select "Weekly" frequency.

**Q: Should I add my investment income here?**
A: Use the "Passive Income" category for dividends, rental income, etc.

**Q: What about irregular freelance income?**
A: Either:
- Use your average monthly amount
- Add each project as "One-Time" income

**Q: Can I track income from multiple jobs?**
A: Yes! Add each job as a separate income source.

**Q: Do one-time incomes count toward monthly?**
A: No, one-time incomes don't affect your monthly recurring total, but they show in the list.

**Q: What if my income amount changes?**
A: Edit the income source and update the amount whenever it changes.

## 🎉 You're All Set!

Start tracking your income and get a clear picture of your cash flow. The system will:
- Calculate your monthly income automatically
- Project your yearly earnings
- Help you understand your income sources
- Connect your income to your bank accounts

**Next Steps:**
- Add all your income sources
- Set next payment dates
- Review your monthly/yearly totals
- Use this data for budgeting and planning

Happy tracking! 💰
