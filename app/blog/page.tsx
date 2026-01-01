"use client";

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  ArrowRight,
  Calendar,
  Clock,
  Wallet,
  TrendingUp,
  PieChart,
  Shield,
  Coins,
  Building2,
  Receipt,
  Globe,
  Zap,
  LineChart,
  Sparkles
} from 'lucide-react';
import { OmnifolioLogo } from '@/components/ui/omnifolio-logo';
import { blogPosts } from './blog-data';
import { CardContainer, CardItem } from '@/components/ui/3d-card';
import { BackgroundBeams } from '@/components/ui/background-beams';
import { useTranslation } from '@/contexts/translation-context';

export default function BlogPage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const { t } = useTranslation();

  useEffect(() => {
    setMounted(true);
  }, []);

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
      green: 'bg-green-500/20 text-green-400 border-green-500/30 shadow-[0_0_15px_rgba(74,222,128,0.15)]',
      cyan: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30 shadow-[0_0_15px_rgba(34,211,238,0.15)]',
      purple: 'bg-purple-500/20 text-purple-400 border-purple-500/30 shadow-[0_0_15px_rgba(168,85,247,0.15)]',
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

  const getRingColor = (color: string) => {
    const dsColor = getDesignSystemColor(color);
    const colors = {
      green: 'border-green-500/20',
      cyan: 'border-cyan-500/20',
      purple: 'border-purple-500/20',
    };
    return colors[dsColor];
  };

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
              <motion.button
                whileHover={{ x: -2 }}
                onClick={handleBackToHome}
                className="flex items-center gap-2 text-gray-400 hover:text-white transition-all font-medium py-2 px-4 rounded-full hover:bg-white/5 font-sans"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>{t('blog.backToHome')}</span>
              </motion.button>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="pt-40 pb-20 px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-green-500/10 border border-green-500/20 text-green-400 text-sm font-medium mb-8 font-sans"
          >
            <Sparkles className="w-4 h-4" />
            <span>{t('blog.badge')}</span>
          </motion.div>
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-5xl sm:text-6xl lg:text-7xl font-bold tracking-tight text-white mb-8 font-serif"
          >
            {t('blog.title')}
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-xl text-gray-400 leading-relaxed max-w-2xl mx-auto font-sans"
          >
            {t('blog.subtitle')}
          </motion.p>
        </div>
      </section>

      {/* Featured Post */}
      <section className="px-4 sm:px-6 lg:px-8 pb-20 relative z-10">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
          >
            <CardContainer className="w-full" containerClassName="py-0">
              <div className="bg-gradient-to-br from-[#111827]/80 to-[#0a0a0f]/80 backdrop-blur-md rounded-[2.5rem] p-4 md:p-12 border border-white/10 hover:border-green-500/30 transition-colors shadow-2xl relative group overflow-hidden">
                {/* Background glow effect */}
                <div className="absolute -top-24 -right-24 w-96 h-96 bg-green-600/10 blur-[100px] rounded-full group-hover:bg-green-600/20 transition-all duration-700" />
                <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-cyan-600/10 blur-[100px] rounded-full group-hover:bg-cyan-600/20 transition-all duration-700" />

                <div className="grid md:grid-cols-2 gap-12 items-center relative z-10">
                  <div className="px-4 md:px-0">
                    <CardItem translateZ={10} className="mb-6">
                      <span className={`inline-flex items-center px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider border shadow-sm font-sans ${getCategoryColor(blogPosts[0].color)}`}>
                        {blogPosts[0].category}
                      </span>
                    </CardItem>

                    <CardItem translateZ={25} className="mb-6">
                      <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white leading-tight font-serif">
                        {blogPosts[0].title}
                      </h2>
                    </CardItem>

                    <CardItem translateZ={20} className="mb-8">
                      <p className="text-gray-400 text-lg leading-relaxed font-sans">
                        {blogPosts[0].excerpt}
                      </p>
                    </CardItem>

                    <CardItem translateZ={10} className="flex items-center gap-6 text-sm text-gray-500 mb-10 font-sans">
                      <span className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-green-400" />
                        {blogPosts[0].date}
                      </span>
                      <span className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-cyan-400" />
                        {blogPosts[0].readTime}
                      </span>
                    </CardItem>

                    <CardItem translateZ={30}>
                      <Link
                        href={`/blog/${blogPosts[0].id}`}
                        className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-green-600 to-cyan-600 text-white rounded-2xl font-bold hover:shadow-[0_0_30px_rgba(74,222,128,0.4)] hover:scale-105 transition-all duration-300 font-sans"
                      >
                        {t('blog.readArticle')}
                        <ArrowRight className="w-5 h-5" />
                      </Link>
                    </CardItem>
                  </div>

                  <div className="hidden md:flex items-center justify-center p-8">
                    <CardItem
                      translateZ={100}
                      rotateX={10}
                      rotateY={-10}
                      className="relative"
                    >
                      <div className={`w-64 h-64 bg-gradient-to-br ${getIconBgColor(blogPosts[0].color)} rounded-[3rem] flex items-center justify-center shadow-2xl relative`}>
                        <div className="absolute inset-0 bg-white/10 rounded-[3rem] blur-xl" />
                        {(() => {
                          const IconComponent = blogPosts[0].icon;
                          return <IconComponent className="w-32 h-32 text-white relative z-10 drop-shadow-2xl" />;
                        })()}
                        {/* Decorative rings */}
                        <div className={`absolute -inset-4 border rounded-[3.5rem] animate-[spin_10s_linear_infinite] ${getRingColor(blogPosts[0].color)}`} />
                        <div className={`absolute -inset-8 border rounded-[4rem] animate-[spin_15s_linear_infinite_reverse] ${getRingColor(blogPosts[0].color)} opacity-60`} />
                      </div>
                    </CardItem>
                  </div>
                </div>
              </div>
            </CardContainer>
          </motion.div>
        </div>
      </section>

      {/* All Posts Grid */}
      <section className="px-4 sm:px-6 lg:px-8 pb-32 relative z-10">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-12">
            <h2 className="text-3xl font-bold text-white flex items-center gap-3 font-serif">
              <span className="w-8 h-1 bg-green-500 rounded-full" />
              {t('blog.allArticles')}
            </h2>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {blogPosts.slice(1).map((post, index) => {
              const PostIcon = post.icon;
              return (
                <motion.div
                  key={post.id}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                >
                  <CardContainer className="w-full">
                    <Link
                      href={`/blog/${post.id}`}
                      className="block h-full"
                    >
                      <div className="h-full bg-white/[0.03] backdrop-blur-md rounded-[2rem] p-8 border border-white/10 hover:border-green-500/50 transition-all group relative overflow-hidden flex flex-col">
                        {/* Hover reveal gradient */}
                        <div className="absolute inset-0 bg-gradient-to-br from-green-600/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                        <div className="flex items-start justify-between mb-8 relative z-10">
                          <CardItem translateZ={20}>
                            <div className={`w-14 h-14 bg-gradient-to-br ${getIconBgColor(post.color)} rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-500`}>
                              <PostIcon className="w-7 h-7 text-white" />
                            </div>
                          </CardItem>
                          <CardItem translateZ={10}>
                            <span className={`inline-flex items-center px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest border font-sans ${getCategoryColor(post.color)}`}>
                              {post.category}
                            </span>
                          </CardItem>
                        </div>

                        <CardItem translateZ={20} className="mb-4 relative z-10">
                          <h3 className="text-xl font-bold text-white group-hover:text-green-400 transition-colors duration-300 font-serif">
                            {post.title}
                          </h3>
                        </CardItem>

                        <CardItem translateZ={10} className="mb-8 relative z-10 flex-grow">
                          <p className="text-gray-400 text-sm leading-relaxed line-clamp-3 font-sans">
                            {post.excerpt}
                          </p>
                        </CardItem>

                        <CardItem translateZ={5} className="pt-6 mt-auto border-t border-white/5 relative z-10">
                          <div className="flex items-center justify-between text-xs text-gray-500 font-sans">
                            <div className="flex items-center gap-4">
                              <span className="flex items-center gap-1.5">
                                <Calendar className="w-3.5 h-3.5" />
                                {post.date}
                              </span>
                              <span className="flex items-center gap-1.5">
                                <Clock className="w-3.5 h-3.5" />
                                {post.readTime}
                              </span>
                            </div>
                            <ArrowRight className="w-4 h-4 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all duration-300 text-green-400" />
                          </div>
                        </CardItem>
                      </div>
                    </Link>
                  </CardContainer>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="px-4 sm:px-6 lg:px-8 pb-32 relative z-10">
        <div className="max-w-5xl mx-auto">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="relative rounded-[3rem] overflow-hidden group"
          >
            {/* Animated border/glow */}
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-green-500 to-transparent" />

            {/* Pattern overlay */}
            <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]" />

            <div className="relative p-12 sm:p-20 text-center flex flex-col items-center">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[150%] h-[150%] bg-gradient-to-b from-green-500/10 to-transparent blur-[100px] pointer-events-none"
              />

              <h2 className="text-4xl sm:text-5xl lg:text-6xl font-black text-white mb-6 tracking-tight leading-tight font-serif">
                {t('blog.ctaTitle')}
              </h2>
              <p className="text-white/90 text-xl mb-12 max-w-2xl mx-auto font-medium font-sans">
                {t('blog.ctaSubtitle')}
              </p>

              <motion.button
                whileHover={{ scale: 1.05, y: -5 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleBackToHome}
                className="group relative inline-flex items-center gap-3 px-10 py-5 bg-green-500 text-white rounded-2xl text-xl font-black transition-all shadow-[0_20px_50px_rgba(74,222,128,0.3)] hover:shadow-[0_25px_60px_rgba(74,222,128,0.4)] hover:bg-green-600 font-sans"
              >
                {t('blog.ctaButton')}
                <ArrowRight className="w-6 h-6 group-hover:translate-x-2 transition-transform duration-300" />
              </motion.button>

              <p className="mt-8 text-white/60 text-sm font-bold flex items-center gap-2 font-sans">
                <Shield className="w-4 h-4" />
                {t('blog.ctaNote')}
              </p>
            </div>
          </motion.div>
        </div>
      </section>

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
