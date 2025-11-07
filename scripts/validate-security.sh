#!/bin/bash

# 🔐 Security Validation Script
# Checks for common security issues before deployment

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

ISSUES_FOUND=0
WARNINGS_FOUND=0

echo -e "${BLUE}🔐 Security Validation - Money Hub App${NC}"
echo "========================================"
echo ""

# Check 1: Verify .env.local is gitignored
echo -e "${BLUE}📋 Check 1: Verifying .env.local is gitignored...${NC}"
if grep -q "^\.env\.local$" .gitignore || grep -q "^\.env\*\.local$" .gitignore; then
    echo -e "${GREEN}✅ PASS: .env.local is in .gitignore${NC}"
else
    echo -e "${RED}❌ FAIL: .env.local is NOT in .gitignore${NC}"
    echo -e "${YELLOW}   Action: Add '.env*.local' to .gitignore${NC}"
    ISSUES_FOUND=$((ISSUES_FOUND + 1))
fi
echo ""

# Check 2: Look for exposed API keys in code
echo -e "${BLUE}📋 Check 2: Scanning for exposed API keys...${NC}"
if grep -r "NEXT_PUBLIC_GOOGLE_AI_API_KEY" --include="*.ts" --include="*.tsx" --include="*.js" --include="*.jsx" app/ components/ lib/ 2>/dev/null | grep -v "// ❌\|// ✅\|/\*\|\.md" ; then
    echo -e "${RED}❌ FAIL: Found NEXT_PUBLIC_GOOGLE_AI_API_KEY in source code${NC}"
    echo -e "${YELLOW}   Action: Use server-side GOOGLE_AI_API_KEY instead${NC}"
    ISSUES_FOUND=$((ISSUES_FOUND + 1))
else
    echo -e "${GREEN}✅ PASS: No client-side AI API keys found${NC}"
fi

if grep -r "NEXT_PUBLIC_ELEVENLABS_API_KEY" --include="*.ts" --include="*.tsx" --include="*.js" --include="*.jsx" app/ components/ lib/ 2>/dev/null | grep -v "// ❌\|// ✅\|/\*\|\.md"; then
    echo -e "${RED}❌ FAIL: Found NEXT_PUBLIC_ELEVENLABS_API_KEY in source code${NC}"
    echo -e "${YELLOW}   Action: Use server-side ELEVENLABS_API_KEY instead${NC}"
    ISSUES_FOUND=$((ISSUES_FOUND + 1))
else
    echo -e "${GREEN}✅ PASS: No client-side ElevenLabs API keys found${NC}"
fi
echo ""

# Check 3: Look for console.log with sensitive data
echo -e "${BLUE}📋 Check 3: Checking for console.log with sensitive data...${NC}"
if grep -r "console\.log.*\(key\|token\|password\|secret\)" --include="*.ts" --include="*.tsx" --include="*.js" --include="*.jsx" app/ components/ lib/ 2>/dev/null | grep -v "// Example\|// Test\|'✓ Found'\|'✗ Missing'\|\.md"; then
    echo -e "${YELLOW}⚠️  WARNING: Found console.log statements that might leak sensitive data${NC}"
    echo -e "${YELLOW}   Action: Review and use logger.log() or mask sensitive data${NC}"
    WARNINGS_FOUND=$((WARNINGS_FOUND + 1))
else
    echo -e "${GREEN}✅ PASS: No obvious sensitive data in console.log${NC}"
fi
echo ""

# Check 4: Verify .env.local exists
echo -e "${BLUE}📋 Check 4: Verifying .env.local file exists...${NC}"
if [ -f ".env.local" ]; then
    echo -e "${GREEN}✅ PASS: .env.local file exists${NC}"
    
    # Check for required server-side keys
    if grep -q "^GOOGLE_AI_API_KEY=" .env.local; then
        echo -e "${GREEN}   ✅ GOOGLE_AI_API_KEY found (server-side)${NC}"
    else
        echo -e "${YELLOW}   ⚠️  GOOGLE_AI_API_KEY not found${NC}"
        WARNINGS_FOUND=$((WARNINGS_FOUND + 1))
    fi
    
    if grep -q "^ELEVENLABS_API_KEY=" .env.local; then
        echo -e "${GREEN}   ✅ ELEVENLABS_API_KEY found (server-side)${NC}"
    else
        echo -e "${YELLOW}   ⚠️  ELEVENLABS_API_KEY not found${NC}"
        WARNINGS_FOUND=$((WARNINGS_FOUND + 1))
    fi
    
    # Check for insecure patterns
    if grep -q "^NEXT_PUBLIC_GOOGLE_AI_API_KEY=" .env.local; then
        echo -e "${RED}   ❌ INSECURE: NEXT_PUBLIC_GOOGLE_AI_API_KEY found${NC}"
        echo -e "${YELLOW}   Action: Rename to GOOGLE_AI_API_KEY (remove NEXT_PUBLIC_)${NC}"
        ISSUES_FOUND=$((ISSUES_FOUND + 1))
    fi
    
    if grep -q "^NEXT_PUBLIC_ELEVENLABS_API_KEY=" .env.local; then
        echo -e "${RED}   ❌ INSECURE: NEXT_PUBLIC_ELEVENLABS_API_KEY found${NC}"
        echo -e "${YELLOW}   Action: Rename to ELEVENLABS_API_KEY (remove NEXT_PUBLIC_)${NC}"
        ISSUES_FOUND=$((ISSUES_FOUND + 1))
    fi
