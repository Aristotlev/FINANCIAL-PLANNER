# ✅ Pricing System Implementation Checklist

## Phase 1: Database Setup ⏱️ ~15 minutes

- [ ] **Open Supabase Dashboard**
  - Go to your project
  - Navigate to SQL Editor

- [ ] **Run Database Schema**
  - [ ] Copy content from `supabase-user-subscriptions-schema.sql`
  - [ ] Paste into new SQL query
  - [ ] Click "Run"
  - [ ] Verify no errors

- [ ] **Verify Tables Created**
  ```sql
  SELECT tablename FROM pg_tables 
  WHERE schemaname = 'public' 
  AND tablename IN ('user_subscriptions', 'user_usage', 'plan_limits');
  ```
  - [ ] Should return 3 rows

- [ ] **Verify RLS Enabled**
  ```sql
  SELECT tablename, rowsecurity 
  FROM pg_tables 
  WHERE schemaname = 'public' 
  AND tablename IN ('user_subscriptions', 'user_usage', 'plan_limits');
  ```
  - [ ] All should show `rowsecurity = true`

- [ ] **Verify Functions Created**
  ```sql
  SELECT routine_name FROM information_schema.routines 
  WHERE routine_schema = 'public' 
  AND routine_name LIKE 'can_%';
  ```
  - [ ] Should show `can_add_entry`, `can_make_ai_call`

- [ ] **Test Auto Trial Creation**
  - [ ] Sign up a new test user
  - [ ] Check `user_subscriptions` table
  - [ ] Verify trial subscription created with 7-day expiry

---

## Phase 2: Test Subscription System ⏱️ ~10 minutes

- [ ] **Test Current Subscription**
  ```typescript
  const subscription = await SubscriptionService.getCurrentSubscription();
  console.log(subscription);
  ```
  - [ ] Should return subscription object
  - [ ] Plan should be 'FREE_TRIAL'
  - [ ] Status should be 'TRIAL'

- [ ] **Test Entry Limits**
  ```typescript
  for (let i = 0; i < 11; i++) {
    const result = await SubscriptionService.canAddEntry('cash');
    console.log(`Entry ${i + 1}: ${result.canProceed ? '✅' : '❌'}`);
    if (result.canProceed) {
      await SubscriptionService.incrementEntryCount('cash');
    }
  }
  ```
  - [ ] First 10 should pass ✅
  - [ ] 11th should fail ❌

- [ ] **Test AI Limits**
  ```typescript
  for (let i = 0; i < 21; i++) {
    const result = await SubscriptionService.canMakeAICall();
    console.log(`AI Call ${i + 1}: ${result.canProceed ? '✅' : '❌'}`);
    if (result.canProceed) {
      await SubscriptionService.incrementAICallCount();
    }
  }
  ```
  - [ ] First 20 should pass ✅
  - [ ] 21st should fail ❌

- [ ] **Test Usage Reset**
  - [ ] Wait until next day (or manually change date in DB)
  - [ ] Verify usage counters reset to 0

---

## Phase 3: Add Pricing Page ⏱️ ~5 minutes

- [ ] **Create Pricing Route**
  - [ ] Create file: `app/pricing/page.tsx`
  - [ ] Copy content from examples
  - [ ] Test: Navigate to `/pricing`
  - [ ] Verify all 3 plans display

- [ ] **Add to Navigation**
  - [ ] Add "Pricing" link to nav menu
  - [ ] Verify link works
  - [ ] Check mobile responsive view

- [ ] **Test Pricing Interactions**
  - [ ] Click "Upgrade Now" buttons
  - [ ] Verify upgrade confirmation appears
  - [ ] Check feature comparison table

---

## Phase 4: Integrate Into Cards ⏱️ ~30 minutes per card

### Cash Card

- [ ] **Import Dependencies**
  ```typescript
  import { useSubscriptionGuard } from '@/hooks/use-subscription';
  import UpgradeModal from '@/components/pricing/upgrade-modal';
  ```

- [ ] **Add Hook**
  ```typescript
  const { guardEntry, upgradePrompt } = useSubscriptionGuard('cash');
  ```

- [ ] **Wrap Add Function**
  ```typescript
  const handleAddAccount = () => {
    guardEntry(async () => {
      // Existing add logic
    });
  };
  ```

- [ ] **Add Upgrade Modal**
  ```typescript
  <UpgradeModal
    isOpen={upgradePrompt.showUpgradeModal}
    onClose={upgradePrompt.closeUpgradeModal}
    reason={upgradePrompt.upgradeReason}
    {...upgradePrompt.upgradeContext}
  />
  ```

