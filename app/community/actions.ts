"use server";

import { headers } from "next/headers";
import { auth } from "../../lib/auth";
import { getSupabaseAdmin } from "../../lib/supabase/server";

async function checkCommunityPermission(userId: string, supabase: any, userEmail?: string) {
  // Admin bypass
  if (userEmail === 'ariscsc@gmail.com') {
    return true;
  }

  const { data, error } = await supabase.rpc('can_interact_with_community', { p_user_id: userId });
  if (error) {
    console.error("Error checking community permission:", error);
    return false; 
  }
  return !!data;
}

export async function createPost(content: string, imageUrl?: string, sentiment?: 'bullish' | 'bearish' | null) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      throw new Error("Not authenticated");
    }

    const supabase = getSupabaseAdmin();
    
    // Check permission
    const canInteract = await checkCommunityPermission(session.user.id, supabase, session.user.email || undefined);
    if (!canInteract) {
        throw new Error("You must be on a paid plan to interact with the community.");
    }
    
    // Ensure user exists in public.users to prevent FK violation
    const { data: userExists } = await supabase
      .from('users')
      .select('id')
      .eq('id', session.user.id)
      .single();

    if (!userExists) {
      console.log("User not found in public.users, creating sync record...");
      const { error: createUserError } = await supabase
        .from('users' as any)
        .insert({
          id: session.user.id,
          email: session.user.email || `user-${session.user.id}@example.com`,
          name: session.user.name || 'Unknown User',
          image: session.user.image,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          email_verified: (session.user as any).emailVerified || false
        } as any);
      
      if (createUserError) {
        console.error("Error creating user sync record:", createUserError);
        // If error is duplicate key, that's fine (race condition)
        // But if it's something else, we should stop because post insert will fail
        if (!createUserError.message.includes('duplicate key')) {
             // Try to proceed anyway, maybe it was a race condition and user exists now?
             // But logging it is important.
        }
      }
    }
    
    const { data, error } = await supabase
      .from('posts')
      .insert({
        user_id: session.user.id,
        content: content,
        image_url: imageUrl || null,
        sentiment: sentiment || null,
      } as any)
      .select()
      .single();

    if (error) {
      console.error("Supabase insert error:", error);
      throw new Error(error.message);
    }

    // Handle hashtags
    const hashtags = content.match(/#[\w]+/g);
    if (hashtags && data) {
      const uniqueHashtags = [...new Set(hashtags)];
      
      for (const tag of uniqueHashtags) {
        // Check if hashtag exists
        const { data: existingTag } = await supabase
          .from('hashtags' as any)
          .select('id, count')
          .eq('tag', tag)
          .single();
          
        let hashtagId;
        
        if (existingTag) {
          hashtagId = (existingTag as any).id;
          // Increment count
          const queryBuilder: any = supabase.from('hashtags' as any);
          await queryBuilder
            .update({ count: (existingTag as any).count + 1 })
            .eq('id', hashtagId);
        } else {
          // Create new hashtag
          const { data: newTag, error: createTagError } = await supabase
            .from('hashtags' as any)
            .insert({ tag, count: 1 } as any)
            .select('id')
            .single();
            
          if (createTagError) {
            // If error is duplicate key (race condition), fetch the existing one
            const { data: retryTag } = await supabase
              .from('hashtags' as any)
              .select('id')
              .eq('tag', tag)
              .single();
            if (retryTag) hashtagId = (retryTag as any).id;
          } else {
            hashtagId = (newTag as any).id;
          }
        }
        
        if (hashtagId) {
          // Link to post
          await supabase
            .from('post_hashtags' as any)
            .insert({
              post_id: (data as any).id,
              hashtag_id: hashtagId
            } as any);
        }
      }
    }

    return { success: true, post: data };
  } catch (error) {
    console.error("Create post error:", error);
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
  }
}