else
    echo -e "${YELLOW}⚠️  WARNING: .env.local file not found${NC}"
    echo -e "${YELLOW}   Action: Copy .env.local.example to .env.local and add your keys${NC}"
    WARNINGS_FOUND=$((WARNINGS_FOUND + 1))
fi
echo ""

# Check 5: Verify no hardcoded secrets
echo -e "${BLUE}📋 Check 5: Scanning for hardcoded secrets...${NC}"
FOUND_SECRETS=false

# Check for API key patterns
if grep -rE "AIza[0-9A-Za-z_-]{35}" --include="*.ts" --include="*.tsx" --include="*.js" --include="*.jsx" app/ components/ lib/ 2>/dev/null | grep -v "\.md\|example\|test"; then
    echo -e "${RED}❌ FAIL: Found hardcoded Google API key pattern${NC}"
    FOUND_SECRETS=true
    ISSUES_FOUND=$((ISSUES_FOUND + 1))
fi

if grep -rE "sk_[a-f0-9]{32}" --include="*.ts" --include="*.tsx" --include="*.js" --include="*.jsx" app/ components/ lib/ 2>/dev/null | grep -v "\.md\|example\|test"; then
    echo -e "${RED}❌ FAIL: Found hardcoded ElevenLabs API key pattern${NC}"
    FOUND_SECRETS=true
    ISSUES_FOUND=$((ISSUES_FOUND + 1))
fi

if grep -rE "r8_[a-zA-Z0-9]{40}" --include="*.ts" --include="*.tsx" --include="*.js" --include="*.jsx" app/ components/ lib/ 2>/dev/null | grep -v "\.md\|example\|test"; then
    echo -e "${RED}❌ FAIL: Found hardcoded Replicate API token pattern${NC}"
    FOUND_SECRETS=true
    ISSUES_FOUND=$((ISSUES_FOUND + 1))
fi

if [ "$FOUND_SECRETS" = false ]; then
    echo -e "${GREEN}✅ PASS: No hardcoded secrets found${NC}"
fi
echo ""

# Check 6: Verify middleware security headers
echo -e "${BLUE}📋 Check 6: Verifying security headers in middleware...${NC}"
if [ -f "middleware.ts" ]; then
    if grep -q "X-Content-Type-Options" middleware.ts && \
       grep -q "X-Frame-Options" middleware.ts && \
       grep -q "X-XSS-Protection" middleware.ts && \
       grep -q "Content-Security-Policy" middleware.ts; then
        echo -e "${GREEN}✅ PASS: Security headers configured in middleware${NC}"
    else
        echo -e "${YELLOW}⚠️  WARNING: Some security headers missing in middleware${NC}"
        WARNINGS_FOUND=$((WARNINGS_FOUND + 1))
    fi
else
    echo -e "${RED}❌ FAIL: middleware.ts not found${NC}"
    ISSUES_FOUND=$((ISSUES_FOUND + 1))
fi
echo ""

# Check 7: Check for TODO/FIXME security comments
echo -e "${BLUE}📋 Check 7: Scanning for security-related TODOs...${NC}"
if grep -r "TODO.*security\|FIXME.*security\|XXX.*security" --include="*.ts" --include="*.tsx" --include="*.js" --include="*.jsx" -i app/ components/ lib/ 2>/dev/null; then
    echo -e "${YELLOW}⚠️  WARNING: Found security-related TODO/FIXME comments${NC}"
    echo -e "${YELLOW}   Action: Review and address these before deployment${NC}"
    WARNINGS_FOUND=$((WARNINGS_FOUND + 1))
