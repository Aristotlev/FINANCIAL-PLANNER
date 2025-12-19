"use client";

import React from 'react';
import Link from 'next/link';
import { notFound, useParams } from 'next/navigation';
import { 
  ArrowLeft, 
  Calendar, 
  Clock, 
  ArrowRight
} from 'lucide-react';
import { OmnifolioLogo } from '@/components/ui/omnifolio-logo';
import { blogPosts, BlogPost, BlogContentBlock } from '../blog-data';

export default function BlogPostPage() {
  const params = useParams();
  const slug = params.slug as string;
  const post = blogPosts.find((p) => p.id === slug);

  if (!post) {
    notFound();
  }

  const getCategoryColor = (color: string) => {
    const colors: Record<string, string> = {
      purple: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
      amber: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
      emerald: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
      cyan: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
      rose: 'bg-rose-500/20 text-rose-400 border-rose-500/30',
      orange: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
      blue: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
      violet: 'bg-violet-500/20 text-violet-400 border-violet-500/30',
    };
    return colors[color] || colors.purple;
  };

  const getIconBgColor = (color: string) => {
    const colors: Record<string, string> = {
      purple: 'from-purple-500 to-purple-600',
      amber: 'from-amber-500 to-amber-600',
      emerald: 'from-emerald-500 to-emerald-600',
      cyan: 'from-cyan-500 to-cyan-600',
      rose: 'from-rose-500 to-rose-600',
      orange: 'from-orange-500 to-orange-600',
      blue: 'from-blue-500 to-blue-600',
      violet: 'from-violet-500 to-violet-600',
    };
    return colors[color] || colors.purple;
  };

  const PostIcon = post.icon;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-gray-900/80 backdrop-blur-lg border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link href="/" className="flex items-center gap-2">
              <OmnifolioLogo size="sm" />
            </Link>
            <div className="flex items-center gap-4">
              <Link 
                href="/blog"
                className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Blog
              </Link>
            </div>
          </div>
        </div>
      </header>

      <article className="pt-32 pb-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto">
          {/* Article Header */}
          <div className="mb-12 text-center">
            <div className="flex justify-center mb-6">
              <div className={`w-16 h-16 bg-gradient-to-br ${getIconBgColor(post.color)} rounded-2xl flex items-center justify-center shadow-lg shadow-${post.color}-500/20`}>
                <PostIcon className="w-8 h-8 text-white" />
              </div>
            </div>
            <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${getCategoryColor(post.color)} mb-6`}>
              {post.category}
            </span>
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-6 leading-tight">
              {post.title}
            </h1>
            <div className="flex items-center justify-center gap-6 text-sm text-gray-400">
              <span className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                {post.date}
              </span>
              <span className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
                {post.readTime}
              </span>
            </div>
          </div>

          {/* Article Content */}
          <div className="prose prose-invert prose-lg max-w-none">
            {post.content.map((block, index) => {
              if (block.type === 'paragraph') {
                return (
                  <p key={index} className="text-gray-300 leading-relaxed mb-6">
                    {block.text}
                  </p>
                );
              } else if (block.type === 'heading') {
                return (
                  <h2 key={index} className="text-2xl font-bold text-white mt-10 mb-6">
                    {block.text}
                  </h2>
                );
              } else if (block.type === 'list') {
                return (
                  <ul key={index} className="space-y-3 mb-8">
                    {block.items.map((item, i) => (
                      <li key={i} className="flex items-start gap-3 text-gray-300">
                        <span className={`mt-1.5 w-1.5 h-1.5 rounded-full bg-${post.color}-400 flex-shrink-0`} />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                );
              }
              return null;
            })}
          </div>

          {/* CTA */}
          <div className="mt-16 pt-8 border-t border-gray-800">
            <div className="bg-gradient-to-r from-purple-600/20 to-cyan-600/20 rounded-2xl p-8 border border-purple-500/30 text-center">
              <h3 className="text-2xl font-bold text-white mb-4">
                Ready to take control of your finances?
              </h3>
              <p className="text-gray-300 mb-8">
                Join thousands of users who are building their wealth with OmniFolio.
              </p>
              <Link
                href="/"
                className="inline-flex items-center gap-2 px-8 py-3 bg-gradient-to-r from-purple-500 to-cyan-500 text-white rounded-xl font-medium hover:opacity-90 transition-opacity"
              >
                Get Started Free
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      </article>

      {/* Footer */}
      <footer className="border-t border-gray-800 py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <OmnifolioLogo size="sm" />
          </div>
          <p className="text-gray-500 text-sm">
            © {new Date().getFullYear()} OmniFolio. All rights reserved.
          </p>
          <div className="flex items-center gap-6">
            <Link href="/" className="text-gray-400 hover:text-white text-sm transition-colors">
              Home
            </Link>
            <Link href="/about" className="text-gray-400 hover:text-white text-sm transition-colors">
              About
            </Link>
            <Link href="/blog" className="text-gray-400 hover:text-white text-sm transition-colors">
              Blog
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
