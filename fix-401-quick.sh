#!/bin/bash

# Quick fix script for 401 Unauthorized errors
# This temporarily disables RLS for local development

echo "🔧 Fixing 401 Unauthorized errors for portfolio_snapshots..."
echo ""
echo "⚠️  WARNING: This will disable Row Level Security for local testing only!"
echo ""
read -p "Continue? (y/n) " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]
then
    echo "❌ Cancelled"
    exit 1
fi

# Check if psql is available
if ! command -v psql &> /dev/null; then
    echo "❌ PostgreSQL client (psql) not found"
    echo "Please install PostgreSQL or use the Supabase SQL Editor instead"
    echo ""
    echo "Alternative: Go to Supabase Dashboard → SQL Editor → Run this query:"
    echo ""
    echo "ALTER TABLE public.portfolio_snapshots DISABLE ROW LEVEL SECURITY;"
    echo ""
    exit 1
fi

# Get Supabase connection details
echo "📝 Enter your Supabase database connection URL:"
echo "   (Found in: Supabase Dashboard → Settings → Database → Connection string)"
read -p "URL: " SUPABASE_URL

if [ -z "$SUPABASE_URL" ]; then
    echo "❌ No URL provided"
    exit 1
fi

# Run the SQL
echo ""
echo "⚙️  Disabling RLS for portfolio_snapshots..."
psql "$SUPABASE_URL" -c "ALTER TABLE public.portfolio_snapshots DISABLE ROW LEVEL SECURITY;"

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ RLS disabled successfully!"
    echo ""
    echo "📋 What this means:"
    echo "   - 401 errors should be gone"
    echo "   - Portfolio data will load from Supabase"
    echo "   - No authentication required (for testing only)"
    echo ""
    echo "⚠️  IMPORTANT: Re-enable RLS before deploying to production!"
    echo ""
else
    echo ""
    echo "❌ Failed to disable RLS"
    echo ""
    echo "Alternative: Use Supabase SQL Editor to run:"
    echo "ALTER TABLE public.portfolio_snapshots DISABLE ROW LEVEL SECURITY;"
    echo ""
fi