export async function toggleLike(postId: string) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      throw new Error("Not authenticated");
    }

    const supabase = getSupabaseAdmin();
    const userId = session.user.id;

    // Ensure user exists in public.users (self-healing)
    const { data: userExists } = await supabase
      .from('users')
      .select('id')
      .eq('id', userId)
      .single();

    if (!userExists) {
      await supabase.from('users').insert({
        id: userId,
        email: session.user.email,
        name: session.user.name,
        image: session.user.image,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        email_verified: (session.user as any).emailVerified || false
      } as any);
    }

    // Check if already liked
    const { data: existingLike } = await supabase
      .from('post_likes')
      .select('*')
      .eq('post_id', postId)
      .eq('user_id', userId)
      .single();

    if (existingLike) {
      // Unlike
      const { error } = await supabase
        .from('post_likes')
        .delete()
        .eq('post_id', postId)
        .eq('user_id', userId);
        
      if (error) throw error;
      return { success: true, action: 'unliked' };
    } else {
      // Like
      const { error } = await supabase
        .from('post_likes')
        .insert({
          post_id: postId,
          user_id: userId
        } as any);
        
      if (error) throw error;
      return { success: true, action: 'liked' };
    }
  } catch (error) {
    console.error("Toggle like error:", error);
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
  }
}

export async function deletePost(postId: string) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      throw new Error("Not authenticated");
    }

    const supabase = getSupabaseAdmin();
    
    // Verify ownership
    const { data: post } = await supabase
      .from('posts')
      .select('user_id')
      .eq('id', postId)
      .single();

    if (!post) throw new Error("Post not found");
    if ((post as any).user_id !== session.user.id) throw new Error("Unauthorized");

    const { error } = await supabase
      .from('posts')
      .delete()
      .eq('id', postId);

    if (error) throw error;

    return { success: true };
  } catch (error) {
    console.error("Delete post error:", error);
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
  }
}

export async function createComment(postId: string, content: string) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      throw new Error("Not authenticated");
    }

    const supabase = getSupabaseAdmin();
    const userId = session.user.id;

    // Check permission
    const canInteract = await checkCommunityPermission(userId, supabase, session.user.email || undefined);
    if (!canInteract) {
        throw new Error("You must be on a paid plan to interact with the community.");
    }

    // Ensure user exists in public.users (self-healing)
    const { data: userExists } = await supabase
      .from('users')
      .select('id')
      .eq('id', userId)
      .single();

    if (!userExists) {
      await supabase.from('users').insert({
        id: userId,
        email: session.user.email,
        name: session.user.name,
        image: session.user.image,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        email_verified: (session.user as any).emailVerified || false
      } as any);
    }

    const { data, error } = await supabase
      .from('comments')
      .insert({
        post_id: postId,
        user_id: userId,
        content: content
      } as any)
      .select(`
        *,
        users:users!comments_user_id_fkey (name, image)
      `)
      .single();

    if (error) {
      console.error("Supabase insert comment error:", error);
      throw new Error(error.message);
    }

    return { success: true, comment: data };
  } catch (error) {
    console.error("Create comment error:", error);
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
  }
}

export async function deleteComment(commentId: string) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      throw new Error("Not authenticated");
    }

    const supabase = getSupabaseAdmin();
    
    // Verify ownership
    const { data: comment } = await supabase
      .from('comments')
      .select('user_id')
      .eq('id', commentId)
      .single();

    if (!comment) throw new Error("Comment not found");
    if ((comment as any).user_id !== session.user.id) throw new Error("Unauthorized");

    const { error } = await supabase
      .from('comments')
      .delete()
      .eq('id', commentId);

    if (error) throw error;

    return { success: true };
  } catch (error) {
    console.error("Delete comment error:", error);
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
  }
}

export async function updateProfile(data: { name?: string; bio?: string; location?: string; website?: string }) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      throw new Error("Not authenticated");
    }

    const supabase = getSupabaseAdmin();
    const userId = session.user.id;

    const updates: any = {
      updated_at: new Date().toISOString(),
    };

    if (data.name !== undefined) updates.name = data.name;
    if (data.bio !== undefined) updates.bio = data.bio;
    if (data.location !== undefined) updates.location = data.location;
    if (data.website !== undefined) updates.website = data.website;

    const { error } = await (supabase
      .from('users' as any) as any)
      .update(updates)
      .eq('id', userId);

    if (error) throw error;

    return { success: true };
  } catch (error) {
    console.error("Update profile error:", error);
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
  }
}
