# 🎨 Pricing System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                        USER INTERACTION                          │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
        ┌─────────────────────────────────────────┐
        │        Financial Cards (UI Layer)       │
        │  ┌──────────┬──────────┬──────────┐    │
        │  │   Cash   │  Crypto  │  Stocks  │    │
        │  │   Card   │   Card   │   Card   │    │
        │  └────┬─────┴────┬─────┴────┬─────┘    │
        └───────┼──────────┼──────────┼───────────┘
                │          │          │
                │  "Add Entry" clicked │
                │          │          │
                ▼          ▼          ▼
        ┌────────────────────────────────────┐
        │   useSubscriptionGuard Hook        │
        │   (hooks/use-subscription.ts)      │
        │                                    │
        │   guardEntry(() => {               │
        │     // User's add logic            │
        │   })                               │
        └────────────┬───────────────────────┘
                     │
                     ▼
        ┌────────────────────────────────────┐
        │   Subscription Service             │
        │   (lib/subscription-service.ts)    │
        │                                    │
        │   canAddEntry(cardType)            │
        │   incrementEntryCount(cardType)    │
        └────────────┬───────────────────────┘
                     │
                     ▼
        ┌────────────────────────────────────┐
        │      Supabase Database             │
        │                                    │
        │   ┌─────────────────────────┐     │
        │   │  user_subscriptions     │     │
        │   │  - plan (FREE/BASIC/PRO)│     │
        │   │  - status (TRIAL/ACTIVE)│     │
        │   │  - trial_end_date       │     │
        │   └─────────────────────────┘     │
        │                                    │
        │   ┌─────────────────────────┐     │
        │   │  user_usage             │     │
        │   │  - date (today)         │     │
        │   │  - cash_entries_count   │     │
        │   │  - crypto_entries_count │     │
        │   │  - ai_calls_count       │     │
        │   └─────────────────────────┘     │
        │                                    │
        │   ┌─────────────────────────┐     │
        │   │  plan_limits            │     │
        │   │  - max_entries_per_card │     │
        │   │  - max_ai_calls_per_day │     │
        │   └─────────────────────────┘     │
        │                                    │
        │   Postgres Functions:              │
        │   - can_add_entry()                │
        │   - increment_entry_count()        │
        │   - can_make_ai_call()             │
        │   - increment_ai_call_count()      │
        └────────────┬───────────────────────┘
                     │
                     ▼
        ┌────────────────────────────────────┐
        │        Decision Point              │
        │                                    │
        │   Limit Reached?                   │
        │   ├─ NO → Allow action             │
        │   └─ YES → Show upgrade modal      │
        └────────────┬───────────────────────┘
                     │
                     ▼
        ┌────────────────────────────────────┐
        │     Upgrade Modal (if needed)      │
        │  (components/pricing/upgrade-modal)│
        │                                    │
        │  "You've reached your limit"       │
        │  [Current: 10] → [Upgrade: 50]     │
        │                                    │
        │  [Maybe Later]  [Upgrade Now]      │
        └────────────┬───────────────────────┘
                     │
                     ▼
        ┌────────────────────────────────────┐
        │       Pricing Page                 │
        │  (components/pricing/pricing-      │
        │   section.tsx)                     │
        │                                    │
        │  ┌──────┐ ┌──────┐ ┌──────┐       │
        │  │ FREE │ │BASIC │ │ PRO  │       │
        │  │TRIAL │ │$4.99 │ │$9.99 │       │
        │  └──────┘ └──────┘ └──────┘       │
        └────────────┬───────────────────────┘
                     │
                     ▼
        ┌────────────────────────────────────┐
        │    Stripe Checkout (Future)        │
        │                                    │
        │   → Create subscription            │
        │   → Update user_subscriptions      │
        │   → Unlock higher limits           │
        └────────────────────────────────────┘
```

---

## 🔄 Data Flow Examples

### Example 1: Adding a Cash Account

```
User clicks "Add Cash Account"
          ↓
guardEntry() hook intercepts
          ↓
Calls: canAddEntry('cash')
          ↓
Query: user_subscriptions → Get plan (BASIC)
Query: plan_limits → Get max (10)
Query: user_usage → Get today's count (5)
          ↓
Check: 5 < 10? ✅ YES
          ↓
Execute: User's add logic
          ↓
Call: incrementEntryCount('cash')
          ↓
Update: user_usage.cash_entries_count = 6
          ↓
Success! Entry added ✅
```

### Example 2: Hitting the Limit

```
User clicks "Add Stock"
          ↓
guardEntry() hook intercepts
          ↓
Calls: canAddEntry('stocks')
          ↓
