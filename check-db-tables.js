#!/usr/bin/env node

const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

const pool = new Pool({
  connectionString: process.env.SUPABASE_DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
});

async function checkTables() {
  try {
    console.log('🔍 Checking Better Auth database tables...\n');

    // Check for required tables
    const requiredTables = ['users', 'sessions', 'accounts', 'verifications'];
    
    for (const table of requiredTables) {
      const result = await pool.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_name = $1
        );
      `, [table]);
      
      const exists = result.rows[0].exists;
      console.log(`${exists ? '✅' : '❌'} Table "${table}": ${exists ? 'EXISTS' : 'MISSING'}`);
      
      if (exists) {
        // Get column count
        const columns = await pool.query(`
          SELECT table_schema, column_name, data_type 
          FROM information_schema.columns 
          WHERE table_name = $1
          ORDER BY table_schema, ordinal_position;
        `, [table]);
        
        console.log(`   Columns (${columns.rows.length}):`);
        columns.rows.forEach(col => {
          console.log(`   - [${col.table_schema}] ${col.column_name} (${col.data_type})`);
        });
        console.log();
      }
    }

    // Try a test query on users table
    console.log('📊 Sample query on users table:');
    const users = await pool.query('SELECT id, email, name, created_at FROM users LIMIT 3');
    console.log(`   Found ${users.rows.length} users:`);
    users.rows.forEach(user => {
      console.log(`   - ${user.email} (${user.name || 'No name'})`);
    });

    // Count sessions
    const sessions = await pool.query('SELECT count(*) FROM sessions');
    console.log(`   Total sessions: ${sessions.rows[0].count}`);

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error('\nFull error:', error);
  } finally {
    await pool.end();
  }
}

checkTables();
