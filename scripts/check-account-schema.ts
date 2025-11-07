import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.SUPABASE_DATABASE_URL!,
  ssl: { rejectUnauthorized: false }
});

async function checkSchema() {
  try {
    console.log('🔍 Checking for Google accounts...\n');
    
    // Try to get one Google account to see what data exists
    const accountResult = await pool.query(`
      SELECT * FROM account WHERE "providerId" = 'google' LIMIT 1
    `);

    if (accountResult.rows.length > 0) {
      console.log('✅ Sample Google account columns:');
      const account = accountResult.rows[0];
      Object.keys(account).forEach(key => {
        console.log(`  - ${key}`);
      });
    } else {
      console.log('❌ No Google accounts found');
    }

  } catch (error: any) {
    console.error('❌ Error:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    await pool.end();
  }
}

checkSchema();
