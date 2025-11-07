#!/bin/bash

# Security Verification Script
# Verifies that sensitive API keys are not exposed in client-side code

echo "🔐 Security Fix Verification Script"
echo "===================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

ISSUES_FOUND=0

# Check 1: Verify .env.local uses new naming
echo "📋 Check 1: Verifying .env.local configuration..."
if [ -f ".env.local" ]; then
    if grep -q "NEXT_PUBLIC_GOOGLE_AI_API_KEY" .env.local; then
        echo -e "${RED}❌ FAIL: Found old NEXT_PUBLIC_GOOGLE_AI_API_KEY in .env.local${NC}"
        echo "   → Should be: GOOGLE_AI_API_KEY (without NEXT_PUBLIC_)"
        ISSUES_FOUND=$((ISSUES_FOUND + 1))
    else
        echo -e "${GREEN}✅ PASS: No NEXT_PUBLIC_GOOGLE_AI_API_KEY found${NC}"
    fi
    
    if grep -q "NEXT_PUBLIC_ELEVENLABS_API_KEY" .env.local; then
        echo -e "${RED}❌ FAIL: Found old NEXT_PUBLIC_ELEVENLABS_API_KEY in .env.local${NC}"
        echo "   → Should be: ELEVENLABS_API_KEY (without NEXT_PUBLIC_)"
        ISSUES_FOUND=$((ISSUES_FOUND + 1))
    else
        echo -e "${GREEN}✅ PASS: No NEXT_PUBLIC_ELEVENLABS_API_KEY found${NC}"
    fi
    
    if grep -q "^GOOGLE_AI_API_KEY=" .env.local; then
        echo -e "${GREEN}✅ PASS: Found secure GOOGLE_AI_API_KEY${NC}"
    else
        echo -e "${YELLOW}⚠️  WARNING: GOOGLE_AI_API_KEY not found in .env.local${NC}"
    fi
else
    echo -e "${YELLOW}⚠️  WARNING: .env.local not found${NC}"
fi
echo ""

# Check 2: Verify API routes use new env vars
echo "📋 Check 2: Verifying API routes..."
if grep -r "NEXT_PUBLIC_GOOGLE_AI_API_KEY" app/api/ 2>/dev/null; then
    echo -e "${RED}❌ FAIL: Found NEXT_PUBLIC_GOOGLE_AI_API_KEY in API routes${NC}"
    ISSUES_FOUND=$((ISSUES_FOUND + 1))
else
    echo -e "${GREEN}✅ PASS: No NEXT_PUBLIC_GOOGLE_AI_API_KEY in API routes${NC}"
fi

if grep -r "NEXT_PUBLIC_ELEVENLABS_API_KEY" app/api/ 2>/dev/null; then
    echo -e "${RED}❌ FAIL: Found NEXT_PUBLIC_ELEVENLABS_API_KEY in API routes${NC}"
    ISSUES_FOUND=$((ISSUES_FOUND + 1))
else
    echo -e "${GREEN}✅ PASS: No NEXT_PUBLIC_ELEVENLABS_API_KEY in API routes${NC}"
fi
echo ""

# Check 3: Verify runtime-env.js doesn't expose keys
echo "📋 Check 3: Verifying public/runtime-env.js..."
if grep -q "NEXT_PUBLIC_GOOGLE_AI_API_KEY" public/runtime-env.js; then
    echo -e "${RED}❌ FAIL: Found NEXT_PUBLIC_GOOGLE_AI_API_KEY in runtime-env.js${NC}"
    ISSUES_FOUND=$((ISSUES_FOUND + 1))
else
    echo -e "${GREEN}✅ PASS: No NEXT_PUBLIC_GOOGLE_AI_API_KEY in runtime-env.js${NC}"
fi

if grep -q "NEXT_PUBLIC_ELEVENLABS_API_KEY" public/runtime-env.js; then
    echo -e "${RED}❌ FAIL: Found NEXT_PUBLIC_ELEVENLABS_API_KEY in runtime-env.js${NC}"
    ISSUES_FOUND=$((ISSUES_FOUND + 1))
else
    echo -e "${GREEN}✅ PASS: No NEXT_PUBLIC_ELEVENLABS_API_KEY in runtime-env.js${NC}"
