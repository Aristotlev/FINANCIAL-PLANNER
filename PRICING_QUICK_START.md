# 🚀 Quick Start Guide - Pricing System Integration

## Step-by-Step Integration

### Step 1: Apply Database Schema

```bash
# In Supabase Dashboard:
# 1. Go to SQL Editor
# 2. Create new query
# 3. Copy content from supabase-user-subscriptions-schema.sql
# 4. Click "Run"
```

Verify tables created:
```sql
SELECT tablename FROM pg_tables WHERE schemaname = 'public' 
AND tablename IN ('user_subscriptions', 'user_usage', 'plan_limits');
```

---

### Step 2: Test with a New User

```typescript
// Test signup creates trial subscription
// Sign up a new user, then check:

// In Supabase Table Editor → user_subscriptions
// You should see:
// - plan: FREE_TRIAL
// - status: TRIAL
// - trial_end_date: 7 days from now
```

---

### Step 3: Add to Existing Component (Example: Cash Card)

**Before:**
```typescript
// components/financial/cash-card.tsx
function CashCard() {
  const handleAddAccount = async () => {
    // Directly add account
    await saveCashAccount(newAccount);
  };

  return (
    <button onClick={handleAddAccount}>
      Add Cash Account
    </button>
  );
}
```

**After (with limits):**
```typescript
// components/financial/cash-card.tsx
import { useSubscriptionGuard } from '@/hooks/use-subscription';
import UpgradeModal from '@/components/pricing/upgrade-modal';

function CashCard() {
  const { guardEntry, upgradePrompt } = useSubscriptionGuard('cash');

  const handleAddAccount = () => {
    guardEntry(async () => {
      // This only runs if user hasn't hit limit
      await saveCashAccount(newAccount);
      showSuccessToast('Account added!');
    });
    // If limit hit, upgrade modal shows automatically
  };

  return (
    <>
      <button onClick={handleAddAccount}>
        Add Cash Account
      </button>
      
      <UpgradeModal
        isOpen={upgradePrompt.showUpgradeModal}
        onClose={upgradePrompt.closeUpgradeModal}
        reason={upgradePrompt.upgradeReason}
        feature={upgradePrompt.upgradeContext.feature}
        currentLimit={upgradePrompt.upgradeContext.currentLimit}
        upgradeLimit={upgradePrompt.upgradeContext.upgradeLimit}
        onUpgrade={(plan) => {
          // Redirect to pricing page or Stripe checkout
          router.push('/pricing');
        }}
      />
    </>
  );
}
```

---

### Step 4: Add to AI Assistant

**Before:**
```typescript
// components/ui/ai-chat.tsx
const handleSendMessage = async (message: string) => {
  const response = await fetch('/api/ai-chat', {
    method: 'POST',
    body: JSON.stringify({ message }),
  });
  // Process response
};
```

**After (with limits):**
```typescript
// components/ui/ai-chat.tsx
import { useAILimit } from '@/hooks/use-subscription';

const { makeCall, callsRemaining, limitInfo } = useAILimit();

const handleSendMessage = async (message: string) => {
  // Check limit before API call
  const allowed = await makeCall();
  
  if (!allowed) {
    setShowUpgradeModal(true);
    return;
  }

  const response = await fetch('/api/ai-chat', {
    method: 'POST',
    body: JSON.stringify({ message }),
  });
  // Process response
};

// Show remaining calls in UI
<div className="text-sm text-gray-500">
  AI Calls Remaining Today: {callsRemaining}
</div>
```

---

### Step 5: Add Pricing Page

Create a new page:

```typescript
// app/pricing/page.tsx
import PricingSection from '@/components/pricing/pricing-section';

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 py-12">
        <PricingSection />
      </div>
    </div>
  );
}
```

Add link to navigation:
```typescript
// components/navigation.tsx
<Link href="/pricing">Pricing</Link>
```

---

### Step 6: Add Subscription Dashboard

