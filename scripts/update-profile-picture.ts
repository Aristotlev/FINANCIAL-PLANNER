import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.SUPABASE_DATABASE_URL!,
  ssl: { rejectUnauthorized: false }
});

async function updateProfilePicture() {
  try {
    console.log('🔍 Finding Google accounts...\n');
    
    // Get all users with Google accounts
    const result = await pool.query(`
      SELECT 
        u.id,
        u.email,
        u.name,
        u.image,
        a.access_token
      FROM users u
      INNER JOIN accounts a ON u.id = a.user_id
      WHERE a.provider = 'google'
      ORDER BY u.created_at DESC
    `);

    if (result.rows.length === 0) {
      console.log('❌ No Google accounts found');
      return;
    }

    console.log(`Found ${result.rows.length} Google account(s)\n`);
    
    for (const user of result.rows) {
      console.log(`👤 Processing: ${user.email}`);
      console.log(`   Current image: ${user.image || 'None'}`);
      
      if (!user.access_token) {
        console.log(`   ⚠️ No access token - skipping`);
        continue;
      }
      
      try {
        // Fetch profile from Google
        const googleResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
          headers: {
            Authorization: `Bearer ${user.access_token}`,
          },
        });

        if (!googleResponse.ok) {
          console.log(`   ❌ Google API error: ${googleResponse.status}`);
          if (googleResponse.status === 401) {
            console.log(`   💡 Token expired - user needs to sign in again`);
          }
          continue;
        }

        const googleData = await googleResponse.json();
        console.log(`   📸 Google picture URL: ${googleData.picture}`);
        console.log(`   👤 Google name: ${googleData.name}`);

        // Update database
        await pool.query(
          `UPDATE users 
           SET image = $1, 
               name = COALESCE(NULLIF(name, ''), $2),
               updated_at = NOW() 
           WHERE id = $3`,
          [googleData.picture, googleData.name, user.id]
        );

        console.log(`   ✅ Successfully updated profile picture!\n`);
      } catch (error: any) {
        console.log(`   ❌ Error: ${error.message}\n`);
      }
    }

    console.log('🎉 Profile picture update complete!');
  } catch (error: any) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

updateProfilePicture();
