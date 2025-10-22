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

    if (!session) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    // Query the users table directly for the profile picture
    const result = await pool.query(
      'SELECT id, email, name, image FROM users WHERE id = $1',
      [session.user.id]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ 
        user: session.user,
        message: "User not found in database" 
      });
    }

    const userData = result.rows[0];
    
    return NextResponse.json({
      user: {
        id: userData.id,
        email: userData.email,
        name: userData.name,
        image: userData.image,
      },
      source: 'database'
    });
  } catch (error) {
    console.error("Error fetching profile picture:", error);
    return NextResponse.json({ 
      error: "Failed to fetch profile picture",
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
