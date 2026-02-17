#!/bin/bash

# 🔧 Cloud Build Environment Variables Setup Script
# This script helps you configure Cloud Build substitution variables for your deployment

set -e

echo "🚀 Cloud Build Environment Variables Setup"
echo "=========================================="
echo ""

# Check if .env.local exists
if [ ! -f .env.local ]; then
    echo "❌ Error: .env.local file not found!"
    echo "Please create a .env.local file with your environment variables first."
    exit 1
fi

# Load environment variables from .env.local
echo "📋 Loading environment variables from .env.local..."
export $(cat .env.local | grep -v '^#' | xargs)

# Check if gcloud is installed
if ! command -v gcloud &> /dev/null; then
    echo "❌ Error: gcloud CLI is not installed!"
    echo "Please install it from: https://cloud.google.com/sdk/docs/install"
    exit 1
fi

# Get project ID
PROJECT_ID=$(gcloud config get-value project 2>/dev/null)
if [ -z "$PROJECT_ID" ]; then
    echo "❌ Error: No GCP project is set!"
    echo "Run: gcloud config set project YOUR_PROJECT_ID"
    exit 1
fi

echo "✅ Using project: $PROJECT_ID"
echo ""

# List available triggers
echo "📋 Available Cloud Build triggers:"
gcloud builds triggers list --format="table(name,id,description)" 2>/dev/null || {
    echo "⚠️  No triggers found. You may need to create one first."
}
echo ""

# Prompt for trigger name
read -p "Enter your Cloud Build trigger name (or press Enter to skip trigger update): " TRIGGER_NAME

if [ ! -z "$TRIGGER_NAME" ]; then
    echo ""
    echo "🔧 Updating Cloud Build trigger with environment variables..."
    
    # Build substitutions string
    SUBSTITUTIONS="_NEXT_PUBLIC_SUPABASE_URL=${NEXT_PUBLIC_SUPABASE_URL}"
    SUBSTITUTIONS="${SUBSTITUTIONS},_NEXT_PUBLIC_SUPABASE_ANON_KEY=${NEXT_PUBLIC_SUPABASE_ANON_KEY}"
    SUBSTITUTIONS="${SUBSTITUTIONS},_NEXT_PUBLIC_BETTER_AUTH_URL=${NEXT_PUBLIC_BETTER_AUTH_URL}"
    SUBSTITUTIONS="${SUBSTITUTIONS},_NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}"
    SUBSTITUTIONS="${SUBSTITUTIONS},_NEXT_PUBLIC_APP_URL=${NEXT_PUBLIC_APP_URL}"
    SUBSTITUTIONS="${SUBSTITUTIONS},_NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=${NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}"
    SUBSTITUTIONS="${SUBSTITUTIONS},_NEXT_PUBLIC_COINGECKO_API_KEY=${NEXT_PUBLIC_COINGECKO_API_KEY}"
    SUBSTITUTIONS="${SUBSTITUTIONS},_NEXT_PUBLIC_NEWS_API_KEY=${NEXT_PUBLIC_NEWS_API_KEY}"
    SUBSTITUTIONS="${SUBSTITUTIONS},_NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=${NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY}"
    SUBSTITUTIONS="${SUBSTITUTIONS},_NEXT_PUBLIC_GA_MEASUREMENT_ID=${NEXT_PUBLIC_GA_MEASUREMENT_ID}"
    SUBSTITUTIONS="${SUBSTITUTIONS},_GOOGLE_CLIENT_ID=${GOOGLE_CLIENT_ID}"
    SUBSTITUTIONS="${SUBSTITUTIONS},_BETTER_AUTH_URL=${BETTER_AUTH_URL}"    # Update trigger
    gcloud builds triggers update "$TRIGGER_NAME" \
        --substitutions="$SUBSTITUTIONS" 2>/dev/null && {
        echo "✅ Cloud Build trigger updated successfully!"
    } || {
        echo "⚠️  Failed to update trigger. You may need to update it manually."
    }
else
    echo "⏭️  Skipping trigger update."
fi

echo ""
echo "🔧 Updating Cloud Run service environment variables..."

# Check if service exists
SERVICE_EXISTS=$(gcloud run services list --filter="name:financial-planner" --format="value(name)" 2>/dev/null)

if [ ! -z "$SERVICE_EXISTS" ]; then
    # Update existing service
    gcloud run services update financial-planner \
        --region=europe-west1 \
        --set-env-vars="NEXT_PUBLIC_SUPABASE_URL=${NEXT_PUBLIC_SUPABASE_URL},NEXT_PUBLIC_SUPABASE_ANON_KEY=${NEXT_PUBLIC_SUPABASE_ANON_KEY},NEXT_PUBLIC_BETTER_AUTH_URL=${NEXT_PUBLIC_BETTER_AUTH_URL},NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL},NEXT_PUBLIC_APP_URL=${NEXT_PUBLIC_APP_URL},NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=${NEXT_PUBLIC_GOOGLE_MAPS_API_KEY},NEXT_PUBLIC_COINGECKO_API_KEY=${NEXT_PUBLIC_COINGECKO_API_KEY},NEXT_PUBLIC_NEWS_API_KEY=${NEXT_PUBLIC_NEWS_API_KEY},NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=${NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY},NEXT_PUBLIC_GA_MEASUREMENT_ID=${NEXT_PUBLIC_GA_MEASUREMENT_ID},GOOGLE_CLIENT_ID=${GOOGLE_CLIENT_ID},BETTER_AUTH_URL=${BETTER_AUTH_URL}" && {
        echo "✅ Cloud Run service updated successfully!"
    } || {
        echo "⚠️  Failed to update Cloud Run service."
        exit 1
    }
else
    echo "⚠️  Cloud Run service 'financial-planner' not found."
    echo "It will be created during the next deployment."
fi

echo ""
echo "✅ Setup complete!"
echo ""
echo "📝 Next steps:"
echo "1. Commit your changes: git add Dockerfile cloudbuild.yaml"
echo "2. Push to trigger build: git push origin main"
echo "3. Monitor build: gcloud builds list --limit=1"
echo ""
echo "🔍 Verify deployment:"
echo "gcloud run services describe financial-planner --region=europe-west1"
echo ""
