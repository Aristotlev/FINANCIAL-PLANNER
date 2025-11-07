#!/bin/bash

# Quick .env.local updater script
# This script helps you update your .env.local file with the new secure variable names

echo "🔐 .env.local Security Update Script"
echo "====================================="
echo ""

# Check if .env.local exists
if [ ! -f ".env.local" ]; then
    echo "❌ Error: .env.local file not found"
    echo "Please create it from .env.local.example first"
    exit 1
fi

# Backup the current .env.local
echo "📦 Creating backup: .env.local.backup"
cp .env.local .env.local.backup

# Create a new .env.local with updated variable names
echo "🔄 Updating environment variables..."

# Read current values
GOOGLE_AI_KEY=$(grep "NEXT_PUBLIC_GOOGLE_AI_API_KEY=" .env.local | cut -d '=' -f2- | tr -d ' ')
ELEVENLABS_KEY=$(grep "NEXT_PUBLIC_ELEVENLABS_API_KEY=" .env.local | cut -d '=' -f2- | tr -d ' ')
ELEVENLABS_VOICE=$(grep "NEXT_PUBLIC_ELEVENLABS_VOICE_ID=" .env.local | cut -d '=' -f2- | tr -d ' ')

# Display what will be changed
echo ""
echo "📝 Changes to be made:"
echo "  OLD: NEXT_PUBLIC_GOOGLE_AI_API_KEY     → NEW: GOOGLE_AI_API_KEY"
echo "  OLD: NEXT_PUBLIC_ELEVENLABS_API_KEY    → NEW: ELEVENLABS_API_KEY"
echo "  OLD: NEXT_PUBLIC_ELEVENLABS_VOICE_ID   → NEW: ELEVENLABS_VOICE_ID"
echo ""

# Create the updated .env.local
cat > .env.local.new << EOF
# Supabase Configuration (keep as-is - safe to expose)
$(grep "NEXT_PUBLIC_SUPABASE_URL=" .env.local)
$(grep "NEXT_PUBLIC_SUPABASE_ANON_KEY=" .env.local)

# Google Maps API (keep as-is - safe to expose)
$(grep "NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=" .env.local)

# App URL (keep as-is - safe to expose)
$(grep "NEXT_PUBLIC_APP_URL=" .env.local || echo "NEXT_PUBLIC_APP_URL=http://localhost:3000")

# ✅ SECURE: Google AI API (Server-side only - no NEXT_PUBLIC_ prefix)
GOOGLE_AI_API_KEY=${GOOGLE_AI_KEY}

# ✅ SECURE: ElevenLabs TTS (Server-side only - no NEXT_PUBLIC_ prefix)
ELEVENLABS_API_KEY=${ELEVENLABS_KEY}
ELEVENLABS_VOICE_ID=${ELEVENLABS_VOICE:-Z3R5wn05IrDiVCyEkUrK}

# Replicate API (Server-side only)
$(grep "REPLICATE_API_TOKEN=" .env.local || echo "# REPLICATE_API_TOKEN=your_token_here")

# CoinMarketCap API (Server-side only - optional)
$(grep "CMC_API_KEY=" .env.local || echo "# CMC_API_KEY=your_key_here")

# Google OAuth (Server-side only)
$(grep "GOOGLE_CLIENT_ID=" .env.local 2>/dev/null || echo "# GOOGLE_CLIENT_ID=")
$(grep "GOOGLE_CLIENT_SECRET=" .env.local 2>/dev/null || echo "# GOOGLE_CLIENT_SECRET=")

# Supabase Database (Server-side only)
$(grep "SUPABASE_DATABASE_URL=" .env.local 2>/dev/null || echo "# SUPABASE_DATABASE_URL=")
EOF

# Replace old file with new one
mv .env.local.new .env.local

echo "✅ .env.local updated successfully!"
echo ""
echo "📋 Summary:"
echo "  • Backup saved to: .env.local.backup"
echo "  • Old NEXT_PUBLIC_ prefixed keys removed"
echo "  • New server-side only keys added"
echo ""
echo "🧪 Next steps:"
echo "  1. Review your .env.local file"
echo "  2. Run: ./verify-security-fix.sh"
echo "  3. Start dev server: npm run dev"
echo ""
