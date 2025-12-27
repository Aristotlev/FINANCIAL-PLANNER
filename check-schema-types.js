const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

const connectionString = process.env.SUPABASE_DATABASE_URL || process.env.DATABASE_URL;

const pool = new Pool({
  connectionString,
  ssl: { rejectUnauthorized: false },
});

async function checkSchema() {
  try {
    const res = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'user_subscriptions' AND column_name = 'user_id';
    `);
    console.log('user_subscriptions.user_id type:', res.rows[0]);
    
    const res2 = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'user_usage' AND column_name = 'user_id';
    `);
    console.log('user_usage.user_id type:', res2.rows[0]);

    const res3 = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'ai_chat_logs' AND column_name = 'user_id';
    `);
    console.log('ai_chat_logs.user_id type:', res3.rows[0]);

    const res4 = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'user_subscriptions' AND column_name = 'id';
    `);
    console.log('user_subscriptions.id type:', res4.rows[0]);

  } catch (e) {
    console.error(e);
  } finally {
    await pool.end();
  }
}

checkSchema();
