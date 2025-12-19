const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

async function diagnose() {
  console.log('🔍 Starting Auth Diagnostics...');

  // 1. Check Environment Variables
  console.log('\n1. Checking Environment Variables:');
  const requiredVars = [
    'GOOGLE_CLIENT_ID',
    'GOOGLE_CLIENT_SECRET',
    'NEXT_PUBLIC_APP_URL',
    'SUPABASE_DATABASE_URL'
  ];

  let missingVars = false;
  requiredVars.forEach(varName => {
    if (!process.env[varName]) {
      console.error(`❌ Missing ${varName}`);
      missingVars = true;
    } else {
      const value = process.env[varName];
      const masked = value.length > 10 ? value.substring(0, 4) + '...' + value.substring(value.length - 4) : '****';
      console.log(`✅ ${varName} is set (${masked})`);
    }
  });

  if (missingVars) {
    console.error('❌ Critical environment variables are missing. Please check .env.local');
  }

  // 2. Check Database Connection
  console.log('\n2. Checking Database Connection:');
  if (!process.env.SUPABASE_DATABASE_URL) {
    console.log('❌ Skipping DB check due to missing connection string');
    return;
  }

  const pool = new Pool({
    connectionString: process.env.SUPABASE_DATABASE_URL,
    ssl: {
      rejectUnauthorized: false,
    },
  });

  try {
    const client = await pool.connect();
    console.log('✅ Successfully connected to the database');
    
    const res = await client.query('SELECT NOW()');
    console.log('✅ Database query successful:', res.rows[0]);
    
    // Check if users table exists (Better Auth needs it)
    try {
      const tableRes = await client.query("SELECT to_regclass('public.user') as table_exists");
      if (tableRes.rows[0].table_exists) {
        console.log('✅ "user" table exists');
      } else {
        // Better Auth might use 'users' or 'user' depending on config. 
        // In lib/auth.ts it doesn't specify table name, so it defaults to 'user'.
        // But wait, in lib/auth.ts onSignIn it queries 'users'.
        // Let's check both.
        const usersTableRes = await client.query("SELECT to_regclass('public.users') as table_exists");
        if (usersTableRes.rows[0].table_exists) {
             console.log('✅ "users" table exists');
        } else {
             console.warn('⚠️ Neither "user" nor "users" table found. Has migration run?');
        }
      }
    } catch (e) {
      console.warn('⚠️ Could not check for tables:', e.message);
    }

    client.release();
  } catch (err) {
    console.error('❌ Database connection failed:', err.message);
    if (err.message.includes('password authentication failed')) {
      console.error('   Hint: Check your database password in SUPABASE_DATABASE_URL');
    }
  } finally {
    await pool.end();
  }
}

diagnose().catch(console.error);