- [ ] **Test**
  - [ ] Add 10 entries
  - [ ] Try to add 11th
  - [ ] Verify upgrade modal shows

### Repeat for Other Cards

- [ ] **Crypto Card** (`card_type: 'crypto'`)
- [ ] **Stocks Card** (`card_type: 'stocks'`)
- [ ] **Real Estate Card** (`card_type: 'real_estate'`)
- [ ] **Valuable Items Card** (`card_type: 'valuable_items'`)
- [ ] **Savings Card** (`card_type: 'savings'`)
- [ ] **Expenses Card** (`card_type: 'expenses'`)
- [ ] **Debt Card** (`card_type: 'debt'`)
- [ ] **Trading Accounts Card** (`card_type: 'trading_accounts'`)

---

## Phase 5: Protect AI Assistant ⏱️ ~15 minutes

- [ ] **Import Hook**
  ```typescript
  import { useAILimit } from '@/hooks/use-subscription';
  ```

- [ ] **Add Hook**
  ```typescript
  const { makeCall, callsRemaining, limitInfo } = useAILimit();
  ```

- [ ] **Guard AI Calls**
  ```typescript
  const handleSendMessage = async (message: string) => {
    const allowed = await makeCall();
    if (!allowed) {
      showUpgradeModal();
      return;
    }
    // Proceed with AI call
  };
  ```

- [ ] **Show Remaining Calls**
  ```typescript
  <div className="text-sm text-gray-500">
    {callsRemaining} AI calls remaining today
  </div>
  ```

- [ ] **Test**
  - [ ] Make 20 AI calls
  - [ ] Verify 21st shows upgrade modal
  - [ ] Check remaining count displays

---

## Phase 6: Add Subscription Dashboard ⏱️ ~10 minutes

- [ ] **Create Route**
  - [ ] Create: `app/account/subscription/page.tsx`
  - [ ] Import: `SubscriptionDashboard`
  - [ ] Test: Navigate to `/account/subscription`

- [ ] **Verify Dashboard Shows**
  - [ ] Current plan
  - [ ] Trial countdown (if applicable)
  - [ ] Usage metrics
  - [ ] Progress bars
  - [ ] Upgrade CTA

- [ ] **Add Link in Settings**
  - [ ] Add "My Subscription" link
  - [ ] Test navigation

---

## Phase 7: Polish & UX ⏱️ ~20 minutes

- [ ] **Show Usage Warnings**
  ```typescript
  {limits.entries.percentage >= 80 && (
    <Alert>
      You've used {limits.entries.current} of {limits.entries.max} entries
    </Alert>
  )}
  ```

- [ ] **Disable Buttons at Limit**
  ```typescript
  <button disabled={!canAdd}>
    {canAdd ? 'Add Entry' : 'Limit Reached'}
  </button>
  ```

- [ ] **Add Tooltips**
  - [ ] Explain why button is disabled
  - [ ] Show remaining quota on hover

- [ ] **Trial Countdown Banner**
  ```typescript
  {isTrialActive && (
    <Banner>
      {daysRemainingInTrial} days left in trial
    </Banner>
  )}
  ```

- [ ] **Success Messages**
  - [ ] "Upgrade successful!"
  - [ ] "Subscription updated"
  - [ ] "Cancellation confirmed"

---

## Phase 8: Testing ⏱️ ~30 minutes

### Functional Tests

- [ ] **New User Flow**
  - [ ] Sign up new user
  - [ ] Verify trial created
  - [ ] Check trial expiry date
  - [ ] Add entries (should allow 10)
  - [ ] Try 11th entry (should block)

- [ ] **Limit Enforcement**
  - [ ] Test each card type limit
  - [ ] Test AI call limit
  - [ ] Verify upgrade modal shows
  - [ ] Check error messages clear

- [ ] **Upgrade Flow**
  - [ ] Click "Upgrade Now"
  - [ ] Navigate to pricing page
  - [ ] Select plan
  - [ ] Verify confirmation
  - [ ] Check limits increased

- [ ] **Usage Reset**
  - [ ] Add entries
  - [ ] Wait for next day
  - [ ] Verify usage reset
  - [ ] Can add entries again

### Edge Cases

- [ ] **Offline Mode**
  - [ ] Disconnect internet
  - [ ] Verify app works with fallbacks
  - [ ] Check localStorage used

- [ ] **Concurrent Users**
  - [ ] Create 2 test users
  - [ ] Verify separate usage tracking
  - [ ] Check RLS isolation

- [ ] **Rapid Clicks**
  - [ ] Click add button rapidly
  - [ ] Verify counter accurate
  - [ ] No race conditions

