#!/usr/bin/env node

/**
 * Fix Supabase Authentication Setup
 * 
 * This script:
 * 1. Creates missing verifications table
 * 2. Verifies all Better Auth tables exist
 * 3. Checks database connection
 * 4. Tests authentication setup
 */

require('dotenv').config({ path: '.env.local' });
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.SUPABASE_DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
});

async function createVerificationsTable() {
  console.log('\n📝 Creating verifications table...');
  
  const createTableSQL = `
    CREATE TABLE IF NOT EXISTS verifications (
      id TEXT PRIMARY KEY,
      identifier TEXT NOT NULL,
      value TEXT NOT NULL,
      expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );

    -- Create indexes
    CREATE INDEX IF NOT EXISTS idx_verifications_identifier ON verifications(identifier);
    CREATE INDEX IF NOT EXISTS idx_verifications_expires_at ON verifications(expires_at);
  `;

  try {
    await pool.query(createTableSQL);
    console.log('✅ Verifications table created successfully');
    return true;
  } catch (error) {
    console.error('❌ Error creating verifications table:', error.message);
    return false;
  }
}

async function checkAllTables() {
  console.log('\n🔍 Checking all Better Auth tables...\n');
  
  const requiredTables = ['users', 'sessions', 'accounts', 'verifications'];
  const results = {};

  for (const table of requiredTables) {
    try {
      const result = await pool.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = $1
        );
      `, [table]);
      
      const exists = result.rows[0].exists;
      results[table] = exists;
      console.log(`${exists ? '✅' : '❌'} Table "${table}": ${exists ? 'EXISTS' : 'MISSING'}`);
    } catch (error) {
      results[table] = false;
      console.log(`❌ Table "${table}": ERROR - ${error.message}`);
    }
  }

  return results;
}

async function testConnection() {
  console.log('\n🔌 Testing database connection...');
  
  try {
    const result = await pool.query('SELECT NOW() as current_time');
    console.log('✅ Database connection successful');
    console.log(`   Current time: ${result.rows[0].current_time}`);
    return true;
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    return false;
  }
}

async function checkEnvironmentVariables() {
  console.log('\n🔧 Checking environment variables...\n');
  
  const requiredVars = [
    'SUPABASE_DATABASE_URL',
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'GOOGLE_CLIENT_ID',
    'GOOGLE_CLIENT_SECRET',
    'NEXT_PUBLIC_APP_URL',
  ];

  let allPresent = true;

  for (const varName of requiredVars) {
    const exists = !!process.env[varName];
    console.log(`${exists ? '✅' : '❌'} ${varName}: ${exists ? 'SET' : 'MISSING'}`);
    if (!exists) allPresent = false;
  }

  return allPresent;
}

async function main() {
  console.log('🚀 Starting Supabase Auth Fix...\n');
  console.log('=' .repeat(60));

  // Step 1: Check environment variables
  const envOk = await checkEnvironmentVariables();
  if (!envOk) {
    console.log('\n⚠️  Warning: Some environment variables are missing');
  }

  // Step 2: Test connection
  const connectionOk = await testConnection();
  if (!connectionOk) {
    console.log('\n❌ Cannot proceed without database connection');
    console.log('💡 Tip: Check your SUPABASE_DATABASE_URL in .env.local');
    process.exit(1);
  }

  // Step 3: Check existing tables
  const tableResults = await checkAllTables();
  
  // Step 4: Create missing verifications table if needed
  if (!tableResults.verifications) {
    console.log('\n⚠️  Verifications table is missing - creating it now...');
    await createVerificationsTable();
  }

  // Step 5: Final verification
  console.log('\n' + '='.repeat(60));
  console.log('\n📊 Final Status:\n');
  
  const finalCheck = await checkAllTables();
  const allTablesExist = Object.values(finalCheck).every(exists => exists);

  if (allTablesExist) {
    console.log('\n✅ SUCCESS! All Better Auth tables are ready');
    console.log('\n🎉 You can now use authentication in your app');
    console.log('\n📝 Next steps:');
    console.log('   1. Restart your dev server: npm run dev');
    console.log('   2. Try signing in with Google OAuth');
    console.log('   3. Check for any console errors');
  } else {
    console.log('\n⚠️  Some tables are still missing');
    console.log('💡 You may need to manually create them in Supabase');
  }

  console.log('\n' + '='.repeat(60));
  
  await pool.end();
}

main().catch(error => {
  console.error('\n❌ Fatal error:', error);
  process.exit(1);
});
