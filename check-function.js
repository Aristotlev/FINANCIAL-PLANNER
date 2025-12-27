const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

const connectionString = process.env.SUPABASE_DATABASE_URL || process.env.DATABASE_URL;

const pool = new Pool({
  connectionString,
  ssl: { rejectUnauthorized: false },
});

async function checkFunction() {
  try {
    const res = await pool.query(`
      SELECT proname, proargnames, proargtypes::regtype[]
      FROM pg_proc
      WHERE proname = 'can_make_ai_call';
    `);
    console.log('Functions found:', res.rows);

    const res2 = await pool.query(`
      SELECT proname, proargnames, proargtypes::regtype[]
      FROM pg_proc
      WHERE proname = 'increment_ai_call_count';
    `);
    console.log('increment_ai_call_count found:', res2.rows);

  } catch (e) {
    console.error(e);
  } finally {
    await pool.end();
  }
}

checkFunction();
