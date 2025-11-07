/**
 * Script to force-refresh Google profile pictures for all users
 * Run this to fetch and save the latest profile pictures from Google
 * 
 * Usage: npx tsx scripts/refresh-google-avatar.ts
 */

import { Pool } from 'pg';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const pool = new Pool({
  connectionString: process.env.SUPABASE_DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
});

async function refreshGoogleAvatars() {
  try {
    console.log('🔍 Fetching users with Google accounts...\n');
    
    // Get all users with Google accounts
    const result = await pool.query(`
      SELECT 
        u.id, 
        u.email, 
        u.name, 
        u.image as current_image,
        a.access_token,
        a.provider
      FROM users u
      INNER JOIN accounts a ON u.id = a.user_id
      WHERE a.provider = 'google'
      ORDER BY u.created_at DESC
    `);

    if (result.rows.length === 0) {
      console.log('❌ No Google accounts found');
      await pool.end();
      return;
    }

    console.log(`✅ Found ${result.rows.length} Google account(s)\n`);

    for (const user of result.rows) {
      console.log(`\n👤 Processing: ${user.email}`);
      console.log(`   Current image: ${user.current_image || 'None'}`);

      if (!user.access_token) {
        console.log('   ⚠️  No access token found, skipping...');
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
            console.log('   💡 Access token might be expired. User needs to sign in again.');
          }
          continue;
        }

        const googleData = await googleResponse.json();
        console.log(`   📸 Google picture URL: ${googleData.picture}`);

        // Update database
        await pool.query(
          `UPDATE users 
           SET image = $1, 
               name = COALESCE(NULLIF(name, ''), $2),
               updated_at = NOW() 
           WHERE id = $3`,
          [googleData.picture, googleData.name, user.id]
        );

        console.log('   ✅ Successfully updated profile picture!');
        
      } catch (error: any) {
        console.log(`   ❌ Error: ${error.message}`);
      }
    }

    console.log('\n\n🎉 Profile picture refresh complete!\n');
    
  } catch (error) {
    console.error('❌ Script error:', error);
  } finally {
    await pool.end();
  }
}

refreshGoogleAvatars();
