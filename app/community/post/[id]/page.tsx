import { Metadata } from 'next';
import { getSupabaseAdmin } from '../../../../lib/supabase/server';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

type Props = {
  params: Promise<{ id: string }>
}

interface Post {
  id: string;
  user_id: string;
  content: string;
  image_url: string | null;
  created_at: string;
  users: {
    name: string;
    image: string | null;
  } | null;
}

async function getPost(id: string): Promise<Post | null> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from('posts')
    .select(`
      *,
      users:users!posts_user_id_fkey (name, image)
    `)
    .eq('id', id)
    .single();

  if (error || !data) {
    return null;
  }

  return data as any as Post;
}

export async function generateMetadata(
  { params }: Props
): Promise<Metadata> {
  const { id } = await params;
  const post = await getPost(id);

  if (!post) {
    return {
      title: 'Post not found',
    };
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://www.omnifolio.app';
  
  const userName = post.users?.name || 'User';
  let userImage = post.users?.image || '';
  
  // Ensure userImage is absolute for OG generation
  if (userImage && userImage.startsWith('/')) {
    userImage = `${baseUrl}${userImage}`;
  }

  const content = post.content || '';
  const date = new Date(post.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  const queryString = new URLSearchParams({
    type: 'post',
    content: content.substring(0, 300), // Truncate content for URL safety
    user: userName,
    userImage: userImage,
    date: date,
  });

  const ogUrl = `${baseUrl}/api/og?${queryString.toString()}`;

  return {
    title: `Post by ${userName} on Omnifolio`,
    description: content.substring(0, 160),
    openGraph: {
      title: `Post by ${userName} on Omnifolio`,
      description: content.substring(0, 160),
      url: `${baseUrl}/community/post/${id}`,
      siteName: 'OmniFolio',
      images: [
        {
          url: ogUrl,
          width: 1200,
          height: 630,
          alt: `Post by ${userName}`,
        },
      ],
      locale: 'en_US',
      type: 'article',
    },
    twitter: {
      card: 'summary_large_image',
      title: `Post by ${userName} on Omnifolio`,
      description: content.substring(0, 160),
      images: [ogUrl],
    },
  };
}

export default async function PostPage({ params }: Props) {
  const { id } = await params;
  const post = await getPost(id);

  if (!post) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-black text-gray-100 p-4 flex justify-center">
      <div className="max-w-2xl w-full">
        <Link href="/community" className="flex items-center text-gray-400 hover:text-white mb-6 transition-colors">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Community
        </Link>
        
        <div className="bg-gray-900 rounded-xl border border-gray-800 p-6">
          <div className="flex gap-4">
            <div className="h-12 w-12 rounded-full overflow-hidden flex-shrink-0">
              <img 
                src={post.users?.image || '/api/auth/avatar'} 
                alt={post.users?.name || 'User'} 
                className="h-full w-full object-cover" 
              />
            </div>
            <div className="flex-1">
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="font-bold text-white text-lg">{post.users?.name || 'Unknown User'}</h2>
                  <p className="text-gray-500 text-sm">
                    {new Date(post.created_at).toLocaleDateString('en-US', { 
                      month: 'long', 
                      day: 'numeric', 
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </p>
                </div>
              </div>
              
              <p className="text-gray-200 mt-4 text-lg whitespace-pre-wrap leading-relaxed">{post.content}</p>
              
              {post.image_url && (
                <div className="mt-4 rounded-xl overflow-hidden border border-gray-800">
                  <img src={post.image_url} alt="Post content" className="w-full h-auto" />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