fi
echo ""

# Check 4: Verify TypeScript definitions
echo "📋 Check 4: Verifying TypeScript definitions..."
if grep -q "NEXT_PUBLIC_GOOGLE_AI_API_KEY" global.d.ts; then
    echo -e "${RED}❌ FAIL: Found NEXT_PUBLIC_GOOGLE_AI_API_KEY in global.d.ts${NC}"
    ISSUES_FOUND=$((ISSUES_FOUND + 1))
else
    echo -e "${GREEN}✅ PASS: No NEXT_PUBLIC_GOOGLE_AI_API_KEY in global.d.ts${NC}"
fi

if grep -q "NEXT_PUBLIC_ELEVENLABS_API_KEY" global.d.ts; then
    echo -e "${RED}❌ FAIL: Found NEXT_PUBLIC_ELEVENLABS_API_KEY in global.d.ts${NC}"
    ISSUES_FOUND=$((ISSUES_FOUND + 1))
else
    echo -e "${GREEN}✅ PASS: No NEXT_PUBLIC_ELEVENLABS_API_KEY in global.d.ts${NC}"
fi
echo ""

# Check 5: Verify Dockerfile
echo "📋 Check 5: Verifying Dockerfile..."
if grep -q "NEXT_PUBLIC_GOOGLE_AI_API_KEY" Dockerfile; then
    echo -e "${RED}❌ FAIL: Found NEXT_PUBLIC_GOOGLE_AI_API_KEY in Dockerfile${NC}"
    ISSUES_FOUND=$((ISSUES_FOUND + 1))
else
    echo -e "${GREEN}✅ PASS: No NEXT_PUBLIC_GOOGLE_AI_API_KEY in Dockerfile${NC}"
fi

if grep -q "NEXT_PUBLIC_ELEVENLABS_API_KEY" Dockerfile; then
    echo -e "${RED}❌ FAIL: Found NEXT_PUBLIC_ELEVENLABS_API_KEY in Dockerfile${NC}"
    ISSUES_FOUND=$((ISSUES_FOUND + 1))
else
    echo -e "${GREEN}✅ PASS: No NEXT_PUBLIC_ELEVENLABS_API_KEY in Dockerfile${NC}"
fi
echo ""

# Check 6: Verify cloudbuild.yaml
echo "📋 Check 6: Verifying cloudbuild.yaml..."
if grep -q "NEXT_PUBLIC_GOOGLE_AI_API_KEY" cloudbuild.yaml; then
    echo -e "${RED}❌ FAIL: Found NEXT_PUBLIC_GOOGLE_AI_API_KEY in cloudbuild.yaml${NC}"
    ISSUES_FOUND=$((ISSUES_FOUND + 1))
else
    echo -e "${GREEN}✅ PASS: No NEXT_PUBLIC_GOOGLE_AI_API_KEY in cloudbuild.yaml${NC}"
fi

if grep -q "NEXT_PUBLIC_ELEVENLABS_API_KEY" cloudbuild.yaml; then
    echo -e "${RED}❌ FAIL: Found NEXT_PUBLIC_ELEVENLABS_API_KEY in cloudbuild.yaml${NC}"
    ISSUES_FOUND=$((ISSUES_FOUND + 1))
else
    echo -e "${GREEN}✅ PASS: No NEXT_PUBLIC_ELEVENLABS_API_KEY in cloudbuild.yaml${NC}"
fi
echo ""

# Final summary
echo "===================================="
if [ $ISSUES_FOUND -eq 0 ]; then
    echo -e "${GREEN}✅ All security checks passed!${NC}"
    echo ""
    echo "🎉 Your API keys are now secure!"
    echo ""
    echo "Next steps:"
    echo "1. Update your .env.local file with the new variable names"
    echo "2. Test locally with: npm run dev"
    echo "3. Update Cloud Build trigger substitutions in Google Cloud Console"
    echo "4. Deploy to production"
    exit 0
else
    echo -e "${RED}❌ Found $ISSUES_FOUND security issue(s)${NC}"
    echo ""
    echo "Please fix the issues above before deploying."
    exit 1
fi
