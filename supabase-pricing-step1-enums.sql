-- ================================================
-- PRICING PLAN UPDATE - STEP 1: Add Enum Values
-- ================================================
-- Run this FIRST, then run step2 file separately
-- PostgreSQL requires enum values to be committed before use

-- Check current enum values first
SELECT enumlabel FROM pg_enum 
WHERE enumtypid = 'subscription_plan'::regtype
ORDER BY enumsortorder;

-- Add new enum values (these will error if already exist, that's OK)
DO $$ 
BEGIN
    BEGIN
        ALTER TYPE subscription_plan ADD VALUE 'STARTER';
    EXCEPTION WHEN duplicate_object THEN
        RAISE NOTICE 'STARTER already exists';
    END;
    
    BEGIN
        ALTER TYPE subscription_plan ADD VALUE 'TRADER';
    EXCEPTION WHEN duplicate_object THEN
        RAISE NOTICE 'TRADER already exists';
    END;
    
    BEGIN
        ALTER TYPE subscription_plan ADD VALUE 'INVESTOR';
    EXCEPTION WHEN duplicate_object THEN
        RAISE NOTICE 'INVESTOR already exists';
    END;
    
    BEGIN
        ALTER TYPE subscription_plan ADD VALUE 'WHALE';
    EXCEPTION WHEN duplicate_object THEN
        RAISE NOTICE 'WHALE already exists';
    END;
END $$;

-- Verify enums were added
SELECT enumlabel FROM pg_enum 
WHERE enumtypid = 'subscription_plan'::regtype
ORDER BY enumsortorder;
