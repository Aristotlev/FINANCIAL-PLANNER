import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { Pool } from "pg";

// Create PostgreSQL pool
const pool = new Pool({
  connectionString: process.env.SUPABASE_DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
});

export async function GET() {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    console.log('🎨 Avatar endpoint called, session exists:', !!session);

    if (!session) {
      console.log('⚠️ No session - returning default avatar');
      // Return a default avatar SVG
      return new NextResponse(
        `<svg width="96" height="96" viewBox="0 0 96 96" xmlns="http://www.w3.org/2000/svg">
          <circle cx="48" cy="48" r="48" fill="#3b82f6"/>
          <path d="M48 48c8.837 0 16-7.163 16-16s-7.163-16-16-16-16 7.163-16 16 7.163 16 16 16zm0 8c-10.667 0-32 5.333-32 16v8h64v-8c0-10.667-21.333-16-32-16z" fill="#fff"/>
        </svg>`,
        {
          headers: {
            'Content-Type': 'image/svg+xml',
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0',
          },
        }
      );
    }

    console.log('👤 User ID:', session.user.id);

    // Get user's image URL from database
    const result = await pool.query(
      'SELECT image FROM users WHERE id = $1',
      [session.user.id]
    );

    let imageUrl = result.rows.length > 0 ? result.rows[0].image : null;
    console.log('📸 Image URL from DB:', imageUrl || 'None');

    // If no image in database, try to fetch from Google
    if (!imageUrl) {
      try {
        const accountResult = await pool.query(
          `SELECT access_token FROM accounts 
           WHERE user_id = $1 AND provider = 'google'
           ORDER BY created_at DESC LIMIT 1`,
          [session.user.id]
        );

        if (accountResult.rows.length > 0 && accountResult.rows[0].access_token) {
          const googleResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
            headers: {
              Authorization: `Bearer ${accountResult.rows[0].access_token}`,
            },
          });

          if (googleResponse.ok) {
            const googleData = await googleResponse.json();
            imageUrl = googleData.picture;
            
            // Save to database for next time
            if (imageUrl) {
              await pool.query(
                'UPDATE users SET image = $1 WHERE id = $2',
                [imageUrl, session.user.id]
              );
              console.log('✅ Fetched and saved profile picture from Google');
            }
          }
        }
      } catch (error) {
        console.error('Error fetching from Google:', error);
      }
    }

    if (!imageUrl) {
      console.log('⚠️ No image URL - returning initials avatar');
      // Return a personalized default avatar with user's initials
      const initials = session.user.name 
        ? session.user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
        : session.user.email.slice(0, 2).toUpperCase();
      
      console.log('🔤 Generated initials:', initials);
      
      return new NextResponse(
        `<svg width="96" height="96" viewBox="0 0 96 96" xmlns="http://www.w3.org/2000/svg">
          <circle cx="48" cy="48" r="48" fill="#3b82f6"/>
          <text x="48" y="58" font-family="Arial, sans-serif" font-size="36" font-weight="bold" fill="#fff" text-anchor="middle">${initials}</text>
        </svg>`,
        {
          headers: {
            'Content-Type': 'image/svg+xml',
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0',
          },
        }
      );
    }

    console.log('✅ Found image URL, proxying...');
    
    // If it's a Google profile picture, proxy it to avoid CORS issues
    if (imageUrl.includes('googleusercontent.com')) {
      try {
        const imageResponse = await fetch(imageUrl, {
          headers: {
            'User-Agent': 'Money Hub App',
          },
        });

        if (!imageResponse.ok) {
          throw new Error(`Failed to fetch image: ${imageResponse.status}`);
        }

        const imageBuffer = await imageResponse.arrayBuffer();
        const contentType = imageResponse.headers.get('content-type') || 'image/jpeg';

        console.log('✅ Successfully proxied Google image');

        return new NextResponse(imageBuffer, {
          headers: {
            'Content-Type': contentType,
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0',
          },
        });
      } catch (error) {
        console.error('❌ Error proxying Google image:', error);
        // Fall through to return initials avatar
        const initials = session.user.name 
          ? session.user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
          : session.user.email.slice(0, 2).toUpperCase();
        
        return new NextResponse(
          `<svg width="96" height="96" viewBox="0 0 96 96" xmlns="http://www.w3.org/2000/svg">
            <circle cx="48" cy="48" r="48" fill="#3b82f6"/>
            <text x="48" y="58" font-family="Arial, sans-serif" font-size="36" font-weight="bold" fill="#fff" text-anchor="middle">${initials}</text>
          </svg>`,
          {
            headers: {
              'Content-Type': 'image/svg+xml',
              'Cache-Control': 'no-cache, no-store, must-revalidate',
              'Pragma': 'no-cache',
              'Expires': '0',
            },
          }
        );
      }
    }

    console.log('🔀 Redirecting to external image URL');
    // For other image URLs, redirect to them
    return NextResponse.redirect(imageUrl);
  } catch (error) {
    console.error("❌ Error fetching avatar:", error);
    
    // Return default avatar on error
    return new NextResponse(
      `<svg width="96" height="96" viewBox="0 0 96 96" xmlns="http://www.w3.org/2000/svg">
        <circle cx="48" cy="48" r="48" fill="#3b82f6"/>
        <path d="M48 48c8.837 0 16-7.163 16-16s-7.163-16-16-16-16 7.163-16 16 7.163 16 16 16zm0 8c-10.667 0-32 5.333-32 16v8h64v-8c0-10.667-21.333-16-32-16z" fill="#fff"/>
      </svg>`,
      {
        headers: {
          'Content-Type': 'image/svg+xml',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
        },
      }
    );
  }
}
