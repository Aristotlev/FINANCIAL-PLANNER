const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '.env.local' });

// Try to get connection string from various env vars
const connectionString = process.env.SUPABASE_DATABASE_URL || process.env.DATABASE_URL || process.env.POSTGRES_URL;

if (!connectionString) {
  console.error('❌ Error: No database connection string found in .env.local');
  console.error('Please ensure SUPABASE_DATABASE_URL or DATABASE_URL is set.');
  process.exit(1);
}

const pool = new Pool({
  connectionString,
  ssl: { rejectUnauthorized: false },
});

async function applyFix() {
  try {
    const sqlPath = path.join(__dirname, 'supabase-fix-price-snapshots-permissions.sql');
    if (!fs.existsSync(sqlPath)) {
      throw new Error(`SQL file not found at ${sqlPath}`);
    }
    
    const sql = fs.readFileSync(sqlPath, 'utf8');
    console.log('Applying price snapshots permissions fix...');
    console.log('----------------------------------------');
    console.log(sql);
    console.log('----------------------------------------');
    
    await pool.query(sql);
    console.log('✅ Fix applied successfully!');
  } catch (e) {
    console.error('❌ Error applying fix:', e);
  } finally {
    await pool.end();
  }
}

applyFix();