Create account settings page:

```typescript
// app/account/subscription/page.tsx
import SubscriptionDashboard from '@/components/pricing/subscription-dashboard';

export default function SubscriptionPage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">My Subscription</h1>
        <SubscriptionDashboard />
      </div>
    </div>
  );
}
```

---

## 🎯 Integration Patterns

### Pattern 1: Simple Guard (Recommended)

```typescript
const { guardEntry } = useSubscriptionGuard('crypto');

guardEntry(async () => {
  // Your existing add logic here
  await addCryptoHolding(data);
});
```

### Pattern 2: Manual Check

```typescript
const { canAdd, addEntry } = useEntryLimit('stocks');

const handleAdd = async () => {
  if (!canAdd) {
    setShowUpgrade(true);
    return;
  }
  
  await addStockHolding(data);
  await addEntry(); // Record the entry
};
```

### Pattern 3: Pre-check

```typescript
const { checkLimit } = useEntryLimit('real_estate');

// Check on component mount
useEffect(() => {
  const checkLimits = async () => {
    const allowed = await checkLimit();
    if (!allowed) {
      setShowLimitWarning(true);
    }
  };
  checkLimits();
}, []);
```

---

## 🔥 Real-World Examples

### Example 1: Crypto Holdings Card

```typescript
// components/financial/crypto-card.tsx
import { useSubscriptionGuard } from '@/hooks/use-subscription';
import UpgradeModal from '@/components/pricing/upgrade-modal';

export function CryptoCard() {
  const { guardEntry, upgradePrompt } = useSubscriptionGuard('crypto');

  const handleAddHolding = (holding: CryptoHolding) => {
    guardEntry(async () => {
      await SupabaseDataService.saveCryptoHolding(holding);
      setHoldings([...holdings, holding]);
      setShowModal(false);
      toast.success('Crypto holding added!');
    });
  };

  return (
    <>
      <Card>
        <button onClick={() => setShowModal(true)}>
          Add Crypto
        </button>
        {/* Rest of card UI */}
      </Card>

      <UpgradeModal
        isOpen={upgradePrompt.showUpgradeModal}
        onClose={upgradePrompt.closeUpgradeModal}
        reason={upgradePrompt.upgradeReason}
        {...upgradePrompt.upgradeContext}
        onUpgrade={(plan) => window.location.href = '/pricing'}
      />
    </>
  );
}
```

### Example 2: AI Assistant

```typescript
// components/ui/ai-chat.tsx
import { useAILimit } from '@/hooks/use-subscription';

export function AIChatAssistant() {
  const { makeCall, callsRemaining, limitInfo } = useAILimit();
  const [showUpgrade, setShowUpgrade] = useState(false);

  const handleSend = async (message: string) => {
    const allowed = await makeCall();
    
    if (!allowed) {
      setShowUpgrade(true);
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: `⚠️ You've reached your daily limit of ${limitInfo?.maxAllowed} AI calls. Upgrade to Pro for 5x more calls!`
      }]);
      return;
    }

    // Proceed with AI call
    const response = await geminiService.processMessage(message);
    setMessages(prev => [...prev, response]);
  };

  return (
    <div>
      {/* Chat UI */}
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <Sparkles className="w-4 h-4" />
        <span>{callsRemaining} AI calls remaining today</span>
      </div>

      <UpgradeModal
        isOpen={showUpgrade}
        onClose={() => setShowUpgrade(false)}
        reason={limitInfo?.reason || 'AI call limit reached'}
        feature="AI calls"
        currentLimit={20}
        upgradeLimit={100}
      />
    </div>
  );
}
```

### Example 3: Expenses Card

```typescript
// components/financial/expenses-card.tsx
import { useEntryLimit } from '@/hooks/use-subscription';

