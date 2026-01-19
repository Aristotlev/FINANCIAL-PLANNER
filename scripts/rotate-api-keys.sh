#!/bin/bash

# 🔄 API Key Rotation Script
# Helps rotate API keys when they are compromised or need regular rotation

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}🔄 API Key Rotation Assistant${NC}"
echo "========================================"
echo ""

# Function to backup .env.local
backup_env() {
    if [ -f ".env.local" ]; then
        local timestamp=$(date +%Y%m%d_%H%M%S)
        cp .env.local ".env.local.backup.$timestamp"
        echo -e "${GREEN}✅ Backed up .env.local to .env.local.backup.$timestamp${NC}"
    else
        echo -e "${YELLOW}⚠️  .env.local not found${NC}"
    fi
}

# Function to update key in .env.local
update_env_key() {
    local key_name=$1
    local new_value=$2
    
    if [ -f ".env.local" ]; then
        if grep -q "^${key_name}=" .env.local; then
            # Key exists, update it
            if [[ "$OSTYPE" == "darwin"* ]]; then
                # macOS
                sed -i '' "s|^${key_name}=.*|${key_name}=${new_value}|" .env.local
            else
                # Linux
                sed -i "s|^${key_name}=.*|${key_name}=${new_value}|" .env.local
            fi
            echo -e "${GREEN}✅ Updated ${key_name} in .env.local${NC}"
        else
            # Key doesn't exist, append it
            echo "${key_name}=${new_value}" >> .env.local
            echo -e "${GREEN}✅ Added ${key_name} to .env.local${NC}"
        fi
    else
        echo -e "${RED}❌ .env.local not found${NC}"
        exit 1
    fi
}

# Function to rotate Google AI API Key
rotate_google_ai_key() {
    echo ""
    echo -e "${BLUE}🔑 Rotating Google AI (Gemini) API Key${NC}"
    echo "----------------------------------------"
    echo ""
    echo "Steps:"
    echo "1. Go to: https://console.cloud.google.com/apis/credentials"
    echo "2. Create a new API key"
    echo "3. Restrict the key to 'Generative Language API'"
    echo "4. Add application restrictions (if needed)"
    echo "5. Copy the new API key"
    echo ""
    read -p "Enter new GOOGLE_AI_API_KEY (or press Enter to skip): " new_key
    
    if [ -n "$new_key" ]; then
        backup_env
        update_env_key "GOOGLE_AI_API_KEY" "$new_key"
        
        echo ""
        echo -e "${YELLOW}📋 Next steps:${NC}"
        echo "1. Delete the old API key from Google Cloud Console"
        echo "2. Update Cloud Run service:"
        echo "   gcloud run services update financial-planner \\"
        echo "     --region=europe-west1 \\"
        echo "     --update-secrets=GOOGLE_AI_API_KEY=GOOGLE_AI_API_KEY:latest"
        echo "3. Restart your development server: npm run dev"
    else
        echo -e "${YELLOW}⚠️  Skipped${NC}"
    fi
}

# Function to rotate Replicate API Token
rotate_replicate_token() {
    echo ""
    echo -e "${BLUE}🔑 Rotating Replicate API Token${NC}"
    echo "----------------------------------------"
    echo ""
    echo "Steps:"
    echo "1. Go to: https://replicate.com/account/api-tokens"
    echo "2. Create a new API token"
    echo "3. Copy the new token"
    echo ""
    read -p "Enter new REPLICATE_API_TOKEN (or press Enter to skip): " new_token
    
    if [ -n "$new_token" ]; then
        backup_env
        update_env_key "REPLICATE_API_TOKEN" "$new_token"
        
        echo ""
        echo -e "${YELLOW}📋 Next steps:${NC}"
        echo "1. Delete the old token from Replicate dashboard"
        echo "2. Update Cloud Run service:"
        echo "   gcloud run services update financial-planner \\"
        echo "     --region=europe-west1 \\"
        echo "     --update-env-vars=REPLICATE_API_TOKEN=$new_token"
        echo "3. Restart your development server: npm run dev"
    else
        echo -e "${YELLOW}⚠️  Skipped${NC}"
    fi
}

