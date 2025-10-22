# Income Tracking - Database Setup Instructions

## 🗄️ Supabase Setup

### Step 1: Access Supabase SQL Editor
1. Go to your Supabase project dashboard
2. Click on **SQL Editor** in the left sidebar
3. Click **New Query**

### Step 2: Run the Schema
1. Copy the contents of `supabase-income-sources-schema.sql`
2. Paste into the SQL editor
3. Click **Run** or press `Ctrl+Enter`

### Step 3: Verify Table Creation
Run this query to verify:
```sql
SELECT * FROM income_sources LIMIT 1;
```

You should see the table structure (even if empty).

### Step 4: Check RLS Policies
Run this query:
```sql
SELECT * FROM pg_policies WHERE tablename = 'income_sources';
```

You should see 4 policies (SELECT, INSERT, UPDATE, DELETE).

## 📋 What Gets Created

### Table: `income_sources`
- Stores all user income data
- 12 columns including timestamps
- User-specific via `user_id` foreign key

### Indexes (3)
- `idx_income_sources_user_id` - For user queries
- `idx_income_sources_is_recurring` - For filtering
- `idx_income_sources_category` - For categorization

### RLS Policies (4)
- View own income: `SELECT` policy
- Add own income: `INSERT` policy  
- Edit own income: `UPDATE` policy
- Delete own income: `DELETE` policy

### Trigger (1)
- `update_income_sources_timestamp` - Auto-updates `updated_at`

## 🔐 Security Features

### Automatic Protection
✅ Users can't see other users' income
✅ Users can't modify other users' income
✅ All queries filtered by authenticated user
✅ No manual user_id needed in queries

### How It Works
```sql
-- When you query:
SELECT * FROM income_sources;

-- Supabase automatically adds:
SELECT * FROM income_sources WHERE user_id = auth.uid();
```

## 🧪 Testing the Setup

### Test 1: Insert Data
Try adding an income source through the UI. It should:
- Save to database
- Persist after refresh
- Only be visible to you

### Test 2: Query Directly
In SQL Editor:
```sql
SELECT 
  name,
  amount,
  frequency,
  category,
  is_recurring
FROM income_sources
ORDER BY created_at DESC;
```

### Test 3: Check RLS
Try querying as different user - you shouldn't see other users' data.

## 🔧 Troubleshooting

### Issue: "Table already exists"
**Solution**: The table is already created, skip to Step 3.

### Issue: "Permission denied"
**Solution**: 
1. Check if you're authenticated
2. Verify RLS policies are created
3. Re-run the RLS policy section

### Issue: "Foreign key constraint"
**Solution**: Ensure `auth.users` table exists (default in Supabase).

### Issue: Data not saving
**Solution**:
1. Check browser console for errors
2. Verify Supabase connection in `.env`
3. Check if user is authenticated
4. Try localStorage fallback (works without auth)

## 🌐 Environment Variables

Make sure these are set in your `.env.local`:
```env
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

## 💾 Fallback Mode (LocalStorage)

If Supabase is not configured:
- ✅ App still works
- ✅ Data saved to browser localStorage
- ⚠️ Data only on current device
- ⚠️ Cleared if browser cache cleared

## 📊 Data Structure Reference

```typescript
{
  id: "1234567890",                    // Unique ID
  user_id: "auth-user-uuid",           // Supabase user ID
  name: "Google Salary",               // Income name
  amount: 8000.00,                     // Dollar amount
  frequency: "monthly",                // Payment frequency
  category: "salary",                  // Income type
  connected_account: "account-id",     // Bank account ID
  is_recurring: true,                  // Recurring or one-time
  next_payment_date: "2025-01-31",    // Optional next payment
  notes: "Main job income",            // Optional notes
  color: "#10b981",                    // Visual color
  created_at: "2025-01-15T10:30:00Z", // Auto-generated
  updated_at: "2025-01-15T10:30:00Z"  // Auto-updated
}
```

## 🚀 Migration from LocalStorage

If you have data in localStorage and want to migrate to Supabase:

1. Export from localStorage:
```javascript
const data = localStorage.getItem('incomeSources');
console.log(data);
```

2. Save the output
3. Set up Supabase
4. Re-add income sources through UI (they'll save to Supabase)

## 📈 Monitoring

### Check Table Size
```sql
SELECT COUNT(*) as total_income_sources 
FROM income_sources;
```

### Check By User
```sql
SELECT 
  COUNT(*) as count,
  user_id 
FROM income_sources 
GROUP BY user_id;
```

### Check Recent Activity
```sql
SELECT 
  name,
  amount,
  created_at,
  updated_at
FROM income_sources
ORDER BY updated_at DESC
LIMIT 10;
```

## ✅ Setup Complete!

Once you see the success message after running the SQL:
- ✅ Table is ready
- ✅ Security is enabled
- ✅ Indexes are optimized
- ✅ Triggers are active

You can now use the Income Tracking feature with full database persistence!

## 🆘 Need Help?

1. Check the main documentation: `INCOME_TRACKING_SYSTEM.md`
2. Review the quick start: `INCOME_TRACKING_QUICK_START.md`
3. Verify your Supabase connection
4. Check browser console for errors
5. Try the localStorage fallback first

---

**Database Status**: Ready ✅
**Security**: Enabled ✅  
**Performance**: Optimized ✅
