"use client";

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  Target,
  Shield,
  Zap,
  Heart,
  Lightbulb,
  Layers,
  Puzzle,
  Eye,
  Sparkles,
  Check,
  ArrowRight
} from 'lucide-react';
import { OmnifolioLogo } from '@/components/ui/omnifolio-logo';
import { BackgroundBeams } from '@/components/ui/background-beams';
import { CardContainer, CardItem } from '@/components/ui/3d-card';
import { useTranslation } from '@/contexts/translation-context';

const fadeIn = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.6 }
};

const staggerContainer = {
  animate: {
    transition: {
      staggerChildren: 0.1
    }
  }
};

export default function AboutPage() {
  const router = useRouter();
  const { t } = useTranslation();

  const handleBackToHome = () => {
    router.push('/');
  };

  const problemsWeSolve = [
    {
      icon: Puzzle,
      title: "Fragmented Finances",
      description: "No more juggling between banking apps, crypto wallets, stock brokers, and spreadsheets. Everything lives in one place.",
      color: "from-green-500/20 to-cyan-500/20",
      iconColor: "text-green-400"
    },
    {
      icon: Eye,
      title: "Lack of Visibility",
      description: "Get a complete picture of your net worth across all asset classes—cash, investments, crypto, real estate, and more.",
      color: "from-cyan-500/20 to-purple-500/20",
      iconColor: "text-cyan-400"
    },
    {
      icon: Layers,
      title: "Complex Tools",
      description: "Financial software shouldn't require a finance degree. We built OmniFolio to be powerful yet intuitive.",
      color: "from-purple-500/20 to-green-500/20",
      iconColor: "text-purple-400"
    },
    {
      icon: Sparkles,
      title: "Disconnected Insights",
      description: "See how all your financial decisions connect. Track expenses, monitor investments, and plan your future in one unified view.",
      color: "from-green-500/20 to-purple-500/20",
      iconColor: "text-green-400"
    }
  ];

  const values = [
    {
      icon: Shield,
      title: "Privacy & Security",
      description: "Your financial data stays yours. We use bank-level encryption and never sell your information."
    },
    {
      icon: Target,
      title: "Simplicity",
      description: "Complex finances made simple. Every feature is designed to save you time and reduce confusion."
    },
    {
      icon: Lightbulb,
      title: "Continuous Innovation",
      description: "We're always improving, adding new features and integrations based on what you need."
    },
    {
      icon: Heart,
      title: "Transparency",
      description: "Open, honest, and straightforward. No hidden agendas, just tools that help you succeed."
    }
  ];

  const features = [
    "Track cash, savings, and bank accounts",
    "Monitor crypto portfolios with real-time prices",
    "Follow stocks and investment accounts",
    "Manage real estate and property values",
    "Log expenses and track spending patterns",
    "Calculate taxes across multiple jurisdictions",
    "Support for 30+ currencies worldwide",
    "Beautiful visualizations and reports"
  ];

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white selection:bg-green-500/30 overflow-x-hidden">
      <BackgroundBeams />

      {/* Grid Pattern Overlay */}
      <div className="fixed inset-0 z-0 opacity-[0.03] pointer-events-none" style={{
        backgroundImage: 'linear-gradient(rgba(255,255,255,.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.1) 1px, transparent 1px)',
        backgroundSize: '50px 50px'
      }}></div>

      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-[#0a0a0f]/80 backdrop-blur-xl border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
              <OmnifolioLogo size="sm" />
            </Link>
            <div className="flex items-center gap-4">
              <motion.button
                whileHover={{ x: -4 }}
                onClick={handleBackToHome}
                className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors group font-sans"
              >
                <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
                <span className="text-sm font-medium">{t('about.backToHome')}</span>
              </motion.button>
            </div>
          </div>
        </div>
      </header>

      <main className="relative z-10">
        {/* Hero Section */}
        <section className="relative pt-40 pb-24 overflow-hidden">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              className="max-w-4xl mx-auto text-center"
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.2, duration: 0.5 }}
                className="inline-block px-4 py-1.5 mb-6 rounded-full bg-green-500/10 border border-green-500/20 text-green-400 text-sm font-medium tracking-wide font-sans"
              >
                {t('about.badge')}
              </motion.div>
              <h1 className="text-5xl sm:text-7xl font-bold tracking-tight mb-8 font-serif">
                {t('about.title')} <span className="bg-gradient-to-r from-green-400 via-cyan-400 to-purple-500 bg-clip-text text-transparent font-calligraphy">{t('about.titleHighlight')}</span>
              </h1>
              <p className="text-xl text-gray-400 leading-relaxed max-w-2xl mx-auto font-sans">
                {t('about.subtitle')}
              </p>
            </motion.div>
          </div>
        </section>

        {/* The Problem Section - 3D Cards */}
        <section className="py-24 relative">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <motion.div
              initial="initial"
              whileInView="animate"
              viewport={{ once: true }}
              variants={fadeIn}
              className="max-w-3xl mx-auto text-center mb-20"
            >
              <h2 className="text-3xl sm:text-5xl font-bold mb-6 font-serif">{t('about.problemTitle')}</h2>
              <p className="text-gray-400 text-lg leading-relaxed font-sans">
                {t('about.problemSubtitle')}
              </p>
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
              {problemsWeSolve.map((problem, index) => (
                <CardContainer key={index} className="inter-var">
                  <div className="bg-gray-900/40 relative group/card dark:hover:shadow-2xl dark:hover:shadow-green-500/[0.1] border-white/5 w-auto h-auto rounded-3xl p-8 border backdrop-blur-sm">
                    <CardItem
                      translateZ={50}
                      className="w-14 h-14 bg-gradient-to-br from-white/10 to-transparent rounded-2xl flex items-center justify-center mb-6 border border-white/10"
                    >
                      <div className={`w-12 h-12 bg-gradient-to-br ${problem.color} rounded-xl flex items-center justify-center border border-white/5`}>
                        <problem.icon className={`w-6 h-6 ${problem.iconColor}`} />
                      </div>
                    </CardItem>
                    <CardItem
                      as="h3"
                      translateZ={60}
                      className="text-2xl font-bold text-white mb-3 font-serif"
                    >
                      {problem.title}
                    </CardItem>
                    <CardItem
                      as="p"
                      translateZ={40}
                      className="text-gray-400 text-sm leading-relaxed font-sans"
                    >
                      {problem.description}
                    </CardItem>
                  </div>
                </CardContainer>
              ))}
            </div>
          </div>
        </section>

        {/* Our Vision Section */}
        <section className="py-24 bg-gradient-to-b from-transparent via-green-500/5 to-transparent">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid lg:grid-cols-2 gap-16 items-center">
              <motion.div
                initial={{ opacity: 0, x: -30 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.8 }}
              >
                <div className="flex items-center gap-4 mb-8">
                  <div className="w-14 h-14 bg-gradient-to-br from-green-500 to-cyan-500 rounded-2xl flex items-center justify-center shadow-lg shadow-green-500/20">
                    <Target className="w-7 h-7 text-white" />
                  </div>
                  <h2 className="text-4xl font-bold font-serif">{t('about.visionTitle')}</h2>
                </div>
                <div className="space-y-6 text-lg text-gray-400 leading-relaxed font-sans">
                  <p>
                    {t('about.visionText1')}
                  </p>
                  <p>
                    {t('about.visionText2')}
                  </p>
                  <p>
                    {t('about.visionText3')}
                  </p>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, x: 30 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.8 }}
                className="relative"
              >
                <div className="absolute -inset-4 bg-gradient-to-tr from-green-500/10 to-cyan-500/10 blur-2xl rounded-3xl" />
                <div className="relative bg-gray-900/60 backdrop-blur-xl rounded-3xl p-10 border border-white/10 shadow-2xl">
                  <h3 className="text-2xl font-bold mb-8 flex items-center gap-3 font-serif">
                    <Sparkles className="w-6 h-6 text-green-400" />
                    {t('about.everythingInOnePlace')}
                  </h3>
                  <div className="grid grid-cols-1 gap-4">
                    {features.map((feature, index) => (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                        key={index}
                        className="flex items-center gap-4 group"
                      >
                        <div className="w-6 h-6 rounded-full bg-green-500/20 flex items-center justify-center flex-shrink-0 group-hover:bg-green-500/40 transition-colors">
                          <Check className="w-3.5 h-3.5 text-green-400 group-hover:text-white transition-colors" />
                        </div>
                        <span className="text-gray-300 group-hover:text-white transition-colors font-sans">{feature}</span>
                      </motion.div>
                    ))}
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        </section>

        {/* Why We Built This - Manifesto Section */}
        <section className="py-24 overflow-hidden relative">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 1 }}
            >
              <h2 className="text-4xl sm:text-6xl font-bold mb-12 bg-gradient-to-b from-white to-gray-500 bg-clip-text text-transparent font-serif">
                {t('about.whyWeBuilt')}
              </h2>
              <div className="space-y-8 text-xl sm:text-2xl text-gray-400 leading-relaxed font-light italic font-serif">
                <p>
                  {t('about.whyWeBuiltQuote1')}
                </p>
                <p className="text-white font-normal not-italic font-sans">
                  {t('about.whyWeBuiltQuote2')}
                </p>
                <p>
                  {t('about.whyWeBuiltQuote3')}
                </p>
              </div>
            </motion.div>
          </div>
        </section>

        {/* Values Section */}
        <section className="py-24 relative">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-20">
              <h2 className="text-3xl sm:text-5xl font-bold mb-6 font-serif">{t('about.valuesTitle')}</h2>
              <p className="text-gray-400 text-lg max-w-2xl mx-auto font-sans">
                {t('about.valuesSubtitle')}
              </p>
            </div>
            <motion.div
              variants={staggerContainer}
              initial="initial"
              whileInView="animate"
              viewport={{ once: true }}
              className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8"
            >
              {values.map((value, index) => (
                <motion.div
                  key={index}
                  variants={fadeIn}
                  whileHover={{ y: -8 }}
                  className="bg-gray-900/40 backdrop-blur-sm rounded-3xl p-8 border border-white/5 hover:border-green-500/30 transition-all group"
                >
                  <div className="w-14 h-14 bg-gradient-to-br from-green-500/10 to-cyan-500/10 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                    <value.icon className="w-7 h-7 text-green-400 group-hover:text-green-300 transition-colors" />
                  </div>
                  <h3 className="text-xl font-bold text-white mb-4 font-serif">{value.title}</h3>
                  <p className="text-gray-400 leading-relaxed text-sm font-sans">{value.description}</p>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </section>

        {/* The Future Section */}
        <section className="py-24 relative bg-green-500/5">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-green-500 to-cyan-500 rounded-3xl mb-8 shadow-xl shadow-green-500/20"
            >
              <Zap className="w-10 h-10 text-white" />
            </motion.div>
            <h2 className="text-3xl sm:text-5xl font-bold mb-8 font-serif">{t('about.futureTitle')}</h2>
            <div className="space-y-6 text-lg text-gray-400 leading-relaxed font-sans">
              <p>
                {t('about.futureText1')}
              </p>
              <p>
                {t('about.futureText2')}
              </p>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-32 px-4 relative overflow-hidden">
          <div className="max-w-5xl mx-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              className="rounded-[3rem] p-12 sm:p-20 text-center relative overflow-hidden border border-green-500/20 bg-gradient-to-b from-green-900/10 to-transparent"
            >
              <div className="relative z-10">
                <h2 className="text-4xl sm:text-6xl font-bold text-white mb-8 tracking-tight leading-tight font-serif">
                  {t('about.ctaTitle')}
                </h2>
                <p className="text-white/80 text-xl mb-12 max-w-2xl mx-auto font-light leading-relaxed font-sans">
                  {t('about.ctaSubtitle')}
                </p>
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Link
                    href="/"
                    className="inline-flex items-center gap-3 px-10 py-5 bg-green-500 text-white rounded-2xl text-xl font-bold hover:bg-green-600 transition-all shadow-xl shadow-green-500/20 font-sans"
                  >
                    {t('about.ctaButton')}
                    <ArrowRight className="w-6 h-6" />
                  </Link>
                </motion.div>
              </div>
            </motion.div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-white/5 py-16 px-4 bg-[#0a0a0f]">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-10">
          <div className="flex flex-col items-center md:items-start gap-4">
            <OmnifolioLogo size="sm" />
            <p className="text-gray-500 text-sm italic font-sans">
              {t('about.footerTagline')}
            </p>
          </div>

          <div className="flex flex-col items-center gap-6">
            <div className="flex items-center gap-8">
              <Link href="/" className="text-gray-400 hover:text-white text-sm transition-colors font-medium font-sans">
                Home
              </Link>
              <Link href="/about" className="text-white text-sm transition-colors font-semibold font-sans">
                About
              </Link>
              <Link href="/blog" className="text-gray-400 hover:text-white text-sm transition-colors font-medium font-sans">
                Blog
              </Link>
            </div>
            <p className="text-gray-600 text-xs tracking-widest uppercase font-sans">
              © {new Date().getFullYear()} OmniFolio. All rights reserved.
            </p>
          </div>

          <div className="flex items-center gap-4 text-gray-500 text-sm font-sans">
            <span>Built for the future of finance.</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
