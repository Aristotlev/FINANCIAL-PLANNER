import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session) {
      return NextResponse.json({ 
        authenticated: false,
        message: "No session found" 
      });
    }

    // Return the complete session object for debugging
    return NextResponse.json({
      authenticated: true,
      session: {
        user: session.user,
        session: session.session,
      },
      // Log what fields are available
      availableFields: Object.keys(session.user),
    });
  } catch (error) {
    console.error("Debug session error:", error);
    return NextResponse.json({ 
      error: "Failed to get session",
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
