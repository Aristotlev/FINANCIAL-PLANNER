# 🔑 How to Get Your Gemini API Key

## Quick Steps:

1. **Go to Google AI Studio:**
   ```
   https://aistudio.google.com/app/apikey
   ```

2. **Sign in** with your Google account

3. **Click "Create API Key"**

4. **Choose your Google Cloud project** (or create a new one)

5. **Copy the API key** - it will look like:
   ```
   AIzaSyAbCdEf1234567890_ExampleKey123456789
   ```

6. **Update your `.env.local`:**
   ```bash
   GOOGLE_AI_API_KEY=AIzaSy... # Paste your actual key here
   ```

7. **Restart your dev server:**
   ```bash
   npm run dev
   ```

---

## 🚨 Important Notes:

### Your Current Key is INVALID:
```
❌ gen-lang-client-0487355572
```

This is NOT a Google AI API key format. Valid keys:
- ✅ Start with `AIza`
- ✅ Are about 39 characters long
- ✅ Contain alphanumeric characters and some symbols

### What the Error Means:
```
[403 Forbidden] Method doesn't allow unregistered callers
```

This means Google is rejecting your current key because it's not a valid Gemini API key.

---

## 💰 Pricing (Free Tier):

- **Free quota:** 60 requests per minute
- **Cost:** $0 for moderate usage
- **Perfect for:** Development and personal projects

---

## 🔐 After Getting Your Key:

1. Add it to `.env.local`
2. Restart dev server
3. Test the AI chat
4. You should see: `✅ Gemini API key found: AIzaSy...`

---

## 🆘 If You Still Have Issues:

1. Make sure the key starts with `AIza`
2. No extra spaces or quotes around the key
3. Dev server must be restarted after changing `.env.local`
4. Check console for: `✅ Gemini API key found:`

---

**Get your key now:** https://aistudio.google.com/app/apikey