export function ExpensesCard() {
  const { canAdd, addEntry, limitInfo } = useEntryLimit('expenses');
  const [showUpgrade, setShowUpgrade] = useState(false);

  const handleAddExpense = async (expense: Expense) => {
    if (!canAdd) {
      setShowUpgrade(true);
      return;
    }

    await SupabaseDataService.saveExpense(expense);
    await addEntry();
    
    toast.success('Expense added!');
  };

  return (
    <>
      <button 
        onClick={() => setShowAddModal(true)}
        disabled={!canAdd}
        title={!canAdd ? 'Daily limit reached' : 'Add expense'}
      >
        {canAdd ? 'Add Expense' : '🔒 Limit Reached'}
      </button>

      {!canAdd && (
        <div className="mt-2 text-sm text-orange-600 dark:text-orange-400">
          💡 Upgrade to add more expenses today
        </div>
      )}
    </>
  );
}
```

---

## 🎨 UI/UX Best Practices

### 1. Show Remaining Quota

```typescript
const { usage, limits } = useUsage();

<div className="text-sm text-gray-500">
  {limits.entries.current}/{limits.entries.max} entries used today
</div>
```

### 2. Disable Buttons Near Limit

```typescript
const { canAdd, limitInfo } = useEntryLimit('stocks');

<button 
  disabled={!canAdd}
  className={!canAdd ? 'opacity-50 cursor-not-allowed' : ''}
>
  {canAdd ? 'Add Stock' : `Limit Reached (${limitInfo?.maxAllowed})`}
</button>
```

### 3. Progressive Disclosure

```typescript
// Show warning at 80% usage
{limits.entries.percentage >= 80 && (
  <Alert variant="warning">
    You've used {limits.entries.current} of {limits.entries.max} entries today.
    Upgrade for more capacity!
  </Alert>
)}
```

### 4. Upgrade CTA in Card Header

```typescript
{subscription?.plan !== 'PRO' && (
  <button className="text-sm text-purple-600">
    ⚡ Upgrade to Pro
  </button>
)}
```

---

## 🧪 Testing Your Integration

### Test Checklist

- [ ] Add 10 entries to a card → 11th blocked
- [ ] Make 20 AI calls → 21st blocked
- [ ] Upgrade modal appears on limit
- [ ] Pricing page loads correctly
- [ ] Subscription dashboard shows data
- [ ] Trial countdown displays
- [ ] Usage resets next day

### Test Script

```typescript
// test-subscription-limits.ts
async function testLimits() {
  const service = SubscriptionService;
  
  // Test entry limit
  for (let i = 0; i < 11; i++) {
    const canAdd = await service.canAddEntry('cash');
    console.log(`Entry ${i + 1}: ${canAdd.canProceed ? '✅' : '❌'}`);
    
    if (canAdd.canProceed) {
      await service.incrementEntryCount('cash');
    }
  }
  
  // Test AI limit
  for (let i = 0; i < 21; i++) {
    const canCall = await service.canMakeAICall();
    console.log(`AI Call ${i + 1}: ${canCall.canProceed ? '✅' : '❌'}`);
    
    if (canCall.canProceed) {
      await service.incrementAICallCount();
    }
  }
}
```

---

## 🚀 Go Live Checklist

- [ ] Database schema applied
- [ ] Environment variables set
- [ ] Pricing page accessible
- [ ] All cards integrated
- [ ] AI assistant protected
- [ ] Upgrade modals working
- [ ] Subscription dashboard live
- [ ] Analytics tracking setup
- [ ] Error monitoring enabled
- [ ] User documentation created

---

## 💡 Pro Tips

1. **Fail Open**: If limit check fails, allow the action (better UX)
2. **Cache Limits**: Use `useMemo` to cache limit checks
3. **Optimistic UI**: Show entries immediately, revert if limit hit
4. **Clear Messaging**: Explain why limit reached, how to upgrade
5. **Soft Limits**: Show warnings at 80%, hard block at 100%

---

**You're all set! 🎉**

The pricing system is ready to use. Start integrating it into your components following the examples above!
