const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.SUPABASE_DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
});

async function checkUserImage() {
  try {
    console.log('🔍 Checking user images in database...\n');
    
    const result = await pool.query(`
      SELECT id, email, name, image, created_at, updated_at 
      FROM users 
      ORDER BY created_at DESC
      LIMIT 5
    `);
    
    console.log(`Found ${result.rows.length} users:\n`);
    
    result.rows.forEach((user, index) => {
      console.log(`User ${index + 1}:`);
      console.log(`  Email: ${user.email}`);
      console.log(`  Name: ${user.name || 'Not set'}`);
      console.log(`  Image: ${user.image || 'No image'}`);
      console.log(`  Created: ${user.created_at}`);
      console.log(`  Updated: ${user.updated_at}`);
      console.log('');
    });
    
    await pool.end();
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkUserImage();
