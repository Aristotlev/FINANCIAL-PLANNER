"use client";

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  Shield,
  Lock,
  Eye,
  Database,
  Share2,
  Clock,
  Mail,
  FileText,
  AlertCircle,
  CheckCircle,
  Globe,
  Zap,
  Sparkles,
  Fingerprint,
  HardDrive,
  UserCheck
} from 'lucide-react';
import { OmnifolioLogo } from '@/components/ui/omnifolio-logo';
import { BackgroundBeams } from '@/components/ui/background-beams';
import { CardContainer, CardItem } from '@/components/ui/3d-card';
import { useTranslation } from '@/contexts/translation-context';

const fadeIn = {
  initial: { opacity: 0, y: 20 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true },
  transition: { duration: 0.6 }
};

const staggerContainer = {
  initial: { opacity: 0 },
  whileInView: { opacity: 1 },
  viewport: { once: true },
  transition: { staggerChildren: 0.1 }
};

export default function PrivacyPolicyPage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const lastUpdated = "December 19, 2025";
  const { t } = useTranslation();

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleBackToHome = () => {
    router.push('/');
  };

  const summaryCards = [
    {
      icon: Eye,
      title: "Data Sovereignty",
      text: "We never sell your personal data. You own it.",
      color: "from-blue-500 to-cyan-500",
      iconColor: "text-blue-400"
    },
    {
      icon: Shield,
      title: "Ironclad Security",
      text: "Bank-level AES-256 encryption at rest and in transit.",
      color: "from-purple-500 to-blue-500",
      iconColor: "text-purple-400"
    },
    {
      icon: Fingerprint,
      title: "Privacy by Design",
      text: "Every feature is built with your anonymity in mind.",
      color: "from-cyan-500 to-purple-500",
      iconColor: "text-cyan-400"
    },
    {
      icon: UserCheck,
      title: "Global Compliance",
      text: "Strict adherence to GDPR, CCPA, and global standards.",
      color: "from-purple-500 to-pink-500",
      iconColor: "text-pink-400"
    }
  ];

  const sections = [
    // ... (rest of sections data)
    {
      id: "information-we-collect",
      icon: Database,
      title: "1. Information We Collect",
      content: [
        {
          subtitle: "Information You Provide",
          items: [
            "Account information (name, email address, password)",
            "Profile information (profile picture, preferences, currency settings)",
            "Financial data you choose to enter (account balances, transactions, assets)",
            "Communications with us (support requests, feedback)"
          ]
        },
        {
          subtitle: "Information Collected Automatically",
          items: [
            "Device information (browser type, operating system, device identifiers)",
            "Usage data (features used, pages visited, time spent)",
            "Log data (IP address, access times, error reports)",
            "Cookies and similar technologies for authentication and preferences"
          ]
        }
      ]
    },
    {
      id: "how-we-use",
      icon: Eye,
      title: "2. How We Use Your Information",
      content: [
        {
          subtitle: "We use your information to:",
          items: [
            "Provide, maintain, and improve our services",
            "Process and display your financial data as requested",
            "Send you important updates about your account",
            "Respond to your comments, questions, and support requests",
            "Monitor and analyze trends, usage, and activities",
            "Detect, investigate, and prevent fraudulent or unauthorized activity",
            "Personalize your experience and provide relevant features",
            "Comply with legal obligations"
          ]
        }
      ]
    },
    {
      id: "data-security",
      icon: Lock,
      title: "3. Data Security",
      content: [
        {
          subtitle: "We protect your data with:",
          items: [
            "Industry-standard encryption (TLS 1.3) for all data in transit",
            "AES-256 encryption for sensitive data at rest",
            "Secure authentication including optional two-factor authentication",
            "Regular security audits and vulnerability assessments",
            "Strict access controls limiting employee access to user data",
            "Secure cloud infrastructure with SOC 2 compliant providers"
          ]
        }
      ]
    },
    {
      id: "data-sharing",
      icon: Share2,
      title: "4. Information Sharing",
      content: [
        {
          subtitle: "We do NOT sell your personal information. We may share data with:",
          items: [
            "Service providers who assist in operating our platform (hosting, analytics)",
            "Professional advisors (lawyers, auditors) when legally required",
            "Law enforcement when required by valid legal process",
            "Other parties with your explicit consent"
          ]
        },
        {
          subtitle: "Third-party services we use:",
          items: [
            "Google Cloud Platform (infrastructure and authentication)",
            "Supabase (database services)",
            "Analytics providers (usage statistics only, no financial data)"
          ]
        }
      ]
    },
    {
      id: "your-rights",
      icon: CheckCircle,
      title: "5. Your Rights & Choices",
      content: [
        {
          subtitle: "Depending on your location, you may have the right to:",
          items: [
            "Access: Request a copy of the personal data we hold about you",
            "Correction: Request correction of inaccurate personal data",
            "Deletion: Request deletion of your personal data",
            "Portability: Request your data in a portable format",
            "Objection: Object to certain processing of your data",
            "Restriction: Request we limit how we use your data",
            "Withdraw Consent: Withdraw consent where processing is based on consent"
          ]
        }
      ]
    },
    {
      id: "data-retention",
      icon: Clock,
      title: "6. Data Retention",
      content: [
        {
          subtitle: "How long we keep your data:",
          items: [
            "Active account data: Retained while your account is active",
            "Deleted accounts: Data removed within 30 days of deletion request",
            "Backup data: Purged from backups within 90 days",
            "Legal requirements: Some data may be retained longer if required by law",
            "Analytics data: Aggregated, anonymized data may be retained indefinitely"
          ]
        }
      ]
    },
    {
      id: "cookies",
      icon: FileText,
      title: "7. Cookies & Tracking",
      content: [
        {
          subtitle: "We use cookies for:",
          items: [
            "Essential cookies: Required for authentication and security",
            "Preference cookies: Remember your settings and preferences",
            "Analytics cookies: Understand how you use our service (anonymized)",
            "You can manage cookie preferences in your browser settings"
          ]
        }
      ]
    },
    {
      id: "international",
      icon: Globe,
      title: "8. International Data Transfers",
      content: [
        {
          subtitle: "For users outside the United States:",
          items: [
            "Your data may be transferred to and processed in the United States",
            "We use Standard Contractual Clauses for EU data transfers",
            "We comply with GDPR requirements for European users",
            "We comply with applicable data protection laws in your jurisdiction"
          ]
        }
      ]
    },
    {
      id: "children",
      icon: AlertCircle,
      title: "9. Children's Privacy",
      content: [
        {
          subtitle: "Age restrictions:",
          items: [
            "OmniFolio is not intended for users under 18 years of age",
            "We do not knowingly collect data from children under 18",
            "If we learn we've collected data from a child, we will delete it promptly",
            "Parents can contact us if they believe their child has provided us data"
          ]
        }
      ]
    },
    {
      id: "changes",
      icon: FileText,
      title: "10. Changes to This Policy",
      content: [
        {
          subtitle: "How we handle updates:",
          items: [
            "We may update this policy from time to time",
            "Material changes will be notified via email or in-app notification",
            "Continued use after changes constitutes acceptance",
            "Previous versions are available upon request"
          ]
        }
      ]
    }
  ];

  if (!mounted) return null;

  return (
    <div className="min-h-screen bg-[#030712] text-white selection:bg-purple-500/30 relative overflow-x-hidden">
      <BackgroundBeams />

      {/* Decorative gradients */}
      <div className="fixed top-[-10%] left-[-10%] w-[40%] h-[40%] bg-purple-900/10 blur-[120px] rounded-full pointer-events-none z-0" />
      <div className="fixed bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-900/10 blur-[120px] rounded-full pointer-events-none z-0" />

      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-[#030712]/60 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            <Link href="/" className="flex items-center gap-2 group">
              <OmnifolioLogo size="sm" />
              <div className="absolute -inset-2 bg-gradient-to-r from-purple-500/20 to-cyan-500/20 blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            </Link>
            <div className="flex items-center gap-4">
              <motion.button
                whileHover={{ x: -2 }}
                onClick={handleBackToHome}
                className="flex items-center gap-2 text-gray-400 hover:text-white transition-all font-medium py-2 px-4 rounded-full hover:bg-white/5"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>{t('privacy.backToHome')}</span>
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
            className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-purple-400 text-sm font-medium mb-8"
          >
            <Shield className="w-4 h-4" />
            <span>{t('privacy.badge')}</span>
          </motion.div>
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-5xl sm:text-6xl lg:text-7xl font-bold tracking-tight text-white mb-8"
          >
            {t('privacy.title')} <span className="bg-gradient-to-r from-purple-400 via-cyan-400 to-blue-500 bg-clip-text text-transparent drop-shadow-[0_0_15px_rgba(168,85,247,0.3)]">{t('privacy.titleHighlight')}</span> Commitment
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-xl text-gray-400 leading-relaxed max-w-2xl mx-auto"
          >
            {t('privacy.subtitle')}
          </motion.p>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="mt-6 text-gray-500 text-sm font-medium"
          >
            {t('privacy.lastUpdated')}: {lastUpdated}
          </motion.p>
        </div>
      </section>

      {/* Quick Summary / Highlights - More compact */}
      <section className="px-4 sm:px-6 lg:px-8 pb-16 relative z-10">
        <div className="max-w-6xl mx-auto">
          <motion.div
            variants={staggerContainer}
            initial="initial"
            whileInView="whileInView"
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6"
          >
            {summaryCards.map((card, index) => (
              <CardContainer key={index} className="inter-var w-full">
                <div className="bg-white/[0.03] backdrop-blur-md relative group/card dark:hover:shadow-2xl dark:hover:shadow-emerald-500/[0.1] border-white/5 w-full h-full rounded-[1.5rem] p-5 md:p-6 border hover:border-purple-500/30 transition-all overflow-hidden flex flex-col items-center text-center">
                  {/* Hover gradient reveal */}
                  <div className="absolute inset-0 bg-gradient-to-br from-purple-600/5 to-transparent opacity-0 group-hover/card:opacity-100 transition-opacity duration-500" />

                  <CardItem translateZ={40} className="mb-4">
                    <div className={`w-12 h-12 bg-gradient-to-br ${card.color} rounded-xl flex items-center justify-center shadow-lg`}>
                      <card.icon className="w-6 h-6 text-white" />
                    </div>
                  </CardItem>
                  <CardItem
                    as="h3"
                    translateZ={50}
                    className="text-lg font-bold text-white mb-2"
                  >
                    {card.title}
                  </CardItem>
                  <CardItem
                    as="p"
                    translateZ={30}
                    className="text-gray-400 text-sm leading-relaxed"
                  >
                    {card.text}
                  </CardItem>
                </div>
              </CardContainer>
            ))}
          </motion.div>
        </div>
      </section>

      <section className="px-4 sm:px-6 lg:px-8 pb-32 relative z-10">
        <div className="max-w-4xl mx-auto">
          {/* Main Content Area - Centered and Compact */}
          <div className="space-y-16">
            {sections.map((section, idx) => (
              <motion.div
                key={section.id}
                id={section.id}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{ duration: 0.6, delay: idx * 0.05 }}
                className="group relative bg-white/[0.02] backdrop-blur-sm rounded-[2rem] p-6 md:p-10 border border-white/5 hover:border-purple-500/20 transition-all scroll-mt-24"
              >
                {/* Section header - Compact */}
                <div className="flex items-center gap-5 mb-8">
                  <div className="w-12 h-12 bg-gradient-to-br from-purple-500/10 to-cyan-500/10 rounded-xl flex items-center justify-center border border-white/10 group-hover:scale-105 transition-transform duration-500 shadow-lg">
                    <section.icon className="w-6 h-6 text-purple-400 group-hover:text-cyan-400 transition-colors" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-white mb-1">{section.title}</h2>
                    <div className="h-0.5 w-12 bg-gradient-to-r from-purple-500 to-transparent rounded-full" />
                  </div>
                </div>

                {/* Section content - Improved readability */}
                <div className="space-y-10">
                  {section.content.map((block, blockIndex) => (
                    <div key={blockIndex} className="relative">
                      <h3 className="text-xl font-semibold text-gray-200 mb-5 flex items-center gap-3">
                        <span className="w-2 h-2 bg-cyan-500 rounded-full" />
                        {block.subtitle}
                      </h3>
                      <ul className="grid gap-4 sm:grid-cols-1 md:grid-cols-2">
                        {block.items.map((item, itemIndex) => (
                          <li key={itemIndex} className="flex items-start gap-4 p-5 rounded-2xl bg-white/[0.02] border border-white/5 hover:border-white/10 hover:bg-white/[0.04] transition-all group/item shadow-sm">
                            <div className="mt-1 flex-shrink-0">
                              <Zap className="w-4 h-4 text-purple-500/50 group-hover/item:text-purple-400 transition-colors" />
                            </div>
                            <span className="text-gray-300 text-sm leading-relaxed group-hover/item:text-white transition-colors">{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </motion.div>
            ))}

            {/* Legal Footer Note - Centered and Readable */}
            <section className="bg-white/[0.02] border border-white/5 rounded-[2rem] p-10 text-center">
              <p className="text-gray-400 text-sm leading-relaxed max-w-3xl mx-auto italic">
                This Privacy Policy is effective as of {lastUpdated} and applies to all users of
                OmniFolio services. This policy complies with the General Data Protection Regulation
                (GDPR), the California Consumer Privacy Act (CCPA), and other applicable privacy laws.
                By using OmniFolio, you acknowledge that you have read and understood this Privacy Policy.
              </p>
            </section>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/5 py-12 px-4 sm:px-6 lg:px-8 relative z-10 bg-[#030712]/50 backdrop-blur-md">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-8 mb-12">
            <div className="flex items-center gap-3 group">
              <OmnifolioLogo size="sm" />
              <div className="w-px h-6 bg-white/10 mx-2" />
              <span className="text-gray-500 font-medium">Privacy Division</span>
            </div>

            <div className="flex items-center gap-8">
              <Link href="/" className="text-gray-400 hover:text-white transition-colors font-medium relative group">
                Home
                <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-purple-500 transition-all group-hover:w-full" />
              </Link>
              <Link href="/about" className="text-gray-400 hover:text-white transition-colors font-medium relative group">
                About
                <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-purple-500 transition-all group-hover:w-full" />
              </Link>
              <Link href="/privacy" className="text-white transition-colors font-medium relative group">
                Privacy
                <span className="absolute -bottom-1 left-0 w-full h-0.5 bg-purple-500" />
              </Link>
              <Link href="/terms" className="text-gray-400 hover:text-white transition-colors font-medium relative group">
                Terms
                <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-purple-500 transition-all group-hover:w-full" />
              </Link>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between pt-8 border-t border-white/5 gap-4">
            <p className="text-gray-600 text-xs font-medium">
              © {new Date().getFullYear()} OmniFolio Technologies. Securely managed.
            </p>
            <div className="flex items-center gap-6 text-xs text-gray-500 font-medium">
              <Link href="/terms" className="hover:text-white transition-colors">Compliance Status</Link>
              <Link href="/privacy" className="hover:text-white transition-colors">Data Processing Agreement</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
