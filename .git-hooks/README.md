# Git Hooks for Security

This directory contains git hooks to help prevent accidentally committing secrets.

## Installation

To enable the pre-commit hook:

```bash
# Option 1: Configure git to use this hooks directory
git config core.hooksPath .git-hooks

# Option 2: Copy to .git/hooks directory
cp .git-hooks/pre-commit .git/hooks/pre-commit
chmod +x .git/hooks/pre-commit
```

## Pre-commit Hook

The pre-commit hook checks for:
- Hardcoded API keys (Google, Replicate patterns)
- JWT tokens
- Attempts to commit `.env` or `.env.local` files
- Security-related TODOs

### Testing the Hook

```bash
# This should be blocked:
echo "AIza1234567890123456789012345678901234" > test.ts
git add test.ts
git commit -m "test"  # ❌ Should fail

# This should work:
echo "const key = process.env.API_KEY" > test.ts
git add test.ts
git commit -m "test"  # ✅ Should succeed
```

## Bypassing the Hook

Only if absolutely necessary (not recommended):

```bash
git commit --no-verify -m "message"
```

⚠️ **WARNING**: Only bypass if you're certain there are no secrets in your commit!