# Function to rotate Supabase Service Role Key
rotate_supabase_service_key() {
    echo ""
    echo -e "${BLUE}🔑 Rotating Supabase Service Role Key${NC}"
    echo "----------------------------------------"
    echo ""
    echo -e "${RED}⚠️  WARNING: Service role key has full database access!${NC}"
    echo ""
    echo "Steps:"
    echo "1. Go to: https://supabase.com/dashboard/project/YOUR_PROJECT/settings/api"
    echo "2. Regenerate the service_role key"
    echo "3. Copy the new service_role key"
    echo ""
    read -p "Enter new SUPABASE_SERVICE_ROLE_KEY (or press Enter to skip): " new_key
    
    if [ -n "$new_key" ]; then
        backup_env
        update_env_key "SUPABASE_SERVICE_ROLE_KEY" "$new_key"
        
        echo ""
        echo -e "${YELLOW}📋 Next steps:${NC}"
        echo "1. The old key is now invalid"
        echo "2. Update Cloud Run service:"
        echo "   gcloud run services update financial-planner \\"
        echo "     --region=europe-west1 \\"
        echo "     --update-secrets=SUPABASE_SERVICE_ROLE_KEY=SUPABASE_SERVICE_ROLE_KEY:latest"
        echo "3. Restart your development server: npm run dev"
    else
        echo -e "${YELLOW}⚠️  Skipped${NC}"
    fi
}

# Function to rotate Google Maps API Key
rotate_google_maps_key() {
    echo ""
    echo -e "${BLUE}🔑 Rotating Google Maps API Key${NC}"
    echo "----------------------------------------"
    echo ""
    echo "Steps:"
    echo "1. Go to: https://console.cloud.google.com/apis/credentials"
    echo "2. Create a new API key"
    echo "3. Restrict to Maps JavaScript API, Places API, Geocoding API"
    echo "4. Add HTTP referrer restrictions:"
    echo "   - https://yourdomain.com/*"
    echo "   - http://localhost:3000/*"
    echo "5. Copy the new API key"
    echo ""
    read -p "Enter new NEXT_PUBLIC_GOOGLE_MAPS_API_KEY (or press Enter to skip): " new_key
    
    if [ -n "$new_key" ]; then
        backup_env
        update_env_key "NEXT_PUBLIC_GOOGLE_MAPS_API_KEY" "$new_key"
        
        echo ""
        echo -e "${YELLOW}📋 Next steps:${NC}"
        echo "1. Delete the old API key from Google Cloud Console"
        echo "2. Update Cloud Run service:"
        echo "   gcloud run services update financial-planner \\"
        echo "     --region=europe-west1 \\"
        echo "     --update-env-vars=NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=$new_key"
        echo "3. Restart your development server: npm run dev"
    else
        echo -e "${YELLOW}⚠️  Skipped${NC}"
    fi
}

# Main menu
show_menu() {
    echo ""
    echo -e "${BLUE}Select API key(s) to rotate:${NC}"
    echo "========================================"
    echo "1) Google AI (Gemini) API Key"
    echo "2) Replicate API Token"
    echo "3) Supabase Service Role Key"
    echo "4) Google Maps API Key"
    echo "5) All Keys (Complete Rotation)"
    echo "6) Exit"
    echo ""
    read -p "Enter choice [1-6]: " choice
    
    case $choice in
        1) rotate_google_ai_key ;;
        2) rotate_replicate_token ;;
        3) rotate_supabase_service_key ;;
        4) rotate_google_maps_key ;;
        5)
            rotate_google_ai_key
            rotate_replicate_token
            rotate_supabase_service_key
            rotate_google_maps_key
            ;;
        6)
            echo -e "${GREEN}👋 Goodbye!${NC}"
            exit 0
            ;;
        *)
            echo -e "${RED}❌ Invalid choice${NC}"
            show_menu
            ;;
    esac
}

# Check if .env.local exists
if [ ! -f ".env.local" ]; then
    echo -e "${RED}❌ .env.local not found${NC}"
    echo ""
    read -p "Would you like to create it from .env.local.example? (y/n): " create_env
    if [ "$create_env" = "y" ]; then
        if [ -f ".env.local.example" ]; then
            cp .env.local.example .env.local
            echo -e "${GREEN}✅ Created .env.local from .env.local.example${NC}"
            echo -e "${YELLOW}📝 Please edit .env.local and add your API keys${NC}"
        else
            echo -e "${RED}❌ .env.local.example not found${NC}"
            exit 1
        fi
    else
        exit 1
    fi
fi

# Show menu
show_menu

# After rotation, remind user to commit changes
echo ""
echo "========================================"
echo -e "${GREEN}✅ Rotation Complete!${NC}"
echo "========================================"
echo ""
echo -e "${YELLOW}📋 Important reminders:${NC}"
echo "1. ❌ Do NOT commit .env.local to git"
echo "2. ✅ Update production environment variables"
echo "3. ✅ Revoke old keys from their respective dashboards"
echo "4. ✅ Restart your development server"
echo "5. ✅ Test all features to ensure keys work"
echo "6. ✅ Update documentation if needed"
echo ""
echo -e "${BLUE}Backup files created:${NC}"
ls -lt .env.local.backup.* 2>/dev/null | head -5 || echo "No backups found"
echo ""
