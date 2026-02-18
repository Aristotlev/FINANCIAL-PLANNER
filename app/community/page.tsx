"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useBetterAuth } from '../../contexts/better-auth-context';
import { supabase } from '../../lib/supabase/client';
import { 
  Users, 
  MessageSquare, 
  Heart, 
  Share2, 
  MoreHorizontal, 
  MapPin, 
  Link as LinkIcon, 
  Calendar,
  Edit3,
  Image as ImageIcon,
  Smile,
  TrendingUp,
  UserPlus,
  Search,
  Bell,
  Trash2,
  Loader2,
  Send,
  ArrowUp,
  ArrowDown
} from 'lucide-react';
import { FaFacebook, FaTwitter, FaLinkedin, FaLink } from 'react-icons/fa';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Sidebar } from '../../components/portfolio/sidebar';
import { TopBar } from '../../components/portfolio/top-bar';
import { SettingsModal } from '../../components/settings/settings-modal';
import { AIChatAssistant } from '../../components/ui/ai-chat';
import { createPost, toggleLike, deletePost, createComment, deleteComment, updateProfile } from './actions';

// Helper for time ago
function timeAgo(dateString: string) {
  const date = new Date(dateString);
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  
  let interval = seconds / 31536000;
  if (interval > 1) return Math.floor(interval) + "y ago";
  
  interval = seconds / 2592000;
  if (interval > 1) return Math.floor(interval) + "mo ago";
  
  interval = seconds / 86400;
  if (interval > 1) return Math.floor(interval) + "d ago";
  
  interval = seconds / 3600;
  if (interval > 1) return Math.floor(interval) + "h ago";
  
  interval = seconds / 60;
  if (interval > 1) return Math.floor(interval) + "m ago";
  
  return Math.floor(seconds) + "s ago";
}

interface Comment {
  id: string;
  post_id: string;
  user_id: string;
  content: string;
  created_at: string;
  users: {
    name: string;
    image: string | null;
  } | null;
}

interface Post {
  id: string;
  user_id: string;
  content: string;
  image_url: string | null;
  sentiment: 'bullish' | 'bearish' | null;
  created_at: string;
  users: {
    name: string;
    image: string | null;
  } | null;
  likes_count: number;
  comments_count: number;
  user_has_liked: boolean;
}

