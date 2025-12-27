const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '.env.local' });

const connectionString = process.env.SUPABASE_DATABASE_URL || process.env.DATABASE_URL;

const pool = new Pool({
  connectionString,
  ssl: { rejectUnauthorized: false },
});

async function applyFix() {
  try {
    const sql = fs.readFileSync(path.join(__dirname, 'supabase-fix-rpc-text-only.sql'), 'utf8');
    console.log('Applying fix...');
    await pool.query(sql);
    console.log('Fix applied successfully!');
  } catch (e) {
    console.error('Error applying fix:', e);
  } finally {
    await pool.end();
  }
}

applyFix();
