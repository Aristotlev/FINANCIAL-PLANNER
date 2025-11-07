#!/usr/bin/env node

/**
 * Test Authentication Setup
 * 
 * This script tests your authentication configuration
 * and helps diagnose any remaining issues.
 */

require('dotenv').config({ path: '.env.local' });
const http = require('http');
const https = require('https');

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

console.log('🧪 Testing Authentication Setup\n');
console.log('=' .repeat(60));

// Test 1: Check if dev server is running
async function testDevServer() {
  console.log('\n1️⃣  Testing dev server connection...');
  
  return new Promise((resolve) => {
    const url = new URL(APP_URL);
    const client = url.protocol === 'https:' ? https : http;
    
    const req = client.get(APP_URL, (res) => {
      if (res.statusCode === 200) {
        console.log('   ✅ Dev server is running');
        console.log(`   📍 URL: ${APP_URL}`);
        resolve(true);
      } else {
        console.log(`   ⚠️  Dev server returned status: ${res.statusCode}`);
        resolve(false);
      }
    });
    
    req.on('error', (error) => {
      console.log('   ❌ Cannot connect to dev server');
      console.log('   💡 Make sure to run: npm run dev');
      resolve(false);
    });
    
    req.setTimeout(5000, () => {
      console.log('   ❌ Connection timeout');
      req.destroy();
      resolve(false);
    });
  });
}

// Test 2: Check auth API endpoints
async function testAuthEndpoints() {
  console.log('\n2️⃣  Testing auth API endpoints...');
  
  const endpoints = [
    '/api/auth/session',
    '/api/auth/callback/google',
  ];
  
  for (const endpoint of endpoints) {
    await new Promise((resolve) => {
      const url = new URL(endpoint, APP_URL);
      const client = url.protocol === 'https:' ? https : http;
      
      const req = client.get(url.toString(), (res) => {
        // 401 is expected for session (not signed in)
        // 405 is expected for callback (needs POST)
        const expectedCodes = [200, 401, 405];
        
        if (expectedCodes.includes(res.statusCode)) {
          console.log(`   ✅ ${endpoint}: Available (${res.statusCode})`);
        } else {
          console.log(`   ⚠️  ${endpoint}: Unexpected status ${res.statusCode}`);
        }
        resolve();
      });
      
      req.on('error', () => {
        console.log(`   ❌ ${endpoint}: Error`);
        resolve();
      });
      
      req.setTimeout(5000, () => {
        req.destroy();
        resolve();
      });
    });
  }
}

// Test 3: Check environment variables
function testEnvironmentVariables() {
  console.log('\n3️⃣  Checking environment variables...');
  
  const vars = {
    'SUPABASE_DATABASE_URL': process.env.SUPABASE_DATABASE_URL,
    'NEXT_PUBLIC_SUPABASE_URL': process.env.NEXT_PUBLIC_SUPABASE_URL,
    'NEXT_PUBLIC_SUPABASE_ANON_KEY': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    'GOOGLE_CLIENT_ID': process.env.GOOGLE_CLIENT_ID,
    'GOOGLE_CLIENT_SECRET': process.env.GOOGLE_CLIENT_SECRET,
    'NEXT_PUBLIC_APP_URL': process.env.NEXT_PUBLIC_APP_URL,
  };
  
  let allSet = true;
  
  for (const [key, value] of Object.entries(vars)) {
    if (value) {
      const displayValue = value.length > 50 ? value.substring(0, 50) + '...' : value;
      console.log(`   ✅ ${key}`);
      if (key === 'SUPABASE_DATABASE_URL') {
        if (value.includes('pooler.supabase.com')) {
          console.log('      ⚠️  Warning: Using pooler connection (may cause issues)');
          console.log('      💡 Consider using direct connection: db.ljatyfyeqiicskahmzmp.supabase.co');
        } else {
          console.log('      ✅ Using direct connection');
        }
      }
    } else {
      console.log(`   ❌ ${key}: MISSING`);
      allSet = false;
    }
  }
  
  return allSet;
}

// Test 4: Check database tables
async function testDatabaseTables() {
  console.log('\n4️⃣  Checking database tables...');
  
  const { Pool } = require('pg');
  const pool = new Pool({
    connectionString: process.env.SUPABASE_DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });
  
  const tables = ['users', 'sessions', 'accounts', 'verifications'];
  let allExist = true;
  
  for (const table of tables) {
    try {
      const result = await pool.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = $1
        );
      `, [table]);
      
      if (result.rows[0].exists) {
        console.log(`   ✅ ${table} table exists`);
      } else {
        console.log(`   ❌ ${table} table is MISSING`);
        allExist = false;
      }
    } catch (error) {
      console.log(`   ❌ ${table} table: Error checking`);
      allExist = false;
    }
  }
  
  await pool.end();
  return allExist;
}

// Main test runner
async function runTests() {
  try {
    const envOk = testEnvironmentVariables();
    const serverOk = await testDevServer();
    
    if (serverOk) {
      await testAuthEndpoints();
    }
    
    const tablesOk = await testDatabaseTables();
    
    console.log('\n' + '='.repeat(60));
    console.log('\n📊 Test Summary:\n');
    
    if (envOk && serverOk && tablesOk) {
      console.log('✅ All tests passed!');
      console.log('\n🎉 Your authentication setup is ready to use');
      console.log('\n📝 Next steps:');
      console.log('   1. Visit: ' + APP_URL);
      console.log('   2. Click "Sign in with Google"');
      console.log('   3. Complete the OAuth flow');
      console.log('   4. You should be signed in successfully!');
    } else {
      console.log('⚠️  Some tests failed');
      console.log('\n💡 Recommendations:');
      
      if (!envOk) {
        console.log('   - Check your .env.local file');
        console.log('   - Ensure all required variables are set');
      }
      
      if (!serverOk) {
        console.log('   - Start the dev server: npm run dev');
        console.log('   - Check for any startup errors');
      }
      
      if (!tablesOk) {
        console.log('   - Run: node scripts/fix-supabase-auth.js');
        console.log('   - This will create missing tables');
      }
    }
    
    console.log('\n' + '='.repeat(60));
    
  } catch (error) {
    console.error('\n❌ Test failed with error:', error.message);
  }
}

runTests();
