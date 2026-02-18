import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getSupabaseAdmin } from '@/lib/supabase/server';

// ─── Server-side image compression with Canvas API (Node 18+) ───────────────
// Falls back to raw upload if the sharp package isn't available.
async function compressToWebP(buffer: Uint8Array, mimeType: string): Promise<{ data: Uint8Array; contentType: string }> {
  try {
    // Try sharp if installed (add `sharp` to package.json for best results)
    const sharp = await import('sharp').catch(() => null);
    if (sharp) {
      const compressed = await sharp.default(Buffer.from(buffer))
        .resize({ width: 200, height: 200, fit: 'cover', position: 'centre' })
        .webp({ quality: 85 })
        .toBuffer();
      return { data: new Uint8Array(compressed), contentType: 'image/webp' };
    }
  } catch {
    // sharp not available — fall through to raw upload
  }
  return { data: buffer, contentType: mimeType };
}

export async function POST(req: NextRequest) {
  try {
    // 1. Verify session
    const session = await auth.api.getSession({
      headers: req.headers,
    });

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Get file from request
    const formData = await req.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Validate file type and size
    if (!file.type.startsWith('image/')) {
      return NextResponse.json({ error: 'File must be an image' }, { status: 400 });
    }

    if (file.size > 5 * 1024 * 1024) { // 5MB limit before compression
      return NextResponse.json({ error: 'File size must be less than 5MB' }, { status: 400 });
    }

    // 3. Compress to 200×200 WebP (avatars don't need to be large)
    const arrayBuffer = await file.arrayBuffer();
    const rawBuffer = new Uint8Array(arrayBuffer);
    const { data: compressed, contentType } = await compressToWebP(rawBuffer, file.type);

    // 4. Upload to Supabase Storage — one file per user (upsert overwrites the old one)
    const supabase = getSupabaseAdmin();
    const ext      = contentType === 'image/webp' ? 'webp' : (file.name.split('.').pop() ?? 'jpg');
    const filePath = `${session.user.id}/avatar.${ext}`;

    const { error } = await supabase.storage
      .from('avatars')
      .upload(filePath, compressed, {
        contentType,
        upsert: true,          // replaces the previous avatar → no orphaned files
      });

    if (error) {
      console.error('Supabase storage error:', error);
      return NextResponse.json({ error: 'Failed to upload image' }, { status: 500 });
    }

    // 5. Return public URL
    const { data: { publicUrl } } = supabase.storage
      .from('avatars')
      .getPublicUrl(filePath);

    return NextResponse.json({ url: publicUrl });

  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
