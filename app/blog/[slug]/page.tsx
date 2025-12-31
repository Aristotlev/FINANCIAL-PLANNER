"use client";

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { notFound, useParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  Calendar,
  Clock,
  ArrowRight,
  Shield,
  Sparkles
} from 'lucide-react';
import { OmnifolioLogo } from '@/components/ui/omnifolio-logo';
import { blogPosts, BlogPost, BlogContentBlock } from '../blog-data';
import { BackgroundBeams } from '@/components/ui/background-beams';
import { CardContainer, CardItem } from '@/components/ui/3d-card';

export default function BlogPostPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;
  const post = blogPosts.find((p) => p.id === slug);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!post) {
    notFound();
  }

  const handleBackToHome = () => {
    router.push('/');
  };

  // Map legacy colors to the new Green/Cyan/Purple design system
  const getDesignSystemColor = (legacyColor: string) => {
    const map: Record<string, 'green' | 'cyan' | 'purple'> = {
      purple: 'purple',
      amber: 'green',
      emerald: 'green',
      cyan: 'cyan',
      rose: 'purple',
      orange: 'green',
      blue: 'cyan',
      violet: 'purple',
    };
    return map[legacyColor] || 'green';
  };

  const getCategoryColor = (color: string) => {
    const dsColor = getDesignSystemColor(color);
    const colors = {
      green: 'bg-green-500/20 text-green-400 border-green-500/30',
      cyan: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
      purple: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
    };
    return colors[dsColor];
  };

  const getIconBgColor = (color: string) => {
    const dsColor = getDesignSystemColor(color);
    const colors = {
      green: 'from-green-500 to-green-800',
      cyan: 'from-cyan-500 to-cyan-800',
      purple: 'from-purple-500 to-purple-800',
    };
    return colors[dsColor];
  };

  const PostIcon = post.icon;

  if (!mounted) return null;

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white selection:bg-green-500/30 relative overflow-x-hidden font-sans">
      <BackgroundBeams />

      {/* Grid Pattern Overlay */}
      <div className="fixed inset-0 z-0 opacity-[0.03] pointer-events-none" style={{
        backgroundImage: 'linear-gradient(rgba(255,255,255,.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.1) 1px, transparent 1px)',
        backgroundSize: '50px 50px'
      }}></div>

      {/* Decorative gradients */}
      <div className="fixed top-[-10%] left-[-10%] w-[40%] h-[40%] bg-green-900/10 blur-[120px] rounded-full pointer-events-none z-0" />
      <div className="fixed bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-900/10 blur-[120px] rounded-full pointer-events-none z-0" />

      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-[#0a0a0f]/80 backdrop-blur-xl border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            <Link href="/" className="flex items-center gap-2 group">
              <OmnifolioLogo size="sm" />
              <div className="absolute -inset-2 bg-gradient-to-r from-green-500/20 to-cyan-500/20 blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            </Link>
            <div className="flex items-center gap-4">
              <motion.div whileHover={{ x: -2 }}>
                <Link
                  href="/blog"
                  className="flex items-center gap-2 text-gray-400 hover:text-white transition-all font-medium py-2 px-4 rounded-full hover:bg-white/5 font-sans"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Back to Blog</span>
                </Link>
              </motion.div>
            </div>
          </div>
        </div>
      </header>

      <article className="pt-40 pb-20 px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="max-w-4xl mx-auto">
          {/* Article Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="mb-16 text-center"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.2, duration: 0.5 }}
              className="flex justify-center mb-8"
            >
              <div className="relative group">
                <div className={`absolute -inset-4 bg-gradient-to-br ${getIconBgColor(post.color)} opacity-20 blur-2xl group-hover:opacity-40 transition-opacity duration-500 rounded-full`} />
                <div className={`relative w-24 h-24 bg-gradient-to-br ${getIconBgColor(post.color)} rounded-[2rem] flex items-center justify-center shadow-2xl border border-white/20`}>
                  <PostIcon className="w-12 h-12 text-white drop-shadow-lg" />
                </div>
              </div>
            </motion.div>

            <motion.span
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              className={`inline-flex items-center px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider border shadow-sm font-sans ${getCategoryColor(post.color)} mb-8`}
            >
              {post.category}
            </motion.span>

            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.6 }}
              className="text-4xl sm:text-5xl md:text-6xl font-black text-white mb-8 leading-tight tracking-tight px-4 font-serif"
            >
              {post.title}
            </motion.h1>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="flex items-center justify-center gap-8 text-sm text-gray-400 font-medium font-sans"
            >
              <span className="flex items-center gap-2 bg-white/5 py-1.5 px-4 rounded-full border border-white/5">
                <Calendar className="w-4 h-4 text-green-400" />
                {post.date}
              </span>
              <span className="flex items-center gap-2 bg-white/5 py-1.5 px-4 rounded-full border border-white/5">
                <Clock className="w-4 h-4 text-cyan-400" />
                {post.readTime}
              </span>
            </motion.div>
          </motion.div>

          {/* Article Content */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6, duration: 0.8 }}
            className="relative"
          >
            <div className="absolute -inset-x-4 -inset-y-4 bg-white/[0.02] backdrop-blur-2xl rounded-[3rem] border border-white/5 -z-10 shadow-2xl" />

            <div className="p-8 sm:p-12 md:p-16">
              <div className="prose prose-invert prose-lg max-w-none font-sans">
                {post.content.map((block, index) => {
                  if (block.type === 'paragraph') {
                    return (
                      <motion.p
                        key={index}
                        initial={{ opacity: 0, y: 10 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: index * 0.05 }}
                        className="text-gray-300 leading-relaxed mb-8 text-lg"
                      >
                        {block.text}
                      </motion.p>
                    );
                  } else if (block.type === 'heading') {
                    return (
                      <motion.h2
                        key={index}
                        initial={{ opacity: 0, x: -10 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        className="text-3xl font-bold text-white mt-16 mb-8 flex items-center gap-4 font-serif"
                      >
                        <span className={`w-8 h-1.5 rounded-full bg-gradient-to-r ${getIconBgColor(post.color)}`} />
                        {block.text}
                      </motion.h2>
                    );
                  } else if (block.type === 'list') {
                    return (
                      <motion.ul
                        key={index}
                        initial={{ opacity: 0 }}
                        whileInView={{ opacity: 1 }}
                        viewport={{ once: true }}
                        className="space-y-4 mb-12 bg-white/[0.03] p-8 rounded-[2rem] border border-white/5"
                      >
                        {block.items.map((item, i) => (
                          <li key={i} className="flex items-start gap-4 text-gray-300 text-lg group">
                            <div className={`mt-1.5 w-2 h-2 rounded-full bg-gradient-to-r ${getIconBgColor(post.color)} flex-shrink-0 group-hover:scale-150 transition-transform duration-300`} />
                            <span className="group-hover:text-white transition-colors duration-300">{item}</span>
                          </li>
                        ))}
                      </motion.ul>
                    );
                  }
                  return null;
                })}
              </div>

              {/* CTA Upgrade */}
              <div className="mt-24 pt-16 border-t border-white/5">
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  className="relative rounded-[2.5rem] overflow-hidden group"
                >
                  <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]" />

                  <div className="relative p-12 text-center flex flex-col items-center">
                    <h3 className="text-3xl font-black text-white mb-4 tracking-tight font-serif">
                      Ready to master your finances?
                    </h3>
                    <p className="text-white/80 text-lg mb-10 max-w-xl mx-auto font-medium font-sans">
                      Join thousands of sophisticated investors who use OmniFolio to gain
                      an unfair advantage in their financial life.
                    </p>
                    <motion.button
                      whileHover={{ scale: 1.05, y: -2 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={handleBackToHome}
                      className="group relative inline-flex items-center gap-3 px-8 py-4 bg-green-500 text-white rounded-2xl text-lg font-black transition-all shadow-xl hover:bg-green-600 font-sans"
                    >
                      Get Started Free
                      <ArrowRight className="w-5 h-5 group-hover:translate-x-1.5 transition-transform duration-300" />
                    </motion.button>

                    <p className="mt-8 text-white/60 text-xs font-bold flex items-center gap-2 font-sans">
                      <Shield className="w-4 h-4" />
                      No credit card required • Privacy first
                    </p>
                  </div>
                </motion.div>
              </div>
            </div>
          </motion.div>
        </div>
      </article>

      {/* Footer */}
      <footer className="border-t border-white/5 py-12 px-4 sm:px-6 lg:px-8 relative z-10 bg-[#0a0a0f]/50 backdrop-blur-md">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-8 mb-12">
            <div className="flex items-center gap-3 group">
              <OmnifolioLogo size="sm" />
              <div className="w-px h-6 bg-white/10 mx-2" />
              <span className="text-gray-500 font-medium font-sans">Digital Wealth Management</span>
            </div>

            <div className="flex items-center gap-8">
              <Link href="/" className="text-gray-400 hover:text-white transition-colors font-medium relative group font-sans">
                Home
                <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-green-500 transition-all group-hover:w-full" />
              </Link>
              <Link href="/about" className="text-gray-400 hover:text-white transition-colors font-medium relative group font-sans">
                About
                <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-green-500 transition-all group-hover:w-full" />
              </Link>
              <Link href="/blog" className="text-white transition-colors font-medium relative group font-sans">
                Blog
                <span className="absolute -bottom-1 left-0 w-full h-0.5 bg-green-500" />
              </Link>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between pt-8 border-t border-white/5 gap-4">
            <p className="text-gray-600 text-xs font-medium font-sans">
              © {new Date().getFullYear()} OmniFolio Technologies. All rights reserved.
            </p>
            <div className="flex items-center gap-6 text-xs text-gray-500 font-medium font-sans">
              <Link href="/terms" className="hover:text-white transition-colors">Terms of Service</Link>
              <Link href="/privacy" className="hover:text-white transition-colors">Privacy Policy</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
