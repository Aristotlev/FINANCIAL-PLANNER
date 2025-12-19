const { Pool } = require('pg');

const password = 'rdejGLlonaPARW2q';
const projectRef = 'ljatyfyeqiicskahmzmp';

const configs = [
  {
    name: 'Direct DB (Standard)',
    url: `postgresql://postgres:${password}@db.${projectRef}.supabase.co:5432/postgres`
  },
  {
    name: 'Pooler (AWS-1, Port 5432)',
    url: `postgresql://postgres.${projectRef}:${password}@aws-1-eu-west-2.pooler.supabase.com:5432/postgres`
  },
  {
    name: 'Pooler (AWS-0, Port 5432)',
    url: `postgresql://postgres.${projectRef}:${password}@aws-0-eu-west-2.pooler.supabase.com:5432/postgres`
  },
  {
    name: 'Pooler (AWS-0, Port 6543)',
    url: `postgresql://postgres.${projectRef}:${password}@aws-0-eu-west-2.pooler.supabase.com:6543/postgres`
  }
];

async function testConnections() {
  console.log('🔍 Testing multiple connection strings...\n');

  for (const config of configs) {
    console.log(`Testing: ${config.name}`);
    console.log(`URL: ${config.url.replace(password, '****')}`);
    
    const pool = new Pool({
      connectionString: config.url,
      ssl: { rejectUnauthorized: false },
      connectionTimeoutMillis: 5000 // 5s timeout
    });

    try {
      const client = await pool.connect();
      console.log('✅ SUCCESS! Connected.');
      const res = await client.query('SELECT NOW()');
      console.log('   Query result:', res.rows[0]);
      client.release();
      
      // If successful, print the working URL
      console.log('\n🎉 FOUND WORKING CONNECTION STRING:');
      console.log(config.url);
      console.log('\nPlease update your .env.local with this URL.');
      
      await pool.end();
      return; // Stop after finding a working one
    } catch (err) {
      console.log(`❌ Failed: ${err.message}\n`);
    } finally {
      await pool.end();
    }
  }
  
  console.log('❌ All connection attempts failed.');
}

testConnections();