Query: user_subscriptions → Get plan (FREE_TRIAL)
Query: plan_limits → Get max (10)
Query: user_usage → Get today's count (10)
          ↓
Check: 10 < 10? ❌ NO
          ↓
Block: User's add logic NOT executed
          ↓
Show: UpgradeModal
       "You've reached your limit of 10 entries"
       "Upgrade to Pro for 50 entries"
          ↓
User clicks "Upgrade Now"
          ↓
Redirect: /pricing page
```

### Example 3: AI Assistant Call

```
User sends message to AI
          ↓
useAILimit() hook checks
          ↓
Calls: canMakeAICall()
          ↓
Query: user_subscriptions → Get plan (PRO)
Query: plan_limits → Get max (100)
Query: user_usage → Get today's count (45)
          ↓
Check: 45 < 100? ✅ YES
          ↓
Execute: AI API call
          ↓
Call: incrementAICallCount()
          ↓
Update: user_usage.ai_calls_count = 46
          ↓
Display: "54 AI calls remaining today"
```

---

## 📊 State Diagram

```
┌─────────────┐
│  NEW USER   │
└──────┬──────┘
       │
       │ Signup
       ▼
┌─────────────────┐
│  FREE TRIAL     │◄──────────┐
│  (7 days)       │           │
│  - 10 entries   │           │
│  - 20 AI calls  │           │
└──────┬──────────┘           │
       │                      │
       │ Trial Expires        │ Downgrade
       ▼                      │
┌─────────────────┐           │
│  TRIAL EXPIRED  │           │
│  (Read-only)    │           │
└──────┬──────────┘           │
       │                      │
       │ Upgrade              │
       ▼                      │
┌─────────────────┐           │
│  BASIC PLAN     │           │
│  $4.99/month    │           │
│  - 10 entries   │           │
│  - 20 AI calls  │           │
└──────┬──────────┘           │
       │                      │
       │ Upgrade              │
       ▼                      │
┌─────────────────┐           │
│   PRO PLAN      │           │
│  $9.99/month    │           │
│  - 50 entries   │───────────┘
│  - 100 AI calls │
│  - Analytics    │
│  - Priority     │
└─────────────────┘
       │
       │ Cancel
       ▼
┌─────────────────┐
│   CANCELLED     │
│  (Active until  │
│   period end)   │
└─────────────────┘
```

---

## 🎯 Component Hierarchy

```
App Root
│
├── Navigation
│   └── Link to /pricing
│
├── Financial Dashboard
│   ├── Cash Card
│   │   ├── useSubscriptionGuard('cash')
│   │   └── UpgradeModal
│   │
│   ├── Crypto Card
│   │   ├── useSubscriptionGuard('crypto')
│   │   └── UpgradeModal
│   │
│   ├── Stocks Card
│   │   ├── useSubscriptionGuard('stocks')
│   │   └── UpgradeModal
│   │
│   └── ... (other cards)
│
├── AI Chat Assistant
│   ├── useAILimit()
│   └── UpgradeModal
│
├── Pricing Page (/pricing)
│   └── PricingSection
│       ├── PricingCard (Free Trial)
│       ├── PricingCard (Basic)
│       ├── PricingCard (Pro)
│       └── Comparison Table
│
└── Account Settings (/account/subscription)
    └── SubscriptionDashboard
        ├── Current Plan Display
        ├── Usage Metrics
        └── Upgrade CTA
```

---

## 🔐 Security Flow

```
┌──────────────────┐
│  User Action     │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│  React Hook      │
│  (Client-side    │
│   check)         │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│  Subscription    │
│  Service         │
│  (Client lib)    │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│  Supabase RPC    │
│  Function Call   │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│  Postgres        │
│  Function        │
│  (Server-side    │
│   validation)    │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│  RLS Policy      │
│  Check           │
│  (User can only  │
│   see their data)│
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│  Database Query  │
│  Execute         │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│  Result          │
│  (Allowed/Denied)│
└──────────────────┘
```

**Key Security Features:**
- ✅ Client-side checks (fast UX)
- ✅ Server-side validation (security)
- ✅ RLS policies (data isolation)
- ✅ Postgres functions (cannot bypass)

---

## 📈 Scaling Considerations

### Current Architecture (0-10K users)
- ✅ Direct Supabase queries
- ✅ RLS policies enforce limits
- ✅ Daily usage resets automatic

### Medium Scale (10K-100K users)
- Consider: Redis cache for limits
- Add: API rate limiting
- Implement: Batch usage updates

### Large Scale (100K+ users)
- Use: Dedicated service for limits
- Add: Queue for usage updates
- Implement: Sharding by user

---

This visual guide should help you understand how all the pieces fit together! 🎉
