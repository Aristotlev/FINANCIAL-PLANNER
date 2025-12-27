const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '.env.local' });

const connectionString = process.env.SUPABASE_DATABASE_URL || process.env.DATABASE_URL;

const pool = new Pool({
  connectionString,
  ssl: { rejectUnauthorized: false },
});

async function applyWrappers() {
  try {
    const sql = fs.readFileSync(path.join(__dirname, 'supabase-add-uuid-wrappers.sql'), 'utf8');
    console.log('Applying UUID wrappers...');
    await pool.query(sql);
    console.log('Wrappers applied successfully!');
  } catch (e) {
    console.error('Error applying wrappers:', e);
  } finally {
    await pool.end();
  }
}

applyWrappers();