else
    echo -e "${GREEN}✅ PASS: No security-related TODO comments found${NC}"
fi
echo ""

# Check 8: Verify package.json doesn't have vulnerabilities
echo -e "${BLUE}📋 Check 8: Checking for known vulnerabilities...${NC}"
if command -v npm &> /dev/null; then
    if npm audit --audit-level=high 2>/dev/null | grep -q "found 0 vulnerabilities"; then
        echo -e "${GREEN}✅ PASS: No high/critical vulnerabilities found${NC}"
    else
        echo -e "${YELLOW}⚠️  WARNING: npm audit found vulnerabilities${NC}"
        echo -e "${YELLOW}   Action: Run 'npm audit fix' to resolve${NC}"
        WARNINGS_FOUND=$((WARNINGS_FOUND + 1))
    fi
else
    echo -e "${YELLOW}⚠️  WARNING: npm not found, skipping vulnerability check${NC}"
fi
echo ""

# Check 9: Verify API routes have proper error handling
echo -e "${BLUE}📋 Check 9: Checking API routes for error handling...${NC}"
ROUTES_WITHOUT_TRY_CATCH=0
if [ -d "app/api" ]; then
    while IFS= read -r file; do
        if ! grep -q "try {" "$file" && ! grep -q "\.catch(" "$file"; then
            echo -e "${YELLOW}   ⚠️  No try-catch in: $file${NC}"
            ROUTES_WITHOUT_TRY_CATCH=$((ROUTES_WITHOUT_TRY_CATCH + 1))
        fi
    done < <(find app/api -name "route.ts" -o -name "route.js" 2>/dev/null)
    
    if [ $ROUTES_WITHOUT_TRY_CATCH -eq 0 ]; then
        echo -e "${GREEN}✅ PASS: All API routes have error handling${NC}"
    else
        echo -e "${YELLOW}⚠️  WARNING: $ROUTES_WITHOUT_TRY_CATCH route(s) without error handling${NC}"
        WARNINGS_FOUND=$((WARNINGS_FOUND + 1))
    fi
else
    echo -e "${YELLOW}⚠️  WARNING: app/api directory not found${NC}"
fi
echo ""

# Check 10: Verify git history doesn't contain secrets (last 10 commits)
echo -e "${BLUE}📋 Check 10: Checking recent git history for secrets...${NC}"
if command -v git &> /dev/null && [ -d .git ]; then
    if git log -10 -p | grep -qE "AIza[0-9A-Za-z_-]{35}|sk_[a-f0-9]{32}|r8_[a-zA-Z0-9]{40}"; then
        echo -e "${RED}❌ FAIL: Found API key patterns in recent git history${NC}"
        echo -e "${YELLOW}   Action: Consider using git-filter-repo to remove secrets${NC}"
        ISSUES_FOUND=$((ISSUES_FOUND + 1))
    else
        echo -e "${GREEN}✅ PASS: No secrets found in recent git history${NC}"
    fi
else
    echo -e "${YELLOW}⚠️  WARNING: Not a git repository or git not installed${NC}"
fi
echo ""

# Summary
echo "========================================"
echo -e "${BLUE}📊 Security Validation Summary${NC}"
echo "========================================"
echo ""

if [ $ISSUES_FOUND -eq 0 ] && [ $WARNINGS_FOUND -eq 0 ]; then
    echo -e "${GREEN}🎉 ALL CHECKS PASSED!${NC}"
    echo -e "${GREEN}Your application is secure and ready for deployment.${NC}"
    exit 0
elif [ $ISSUES_FOUND -eq 0 ]; then
    echo -e "${YELLOW}⚠️  $WARNINGS_FOUND WARNING(S) FOUND${NC}"
    echo -e "${YELLOW}Review warnings above before deployment.${NC}"
    exit 0
else
    echo -e "${RED}❌ $ISSUES_FOUND CRITICAL ISSUE(S) FOUND${NC}"
    echo -e "${YELLOW}⚠️  $WARNINGS_FOUND WARNING(S) FOUND${NC}"
    echo ""
    echo -e "${RED}Please fix critical issues before deployment!${NC}"
    echo ""
    echo "Resources:"
    echo "  - SECURITY.md: Complete security guide"
    echo "  - ./scripts/fix-security-issues.sh: Auto-fix common issues"
    echo "  - ./scripts/rotate-api-keys.sh: Rotate compromised keys"
    exit 1
fi
