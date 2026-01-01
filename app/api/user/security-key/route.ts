import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getSupabaseAdmin } from '@/lib/supabase/server';
import { encrypt, decrypt } from '@/lib/server-encryption';

export async function POST(req: NextRequest) {
  try {
    // 1. Verify session
    const session = await auth.api.getSession({
      headers: req.headers,
    });

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { securityKey } = await req.json();

    if (!securityKey) {
      return NextResponse.json({ error: 'Security key is required' }, { status: 400 });
    }

    // 2. Encrypt the key before saving
    const encryptedKey = encrypt(securityKey);

    // 3. Update user_preferences using service role
    const supabase = getSupabaseAdmin();
    
    const { error } = await supabase
      .from('user_preferences')
      .upsert({
        user_id: session.user.id,
        has_seen_security_modal: true,
        security_key: encryptedKey, // Save encrypted key
        updated_at: new Date().toISOString()
      } as any, { onConflict: 'user_id' });

    if (error) {
      console.error('Error updating security key:', error);
      return NextResponse.json({ error: 'Failed to save security key' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in security key route:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    // 1. Verify session
    const session = await auth.api.getSession({
      headers: req.headers,
    });

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Fetch user_preferences using service role
    const supabase = getSupabaseAdmin();
    
    const { data, error } = await supabase
      .from('user_preferences')
      .select('security_key, has_seen_security_modal')
      .eq('user_id', session.user.id)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Error fetching security key:', error);
      return NextResponse.json({ error: 'Failed to fetch security key' }, { status: 500 });
    }

    // 3. Decrypt the key if it exists
    let decryptedKey = null;
    if ((data as any)?.security_key) {
      decryptedKey = decrypt((data as any).security_key);
    }

    return NextResponse.json({ 
      securityKey: decryptedKey,
      hasSeenModal: (data as any)?.has_seen_security_modal || false
    });
  } catch (error) {
    console.error('Error in security key route:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