---

## Phase 9: Stripe Integration (Optional) ⏱️ ~2 hours

- [ ] **Setup Stripe Account**
  - [ ] Create Stripe account
  - [ ] Get API keys
  - [ ] Create products

- [ ] **Create Products**
  - [ ] Basic Plan product ($4.99/month)
  - [ ] Pro Plan product ($9.99/month)
  - [ ] Copy price IDs

- [ ] **Environment Variables**
  ```env
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_xxx
  STRIPE_SECRET_KEY=sk_xxx
  STRIPE_WEBHOOK_SECRET=whsec_xxx
  STRIPE_BASIC_PRICE_ID=price_xxx
  STRIPE_PRO_PRICE_ID=price_yyy
  ```

- [ ] **Create Checkout API**
  - [ ] Create: `app/api/create-checkout-session/route.ts`
  - [ ] Implement checkout session creation
  - [ ] Test with Stripe test mode

- [ ] **Add Webhook Handler**
  - [ ] Create: `app/api/webhooks/stripe/route.ts`
  - [ ] Handle: `checkout.session.completed`
  - [ ] Handle: `customer.subscription.updated`
  - [ ] Handle: `customer.subscription.deleted`

- [ ] **Test Checkout**
  - [ ] Click upgrade button
  - [ ] Complete test payment
  - [ ] Verify subscription updated
  - [ ] Check webhook received

---

## Phase 10: Monitoring & Analytics ⏱️ ~1 hour

- [ ] **Add Analytics Events**
  ```typescript
  // Track upgrade clicks
  analytics.track('upgrade_clicked', { from_plan, to_plan });
  
  // Track limit hits
  analytics.track('limit_reached', { card_type, current_plan });
  ```

- [ ] **Create Dashboard Queries**
  - [ ] Active users by plan
  - [ ] Conversion rate (trial → paid)
  - [ ] Average usage per user
  - [ ] Revenue metrics

- [ ] **Set Up Alerts**
  - [ ] Trial expiring tomorrow
  - [ ] Payment failed
  - [ ] High limit hit rate

---

## Phase 11: Documentation ⏱️ ~30 minutes

- [ ] **Update README**
  - [ ] Add pricing section
  - [ ] Link to pricing docs
  - [ ] Show plan comparison

- [ ] **Create User Guide**
  - [ ] How to upgrade
  - [ ] How to cancel
  - [ ] What happens after trial

- [ ] **Internal Docs**
  - [ ] Database schema explanation
  - [ ] API reference
  - [ ] Troubleshooting guide

---

## Phase 12: Deployment ⏱️ ~30 minutes

- [ ] **Pre-Deployment Checks**
  - [ ] All tests passing
  - [ ] No console errors
  - [ ] Mobile responsive
  - [ ] Dark mode working

- [ ] **Deploy to Production**
  - [ ] Build succeeds
  - [ ] Environment variables set
  - [ ] Database migrations run
  - [ ] RLS policies active

- [ ] **Post-Deployment Verification**
  - [ ] Test signup flow
  - [ ] Test limit enforcement
  - [ ] Test upgrade flow
  - [ ] Monitor error logs

- [ ] **Rollout Plan**
  - [ ] Enable for 10% of users
  - [ ] Monitor for issues
  - [ ] Increase to 50%
  - [ ] Full rollout

---

## 🎉 Launch Checklist

- [ ] Database schema applied ✅
- [ ] All cards integrated ✅
- [ ] AI assistant protected ✅
- [ ] Pricing page live ✅
- [ ] Subscription dashboard working ✅
- [ ] Usage tracking accurate ✅
- [ ] Upgrade flow tested ✅
- [ ] Stripe integrated (optional) ✅
- [ ] Analytics tracking ✅
- [ ] Documentation complete ✅
- [ ] Production tested ✅

---

## 📊 Success Metrics

Track these after launch:

- **Trial Conversion Rate**: Target >20%
- **Average Revenue Per User (ARPU)**: Track monthly
- **Churn Rate**: Target <5% monthly
- **Limit Hit Rate**: % users hitting limits
- **Upgrade Response Time**: How fast users upgrade after hitting limit

---

## 🆘 Support Resources

If issues arise:

1. Check `PRICING_SYSTEM_IMPLEMENTATION.md`
2. Review `PRICING_QUICK_START.md`
3. Inspect `PRICING_ARCHITECTURE.md`
4. Query database with provided SQL
5. Check Supabase logs
6. Review error messages

---

**Ready to launch! 🚀**

Time estimate: **4-6 hours total** (excluding Stripe integration)

Good luck! 💪
