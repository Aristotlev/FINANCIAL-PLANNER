const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '.env.local' });

const pool = new Pool({
  connectionString: process.env.SUPABASE_DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
});

async function runMigration() {
  try {
    const sqlPath = process.argv[2];
    if (!sqlPath) {
      console.error('Please provide the path to the SQL file.');
      process.exit(1);
    }

    const sql = fs.readFileSync(sqlPath, 'utf8');
    console.log(`Running migration from ${sqlPath}...`);

    await pool.query(sql);
    console.log('Migration completed successfully.');
  } catch (error) {
    console.error('Error running migration:', error);
  } finally {
    await pool.end();
  }
}

runMigration();
