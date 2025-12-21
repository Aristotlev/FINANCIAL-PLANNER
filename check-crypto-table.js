#!/usr/bin/env node

const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

const connectionString = process.env.SUPABASE_DATABASE_URL || process.env.DATABASE_URL;

if (!connectionString) {
  console.error('❌ No database connection string found in .env.local');
  process.exit(1);
}

const pool = new Pool({
  connectionString,
  ssl: {
    rejectUnauthorized: false,
  },
});

async function checkTables() {
  const tablesToCheck = [
    'expense_categories', 
    'subscriptions', 
    'savings_accounts', 
    'real_estate', 
    'valuable_items',
    'stock_holdings',
    'debt_accounts'
  ];

  try {
    for (const table of tablesToCheck) {
      console.log(`🔍 Checking ${table} table...`);
      
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
          SELECT column_name, data_type, is_nullable
          FROM information_schema.columns 
          WHERE table_name = $1
          ORDER BY ordinal_position;
        `, [table]);
        
        console.log(`   Columns (${columns.rows.length}):`);
        columns.rows.forEach(col => {
          console.log(`   - ${col.column_name} (${col.data_type}) ${col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL'}`);
        });
        console.log();
      }
    }

  } catch (error) {
    console.error('\n❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

checkTables();