export default function CommunityPage() {
  const { user } = useBetterAuth();
  const router = useRouter();
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  
  const handleSearchNavigation = (type: string, id?: string) => {
      router.push('/portfolio');
  };
  const [activeTab, setActiveTab] = useState('posts');
  const [posts, setPosts] = useState<Post[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [newPostContent, setNewPostContent] = useState('');
  const [isPosting, setIsPosting] = useState(false);
  const [likedPosts, setLikedPosts] = useState<Set<string>>(new Set());
  const [trendingTopics, setTrendingTopics] = useState<{tag: string, count: number}[]>([]);
  const [suggestedUsers, setSuggestedUsers] = useState<{
    user_id: string;
    name: string;
    image: string | null;
    total_likes: number;
  }[]>([]);
  
  // Comments state
  const [expandedPostId, setExpandedPostId] = useState<string | null>(null);
  const [comments, setComments] = useState<Record<string, Comment[]>>({});
  const [loadingComments, setLoadingComments] = useState<Record<string, boolean>>({});
  const [commentText, setCommentText] = useState<Record<string, string>>({});
  const [isSubmittingComment, setIsSubmittingComment] = useState<Record<string, boolean>>({});

  // New state for image upload and emoji picker
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showSentimentDropdown, setShowSentimentDropdown] = useState(false);
  const [sentiment, setSentiment] = useState<'bullish' | 'bearish' | null>(null);
  const [activeSharePostId, setActiveSharePostId] = useState<string | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  
  // Permission state
  const [canInteract, setCanInteract] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const checkPermission = async () => {
      if (!user) return;
      
      // Admin check from database
      try {
        const { data: userData } = await supabase
          .from('users')
          .select('role')
          .eq('email', user.email)
          .single();
        
        if ((userData as any)?.role === 'admin') {
          setIsAdmin(true);
        }
      } catch (err) {
        console.error('Error checking admin status:', err);
      }

      const { data, error } = await supabase.rpc('can_interact_with_community', { p_user_id: user.id } as any);
      if (!error) {
        setCanInteract(!!data);
      }
    };
    checkPermission();
  }, [user]);

  // Profile editing state
  const [userProfile, setUserProfile] = useState<any>(null);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [editForm, setEditForm] = useState({
    name: '',
    bio: '',
    location: '',
    website: ''
  });

  const fetchUserProfile = useCallback(async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', user.id)
      .single();
    
    if (data) {
      setUserProfile(data);
      setEditForm({
        name: (data as any).name || '',
        bio: (data as any).bio || '',
        location: (data as any).location || '',
        website: (data as any).website || ''
      });
    }
  }, [user]);

  useEffect(() => {
    fetchUserProfile();
  }, [fetchUserProfile]);

  const handleUpdateProfile = async () => {
    try {
      setIsSavingProfile(true);
      const result = await updateProfile(editForm);
      if (result.success) {
        await fetchUserProfile();
        setIsEditingProfile(false);
      } else {
        alert('Failed to update profile: ' + result.error);
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      alert('An error occurred while updating profile');
    } finally {
      setIsSavingProfile(false);
    }
  };

  // Fetch initial data
  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      // Fetch posts
      const { data: postsData, error: postsError } = await supabase
        .from('posts')
        .select(`
          *,
          users:users!posts_user_id_fkey (name, image),
          post_likes:post_likes(user_id)
        `)
        .order('created_at', { ascending: false });

      if (postsError) throw postsError;

      // Fetch comment counts
      const { data: commentCounts, error: commentError } = await supabase
        .from('comments')
        .select('post_id');
        
      const counts: Record<string, number> = {};
      commentCounts?.forEach((c: any) => {
        counts[c.post_id] = (counts[c.post_id] || 0) + 1;
      });

      const formattedPosts = postsData.map((post: any) => ({
        ...post,
        likes_count: post.post_likes?.length || 0,
        comments_count: counts[post.id] || 0,
        user_has_liked: user ? post.post_likes?.some((like: any) => like.user_id === user.id) : false,
      }));

      setPosts(formattedPosts);

      // Fetch trending topics (hashtags)
      const { data: hashtagsData } = await supabase
        .from('hashtags')
        .select('*')
        .order('count', { ascending: false })
        .limit(5);
      
      if (hashtagsData) {
        setTrendingTopics(hashtagsData);
      }

      // Fetch suggested users (simple logic: most posts)
      // This is a placeholder logic
      setSuggestedUsers([]);

    } catch (err) {
      console.error('Error fetching community data:', err);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // ── Image compression helper ────────────────────────────────────────────
  // Resizes any image to max 1080px wide and re-encodes as WebP at 82% quality.
  // Typical result: 2 MB JPEG → ~120–200 KB WebP (85–90% saving).
  const compressImage = (file: File): Promise<File> =>
    new Promise((resolve, reject) => {
      const MAX_PX   = 1080;   // max width OR height
      const QUALITY  = 0.82;   // WebP quality (0–1)

      const img = new Image();
      const objectUrl = URL.createObjectURL(file);

      img.onload = () => {
        URL.revokeObjectURL(objectUrl);

        // Compute target dimensions preserving aspect ratio
        let { width, height } = img;
        if (width > MAX_PX || height > MAX_PX) {
          if (width >= height) { height = Math.round((height / width) * MAX_PX); width = MAX_PX; }
          else                 { width  = Math.round((width / height) * MAX_PX); height = MAX_PX; }
        }

        const canvas = document.createElement('canvas');
        canvas.width  = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d')!;
        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            if (!blob) { reject(new Error('Canvas toBlob failed')); return; }
            // Use .webp extension for the compressed file
            const name = file.name.replace(/\.[^.]+$/, '') + '.webp';
            resolve(new File([blob], name, { type: 'image/webp' }));
          },
          'image/webp',
          QUALITY,
        );
      };
      img.onerror = () => { URL.revokeObjectURL(objectUrl); reject(new Error('Image load failed')); };
      img.src = objectUrl;
    });

  // Image handling
  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.size > 10 * 1024 * 1024) {          // 10 MB hard cap before compression
        alert('Image size should be less than 10 MB');
        return;
      }
      setSelectedImage(file);
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    }
  };

  const removeImage = () => {
    setSelectedImage(null);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleInsertEmoji = (emoji: string) => {
    setNewPostContent(prev => prev + emoji);
    setShowEmojiPicker(false);
  };

  // Post actions
  const handleCreatePost = async () => {
    if ((!newPostContent.trim() && !selectedImage) || isPosting) return;

    try {
      setIsPosting(true);
      
      let imageUrl = undefined;
      if (selectedImage) {
        // Compress before upload: resize to max 1080px, convert to WebP
        const compressed = await compressImage(selectedImage);
        console.log(
          `[post-image] ${selectedImage.name} ${(selectedImage.size / 1024).toFixed(0)} KB` +
          ` → ${(compressed.size / 1024).toFixed(0)} KB WebP`
        );

        // Namespace by user ID to keep bucket organised and allow per-user cleanup
        const userId = user?.id ?? 'anon';
        const fileName = `${userId}/${Date.now()}.webp`;

        const { error: uploadError } = await supabase.storage
          .from('post-images')
          .upload(fileName, compressed, { contentType: 'image/webp', upsert: false });

        if (uploadError) throw uploadError;

        const { data: publicUrlData } = supabase.storage
          .from('post-images')
          .getPublicUrl(fileName);

        imageUrl = publicUrlData.publicUrl;
      }

      const result = await createPost(newPostContent, imageUrl, sentiment);
      
      if (result.success) {
        setNewPostContent('');
        removeImage();
        setSentiment(null);
        fetchData(); // Refresh feed
      } else {
        alert('Failed to create post: ' + result.error);
      }
    } catch (err) {
      console.error('Error creating post:', err);
      alert('An error occurred while creating post');
    } finally {
      setIsPosting(false);
    }
  };

  const handleDeletePost = async (postId: string) => {
    if (!confirm('Are you sure you want to delete this post?')) return;
    
    try {
      const result = await deletePost(postId);
      if (result.success) {
        setPosts(prev => prev.filter(p => p.id !== postId));
      } else {
        alert('Failed to delete post: ' + result.error);
      }
    } catch (err) {
      console.error('Error deleting post:', err);
    }
  };

  const handleLikePost = async (postId: string) => {
    // Optimistic update
    setPosts(prev => prev.map(p => {
      if (p.id === postId) {
        return {
          ...p,
          likes_count: p.user_has_liked ? p.likes_count - 1 : p.likes_count + 1,
          user_has_liked: !p.user_has_liked
        };
      }
      return p;
    }));

    try {
      const result = await toggleLike(postId);
      if (!result.success) {
        // Revert on failure
        fetchData();
      }
    } catch (err) {
      console.error('Error liking post:', err);
      fetchData(); // Revert
    }
  };

  const handleShare = (platform: string, post: Post) => {
    const url = typeof window !== 'undefined' ? `${window.location.origin}/community/post/${post.id}` : '';
    const text = `Check out this post on OmniFolio: ${post.content.substring(0, 50)}...`;

    switch (platform) {
      case 'twitter':
        window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`, '_blank');
        break;
      case 'facebook':
        window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`, '_blank');
        break;
      case 'linkedin':
        window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`, '_blank');
        break;
      case 'copy':
        navigator.clipboard.writeText(url);
        // Could show toast here
        setActiveSharePostId(null);
        break;
    }
    setActiveSharePostId(null);
  };

  // Comments
  const handleToggleComments = async (postId: string) => {
    if (expandedPostId === postId) {
      setExpandedPostId(null);
      return;
    }
    
    setExpandedPostId(postId);
    
    if (!comments[postId]) {
      setLoadingComments(prev => ({ ...prev, [postId]: true }));
      try {
        const { data, error } = await supabase
          .from('comments')
          .select(`
            *,
            users:users!comments_user_id_fkey (name, image)
          `)
          .eq('post_id', postId)
          .order('created_at', { ascending: true });
          
        if (error) throw error;
        
        setComments(prev => ({ ...prev, [postId]: data as any }));
      } catch (err) {
        console.error('Error fetching comments:', err);
      } finally {
        setLoadingComments(prev => ({ ...prev, [postId]: false }));
      }
    }
  };

  const handleCommentChange = (postId: string, text: string) => {
    setCommentText(prev => ({ ...prev, [postId]: text }));
  };

  const handleCommentSubmit = async (postId: string) => {
    const text = commentText[postId];
    if (!text?.trim()) return;

    try {
      setIsSubmittingComment(prev => ({ ...prev, [postId]: true }));
      const result = await createComment(postId, text);
      
      if (result.success) {
        setCommentText(prev => ({ ...prev, [postId]: '' }));
        // Update comments list
        if (result.comment) {
          const newComment = result.comment;
          setComments(prev => ({
            ...prev,
            [postId]: [...(prev[postId] || []), newComment]
          }));
        }
        // Update post comment count
        setPosts(prev => prev.map(p => 
          p.id === postId ? { ...p, comments_count: p.comments_count + 1 } : p
        ));
      } else {
        alert('Failed to post comment: ' + result.error);
      }
    } catch (err) {
      console.error('Error posting comment:', err);
    } finally {
      setIsSubmittingComment(prev => ({ ...prev, [postId]: false }));
    }
  };

  const handleDeleteComment = async (commentId: string, postId: string) => {
    if (!confirm('Delete this comment?')) return;
    try {
      const result = await deleteComment(commentId);
      if (result.success) {
        setComments(prev => ({
          ...prev,
          [postId]: prev[postId].filter(c => c.id !== commentId)
        }));
        // Update post comment count
        setPosts(prev => prev.map(p => 
          p.id === postId ? { ...p, comments_count: Math.max(0, p.comments_count - 1) } : p
        ));
      }
    } catch (err) {
      console.error('Error deleting comment:', err);
    }
  };

  const stats = [
    { label: 'Posts', value: userProfile?.posts_count || 0 },
    { label: 'Following', value: userProfile?.following_count || 0 },
    { label: 'Followers', value: userProfile?.followers_count || 0 },
  ];

  const filteredPosts = useMemo(() => {
    if (activeTab === 'likes') {
      return posts.filter(p => p.user_has_liked);
    }
    if (activeTab === 'media') {
      return posts.filter(p => p.image_url);
    }
    return posts;
  }, [posts, activeTab]);

  return (
    <div className="flex flex-col md:flex-row min-h-screen min-h-[100dvh] bg-black text-white md:h-screen md:overflow-hidden">
      <Sidebar 
          activeTab={activeTab} 
          onTabChange={setActiveTab} 
          selectedCategory="Community" 
      />

      <div className="flex-1 flex flex-col min-w-0 min-h-0 overflow-hidden">
        <TopBar 
            onOpenSettings={() => setIsSettingsModalOpen(true)} 
            onNavigate={handleSearchNavigation}
        />

        <main className="flex-1 p-4 sm:p-8 overflow-y-auto scrollbar-hide">
            <div className="max-w-7xl mx-auto pb-24 sm:pb-20">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                
                {/* Left Sidebar - Profile Info */}
                <div className="lg:col-span-3 space-y-6">
                    <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
                    <div className="h-24 bg-gradient-to-r from-blue-600 to-purple-600"></div>
                    <div className="px-6 pb-6">
                        <div className="relative -mt-12 mb-4 flex justify-between items-end">
                        <div className="h-24 w-24 rounded-full border-4 border-gray-900 overflow-hidden bg-gray-800">
                            <img src={user?.avatarUrl || '/api/auth/avatar'} alt="Profile" className="h-full w-full object-cover" />
                        </div>
                        <button 
                            onClick={() => setIsEditingProfile(true)}
                            className="mb-2 px-3 py-1 bg-gray-800 hover:bg-gray-700 text-white text-xs font-medium rounded-full border border-gray-700 transition-colors"
                        >
                            Edit Profile
                        </button>
                        </div>
                        <div className="mb-4">
                        <h2 className="text-xl font-bold text-white flex items-center gap-2">
                            {userProfile?.name || user?.name || 'User Name'}
                            {isAdmin && (
                            <span className="bg-blue-500/20 text-blue-400 text-xs px-2 py-0.5 rounded-full border border-blue-500/30 font-medium">
                                Admin
                            </span>
                            )}
                        </h2>
                        <p className="text-gray-400">@{userProfile?.name?.toLowerCase().replace(/\s+/g, '') || user?.name?.toLowerCase().replace(/\s+/g, '') || 'username'}</p>
                        </div>
                        <p className="text-gray-300 text-sm mb-4">
                        {userProfile?.bio || "No bio yet."}
                        </p>
                        <div className="flex flex-wrap gap-y-2 text-sm text-gray-400 mb-6">
                        {userProfile?.location && (
                            <div className="flex items-center mr-4">
                            <MapPin className="h-4 w-4 mr-1" />
                            <span>{userProfile.location}</span>
                            </div>
                        )}
                        {userProfile?.website && (
                            <div className="flex items-center mr-4">
                            <LinkIcon className="h-4 w-4 mr-1" />
                            <a href={userProfile.website.startsWith('http') ? userProfile.website : `https://${userProfile.website}`} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline truncate max-w-[150px]">
                                {userProfile.website.replace(/^https?:\/\//, '')}
                            </a>
                            </div>
                        )}
                        <div className="flex items-center">
                            <Calendar className="h-4 w-4 mr-1" />
                            <span>Joined {new Date((user as any)?.createdAt || Date.now()).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}</span>
                        </div>
                        </div>
                        <div className="flex justify-between text-center border-t border-gray-800 pt-4">
                        {stats.map((stat, index) => (
                            <div key={index}>
                            <div className="font-bold text-white">{stat.value}</div>
                            <div className="text-xs text-gray-500">{stat.label}</div>
                            </div>
                        ))}
                        </div>
                    </div>
                    </div>
                </div>

                {/* Main Content - Feed */}
                <div className="lg:col-span-6 space-y-6">
                    {/* Create Post */}
                    <div className="bg-gray-900 rounded-xl border border-gray-800 p-4 relative">
                    {!canInteract && (
                        <div 
                            className={`absolute inset-0 bg-gray-900/80 backdrop-blur-sm z-10 flex items-center justify-center rounded-xl ${isAdmin ? 'cursor-pointer' : ''}`}
                            onClick={() => isAdmin && setCanInteract(true)}
                        >
                            <div className="text-center p-4">
                                <p className="text-white font-bold mb-2">Upgrade to Post</p>
                                <p className="text-gray-400 text-sm mb-4">Join the conversation with a paid plan.</p>
                                <Link href="/pricing" className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-full text-sm font-medium transition-colors">
                                    View Plans
                                </Link>
                            </div>
                        </div>
                    )}
                    <div className="flex gap-4">
                        <div className="h-10 w-10 rounded-full overflow-hidden flex-shrink-0">
                        <img src={user?.avatarUrl || '/api/auth/avatar'} alt="User" className="h-full w-full object-cover" />
                        </div>
                        <div className="flex-1">
                        <textarea 
                            className="w-full bg-transparent border-none focus:ring-0 text-white placeholder-gray-500 resize-none h-20"
                            placeholder="What's happening in the markets?"
                            value={newPostContent}
                            onChange={(e) => setNewPostContent(e.target.value)}
                        ></textarea>
                        
                        {/* Image Preview */}
                        {previewUrl && (
                            <div className="relative mt-2 mb-2 inline-block">
                            <img src={previewUrl} alt="Preview" className="h-32 w-auto rounded-lg border border-gray-700 object-cover" />
                            <button 
                                onClick={removeImage}
                                className="absolute -top-2 -right-2 bg-gray-800 rounded-full p-1 text-gray-400 hover:text-white border border-gray-700"
                            >
                                <Trash2 className="h-4 w-4" />
                            </button>
                            </div>
                        )}

                        <div className="flex justify-between items-center border-t border-gray-800 pt-3 mt-2 relative">
                            <div className="flex gap-2 text-blue-400">
                            <input 
                                type="file" 
                                ref={fileInputRef}
                                onChange={handleImageSelect}
                                accept="image/*"
                                className="hidden"
                            />
                            <button 
                                onClick={() => fileInputRef.current?.click()}
                                className="p-2 hover:bg-gray-800 rounded-full transition-colors"
                                title="Add Image"
                            >
                                <ImageIcon className="h-5 w-5" />
                            </button>
                            
                            <div className="relative">
                                <button 
                                onClick={() => setShowSentimentDropdown(!showSentimentDropdown)}
                                className={`p-2 rounded-full transition-colors ${sentiment ? (sentiment === 'bullish' ? 'text-green-400' : 'text-red-400') : 'hover:bg-gray-800 text-gray-400'}`}
                                title="Market Sentiment"
                                >
                                <TrendingUp className="h-5 w-5" />
                                </button>
                                
                                {showSentimentDropdown && (
                                <>
                                    <div className="fixed inset-0 z-10" onClick={() => setShowSentimentDropdown(false)}></div>
                                    <div className="absolute top-full left-0 mt-2 bg-gray-800 border border-gray-700 rounded-lg shadow-xl p-2 z-20 w-32 flex flex-col gap-1">
                                    <button
                                        onClick={() => {
                                        setSentiment(sentiment === 'bullish' ? null : 'bullish');
                                        setShowSentimentDropdown(false);
                                        }}
                                        className={`flex items-center gap-2 p-2 rounded hover:bg-gray-700 transition-colors ${sentiment === 'bullish' ? 'bg-green-500/10 text-green-400' : 'text-gray-300'}`}
                                    >
                                        <ArrowUp className="h-4 w-4 text-green-400" />
                                        <span>Bullish</span>
                                    </button>
                                    <button
                                        onClick={() => {
                                        setSentiment(sentiment === 'bearish' ? null : 'bearish');
                                        setShowSentimentDropdown(false);
                                        }}
                                        className={`flex items-center gap-2 p-2 rounded hover:bg-gray-700 transition-colors ${sentiment === 'bearish' ? 'bg-red-500/10 text-red-400' : 'text-gray-300'}`}
                                    >
                                        <ArrowDown className="h-4 w-4 text-red-400" />
                                        <span>Bearish</span>
                                    </button>
                                    </div>
                                </>
                                )}
                            </div>

                            <div className="relative">
                                <button 
                                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                                className="p-2 hover:bg-gray-800 rounded-full transition-colors"
                                title="Add Emoji"
                                >
                                <Smile className="h-5 w-5" />
                                </button>
                                
                                {/* Simple Emoji Picker */}
                                {showEmojiPicker && (
                                <>
                                    <div className="fixed inset-0 z-10" onClick={() => setShowEmojiPicker(false)}></div>
                                    <div className="absolute top-full left-0 mt-2 bg-gray-800 border border-gray-700 rounded-lg shadow-xl p-2 grid grid-cols-4 gap-1 z-20 w-48">
                                    {['🚀', '💰', '📈', '📉', '💎', '🙌', '🔥', '👀', '🧠', '⚡', '🐂', '🐻', '💸', '🏦', '📊', '📱'].map(emoji => (
                                        <button
                                        key={emoji}
                                        onClick={() => handleInsertEmoji(emoji)}
                                        className="p-2 hover:bg-gray-700 rounded text-xl text-center"
                                        >
                                        {emoji}
                                        </button>
                                    ))}
                                    </div>
                                </>
                                )}
                            </div>
                            </div>
                            <button 
                            onClick={handleCreatePost}
                            disabled={(!newPostContent.trim() && !selectedImage) || isPosting}
                            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-1.5 rounded-full font-medium text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                            >
                            {isPosting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                            Post
                            </button>
                        </div>
                        </div>
                    </div>
                    </div>

                    {/* Feed Items */}
                    <div className="space-y-4">
                    {isLoading ? (
                        <div className="flex justify-center py-8">
                        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
                        </div>
                    ) : filteredPosts.length === 0 ? (
                        <div className="text-center py-8 text-gray-500">
                        No posts yet. Be the first to share something!
                        </div>
                    ) : (
                        filteredPosts.map((post) => (
                        <div key={post.id} className="bg-gray-900 rounded-xl border border-gray-800 p-4 hover:bg-gray-900/80 transition-colors">
                            <div className="flex gap-3">
                            <div className="h-10 w-10 rounded-full overflow-hidden flex-shrink-0">
                                <img 
                                src={post.users?.image || '/api/auth/avatar'} 
                                alt={post.users?.name || 'User'} 
                                className="h-full w-full object-cover" 
                                />
                            </div>
                            <div className="flex-1">
                                <div className="flex justify-between items-start">
                                <div className="flex items-center gap-2">
                                    <span className="font-bold text-white">{post.users?.name || 'Unknown User'}</span>
                                    {post.sentiment === 'bullish' && (
                                    <span className="flex items-center text-green-400 text-xs bg-green-500/10 px-1.5 py-0.5 rounded border border-green-500/20">
                                        <ArrowUp className="h-3 w-3 mr-0.5" /> Bullish
                                    </span>
                                    )}
                                    {post.sentiment === 'bearish' && (
                                    <span className="flex items-center text-red-400 text-xs bg-red-500/10 px-1.5 py-0.5 rounded border border-red-500/20">
                                        <ArrowDown className="h-3 w-3 mr-0.5" /> Bearish
                                    </span>
                                    )}
                                    <span className="text-gray-500 text-sm">@{post.users?.name?.toLowerCase().replace(/\s+/g, '') || 'user'}</span>
                                    <span className="text-gray-500 text-sm">·</span>
                                    <span className="text-gray-500 text-sm">{timeAgo(post.created_at)}</span>
                                </div>
                                {user?.id === post.user_id && (
                                    <button 
                                    onClick={() => handleDeletePost(post.id)}
                                    className="text-gray-500 hover:text-red-400 transition-colors"
                                    >
                                    <Trash2 className="h-4 w-4" />
                                    </button>
                                )}
                                </div>
                                <p className="text-gray-200 mt-2 whitespace-pre-wrap">{post.content}</p>
                                {post.image_url && (
                                <div className="mt-3 rounded-xl overflow-hidden border border-gray-800">
                                    <img src={post.image_url} alt="Post content" className="w-full h-auto" />
                                </div>
                                )}
                                <div className="flex justify-between items-center mt-4 text-gray-500 max-w-md">
                                <button 
                                    onClick={() => handleToggleComments(post.id)}
                                    className="flex items-center gap-2 hover:text-blue-400 transition-colors group"
                                >
                                    <div className="p-2 rounded-full group-hover:bg-blue-500/10">
                                    <MessageSquare className="h-4 w-4" />
                                    </div>
                                    <span className="text-sm">{post.comments_count}</span>
                                </button>
                                <button 
                                    onClick={() => handleLikePost(post.id)}
                                    className={`flex items-center gap-2 transition-colors group ${
                                    post.user_has_liked ? 'text-pink-500' : 'hover:text-pink-400'
                                    }`}
                                >
                                    <div className="p-2 rounded-full group-hover:bg-pink-500/10">
                                    <Heart className={`h-4 w-4 ${post.user_has_liked ? 'fill-current' : ''}`} />
                                    </div>
                                    <span className="text-sm">{post.likes_count}</span>
                                </button>
                                <div className="relative">
                                    <button 
                                    onClick={() => setActiveSharePostId(activeSharePostId === post.id ? null : post.id)}
                                    className="flex items-center gap-2 hover:text-blue-400 transition-colors group"
                                    >
                                    <div className="p-2 rounded-full group-hover:bg-blue-500/10">
                                        <Share2 className="h-4 w-4" />
                                    </div>
                                    </button>
                                    
                                    {activeSharePostId === post.id && (
                                    <>
                                        <div className="fixed inset-0 z-10" onClick={() => setActiveSharePostId(null)}></div>
                                        <div className="absolute bottom-full right-0 mb-2 bg-gray-800 border border-gray-700 rounded-lg shadow-xl p-2 z-20 w-40 flex flex-col gap-1">
                                        <button
                                            onClick={() => handleShare('twitter', post)}
                                            className="flex items-center gap-3 p-2 rounded hover:bg-gray-700 transition-colors text-gray-300 hover:text-white text-left"
                                        >
                                            <FaTwitter className="h-4 w-4 text-[#1DA1F2]" />
                                            <span>Twitter</span>
                                        </button>
                                        <button
                                            onClick={() => handleShare('facebook', post)}
                                            className="flex items-center gap-3 p-2 rounded hover:bg-gray-700 transition-colors text-gray-300 hover:text-white text-left"
                                        >
                                            <FaFacebook className="h-4 w-4 text-[#4267B2]" />
                                            <span>Facebook</span>
                                        </button>
                                        <button
                                            onClick={() => handleShare('linkedin', post)}
                                            className="flex items-center gap-3 p-2 rounded hover:bg-gray-700 transition-colors text-gray-300 hover:text-white text-left"
                                        >
                                            <FaLinkedin className="h-4 w-4 text-[#0077b5]" />
                                            <span>LinkedIn</span>
                                        </button>
                                        <button
                                            onClick={() => handleShare('copy', post)}
                                            className="flex items-center gap-3 p-2 rounded hover:bg-gray-700 transition-colors text-gray-300 hover:text-white text-left"
                                        >
                                            <FaLink className="h-4 w-4" />
                                            <span>Copy Link</span>
                                        </button>
                                        </div>
                                    </>
                                    )}
                                </div>
                                </div>

                                {/* Comments Section */}
                                {expandedPostId === post.id && (
                                <div className="mt-4 border-t border-gray-800 pt-4">
                                    {/* Comments List */}
                                    <div className="space-y-4 mb-4">
                                    {loadingComments[post.id] ? (
                                        <div className="flex justify-center py-2">
                                        <Loader2 className="h-5 w-5 animate-spin text-blue-500" />
                                        </div>
                                    ) : (
                                        comments[post.id]?.map(comment => (
                                        <div key={comment.id} className="flex items-start gap-3 group">
                                            <div className="h-8 w-8 rounded-full overflow-hidden flex-shrink-0">
                                            <img 
                                                src={comment.users?.image || '/api/auth/avatar'} 
                                                alt={comment.users?.name || 'User'} 
                                                className="h-full w-full object-cover" 
                                            />
                                            </div>
                                            <div className="flex-1 bg-gray-800/50 rounded-lg p-3">
                                            <div className="flex justify-between items-center mb-1">
                                                <div className="flex items-center gap-2">
                                                <span className="font-bold text-sm text-white">{comment.users?.name || 'Unknown User'}</span>
                                                <span className="text-xs text-gray-500">{timeAgo(comment.created_at)}</span>
                                                </div>
                                                {user?.id === comment.user_id && (
                                                <button 
                                                    onClick={() => handleDeleteComment(comment.id, post.id)}
                                                    className="text-gray-500 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
                                                >
                                                    <Trash2 className="h-3 w-3" />
                                                </button>
                                                )}
                                            </div>
                                            <p className="text-gray-300 text-sm whitespace-pre-wrap">{comment.content}</p>
                                            </div>
                                        </div>
                                        ))
                                    )}
                                    {!loadingComments[post.id] && (!comments[post.id] || comments[post.id].length === 0) && (
                                        <div className="text-center text-gray-500 text-sm py-2">
                                        No comments yet. Be the first to comment!
                                        </div>
                                    )}
                                    </div>

                                    {/* Comment Input */}
                                    <div className="flex gap-3 items-start">
                                    <div className="h-8 w-8 rounded-full overflow-hidden flex-shrink-0">
                                        <img src={user?.avatarUrl || '/api/auth/avatar'} alt="User" className="h-full w-full object-cover" />
                                    </div>
                                    <div className="flex-1 relative">
                                        <textarea
                                        className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white placeholder-gray-500 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 resize-none text-sm"
                                        placeholder="Write a comment..."
                                        rows={1}
                                        style={{ minHeight: '40px' }}
                                        value={commentText[post.id] || ''}
                                        onChange={(e) => {
                                            handleCommentChange(post.id, e.target.value);
                                            e.target.style.height = 'auto';
                                            e.target.style.height = e.target.scrollHeight + 'px';
                                        }}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter' && !e.shiftKey) {
                                            e.preventDefault();
                                            handleCommentSubmit(post.id);
                                            }
                                        }}
                                        ></textarea>
                                        <button
                                        onClick={() => handleCommentSubmit(post.id)}
                                        disabled={!commentText[post.id]?.trim() || isSubmittingComment[post.id]}
                                        className="absolute right-2 bottom-2 p-1.5 text-blue-400 hover:bg-blue-500/10 rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                        {isSubmittingComment[post.id] ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                                        </button>
                                    </div>
                                    </div>
                                </div>
                                )}
                            </div>
                            </div>
                        </div>
                        ))
                    )}
                    </div>
                </div>

                {/* Right Sidebar */}
                <div className="lg:col-span-3 space-y-6">
                    {/* Trending Topics */}
                    <div className="bg-gray-900 rounded-xl border border-gray-800 p-4">
                    <h3 className="font-bold text-white mb-4 text-lg">Trending Topics</h3>
                    <div className="space-y-4">
                        {trendingTopics.map((topic, index) => (
                        <div key={index} className="flex justify-between items-center group cursor-pointer">
                            <div>
                            <div className="font-medium text-gray-200 group-hover:text-blue-400 transition-colors">{topic.tag}</div>
                            <div className="text-xs text-gray-500">{topic.count} posts</div>
                            </div>
                            <MoreHorizontal className="h-4 w-4 text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                        ))}
                    </div>
                    <button className="w-full text-blue-400 text-sm mt-4 hover:underline text-left">Show more</button>
                    </div>

                    {/* Suggested Users */}
                    <div className="bg-gray-900 rounded-xl border border-gray-800 p-4">
                    <h3 className="font-bold text-white mb-4 text-lg">Who to follow</h3>
                    <div className="space-y-4">
                        {suggestedUsers.length === 0 ? (
                        <div className="text-gray-500 text-sm text-center py-4">No trending users this month</div>
                        ) : (
                        suggestedUsers.map((suggestedUser) => (
                            <div key={suggestedUser.user_id} className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="h-10 w-10 rounded-full overflow-hidden bg-gray-800">
                                <img src={suggestedUser.image || '/api/auth/avatar'} alt={suggestedUser.name} className="h-full w-full object-cover" />
                                </div>
                                <div>
                                <div className="font-medium text-white text-sm hover:underline cursor-pointer">{suggestedUser.name}</div>
                                <div className="text-xs text-gray-500">@{suggestedUser.name.toLowerCase().replace(/\s+/g, '')}</div>
                                <div className="text-xs text-gray-600">{suggestedUser.total_likes} likes this month</div>
                                </div>
                            </div>
                            <button className="p-2 text-blue-400 hover:bg-blue-500/10 rounded-full transition-colors">
                                <UserPlus className="h-4 w-4" />
                            </button>
                            </div>
                        ))
                        )}
                    </div>
                    <button className="w-full text-blue-400 text-sm mt-4 hover:underline text-left">Show more</button>
                    </div>

                    <div className="text-xs text-gray-500 leading-relaxed px-2">
                    <a href="#" className="hover:underline mr-2">Terms of Service</a>
                    <a href="#" className="hover:underline mr-2">Privacy Policy</a>
                    <a href="#" className="hover:underline mr-2">Cookie Policy</a>
                    <a href="#" className="hover:underline mr-2">Accessibility</a>
                    <a href="#" className="hover:underline mr-2">Ads info</a>
                    <span>© 2025 OmniFolio, Inc.</span>
                    </div>
                </div>

                </div>
            </div>
        </main>
      </div>

      <SettingsModal 
        isOpen={isSettingsModalOpen} 
        onClose={() => setIsSettingsModalOpen(false)} 
      />
      
      <AIChatAssistant theme="portfolio" />

      {/* Edit Profile Modal */}
      {isEditingProfile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-gray-900 border border-gray-800 rounded-xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="flex justify-between items-center p-4 border-b border-gray-800">
              <h3 className="text-lg font-bold text-white">Edit Profile</h3>
              <button 
                onClick={() => setIsEditingProfile(false)}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-x h-5 w-5"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
              </button>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Name</label>
                <input 
                  type="text" 
                  value={editForm.name}
                  onChange={(e) => setEditForm({...editForm, name: e.target.value})}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Your name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Bio</label>
                <textarea 
                  value={editForm.bio}
                  onChange={(e) => setEditForm({...editForm, bio: e.target.value})}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white focus:ring-1 focus:ring-blue-500 focus:border-blue-500 resize-none h-24"
                  placeholder="Tell us about yourself"
                ></textarea>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Location</label>
                <input 
                  type="text" 
                  value={editForm.location}
                  onChange={(e) => setEditForm({...editForm, location: e.target.value})}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="City, Country"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Website</label>
                <input 
                  type="text" 
                  value={editForm.website}
                  onChange={(e) => setEditForm({...editForm, website: e.target.value})}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="https://example.com"
                />
              </div>
            </div>
            <div className="p-4 border-t border-gray-800 flex justify-end gap-3">
              <button 
                onClick={() => setIsEditingProfile(false)}
                className="px-4 py-2 text-sm font-medium text-gray-300 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={handleUpdateProfile}
                disabled={isSavingProfile}
                className="px-4 py-2 text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {isSavingProfile && <Loader2 className="h-4 w-4 animate-spin" />}
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

