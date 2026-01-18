"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  FileText,
  Shield,
  Users,
  CreditCard,
  AlertTriangle,
  Scale,
  Ban,
  RefreshCw,
  Mail,
  CheckCircle,
  XCircle,
  Globe,
  Gavel,
  LucideIcon,
  Zap
} from 'lucide-react';
import { OmnifolioLogo } from '@/components/ui/omnifolio-logo';
import { BackgroundBeams } from '@/components/ui/background-beams';
import { CardContainer, CardItem } from '@/components/ui/3d-card';

const fadeIn = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.6 }
};

const staggerContainer = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  transition: { staggerChildren: 0.1 }
};

interface ContentBlock {
  subtitle?: string;
  text?: string;
  items?: string[];
}

interface Section {
  id: string;
  icon: LucideIcon;
  title: string;
  content: ContentBlock[];
}

export default function TermsOfServicePage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const lastUpdated = "December 19, 2025";
  const effectiveDate = "December 19, 2025";

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleBackToHome = () => {
    router.push('/');
  };

  const summaryCards = [
    {
      icon: Scale,
      title: "Fair Terms",
      text: "Clear, transparent agreements between us and you.",
      color: "from-purple-500 to-blue-500",
      iconColor: "text-purple-400"
    },
    {
      icon: CheckCircle,
      title: "Data Ownership",
      text: "You own your data—we just help you organize it.",
      color: "from-blue-500 to-cyan-500",
      iconColor: "text-blue-400"
    },
    {
      icon: RefreshCw,
      title: "Easy Cancellation",
      text: "Cancel anytime—no long-term commitments.",
      color: "from-cyan-500 to-purple-500",
      iconColor: "text-cyan-400"
    },
    {
      icon: CreditCard,
      title: "Refund Policy",
      text: "14-day refund policy on all new subscriptions.",
      color: "from-purple-500 to-pink-500",
      iconColor: "text-pink-400"
    }
  ];

  const sections: Section[] = [
    {
      id: "acceptance",
      icon: CheckCircle,
      title: "1. Acceptance of Terms",
      content: [
        {
          text: "By accessing or using OmniFolio (the \"Service\"), you agree to be bound by these Terms of Service (\"Terms\"). If you disagree with any part of these terms, you may not access the Service."
        },
        {
          text: "These Terms apply to all visitors, users, and others who access or use the Service. By using the Service, you represent that you are at least 18 years of age and have the legal capacity to enter into these Terms."
        }
      ]
    },
    {
      id: "description",
      icon: FileText,
      title: "2. Description of Service",
      content: [
        {
          subtitle: "OmniFolio provides:",
          items: [
            "Personal financial tracking and management tools",
            "Portfolio monitoring for various asset classes (cash, crypto, stocks, real estate)",
            "Expense tracking and categorization",
            "Financial analytics and reporting",
            "Multi-currency support",
            "Data visualization and insights"
          ]
        },
        {
          text: "OmniFolio is a financial tracking tool only. We do not provide financial advice, investment recommendations, tax advice, or act as a financial institution. The Service is for informational and organizational purposes only."
        }
      ]
    },
    {
      id: "accounts",
      icon: Users,
      title: "3. User Accounts",
      content: [
        {
          subtitle: "Account Registration",
          items: [
            "You must provide accurate, complete, and current information during registration",
            "You are responsible for safeguarding your password and account credentials",
            "You must notify us immediately of any unauthorized access to your account",
            "You may not use another person's account without permission",
            "One person or legal entity may maintain only one free account"
          ]
        },
        {
          subtitle: "Account Responsibilities",
          items: [
            "You are responsible for all activities that occur under your account",
            "You must keep your account information up to date",
            "You are responsible for the accuracy of data you enter into the Service"
          ]
        }
      ]
    },
    {
      id: "acceptable-use",
      icon: Shield,
      title: "4. Acceptable Use Policy",
      content: [
        {
          subtitle: "You agree NOT to:",
          items: [
            "Use the Service for any illegal purpose or in violation of any laws",
            "Attempt to gain unauthorized access to the Service or its related systems",
            "Interfere with or disrupt the Service or servers/networks connected to it",
            "Use automated systems (bots, scrapers) to access the Service without permission",
            "Transmit viruses, malware, or any destructive code",
            "Impersonate any person or entity or misrepresent your affiliation",
            "Collect or harvest user data without consent",
            "Use the Service to send spam or unsolicited communications",
            "Reverse engineer, decompile, or attempt to extract the source code",
            "Sublicense, sell, or transfer your account to another party"
          ]
        }
      ]
    },
    {
      id: "intellectual-property",
      icon: Scale,
      title: "5. Intellectual Property",
      content: [
        {
          subtitle: "Our Property",
          text: "The Service and its original content, features, and functionality are owned by OmniFolio and are protected by international copyright, trademark, patent, trade secret, and other intellectual property laws."
        },
        {
          subtitle: "Your Content",
          items: [
            "You retain ownership of any data you enter into the Service",
            "By using the Service, you grant us a license to store and process your data solely to provide the Service",
            "We will not sell, share, or use your financial data for any purpose other than providing the Service"
          ]
        },
        {
          subtitle: "Feedback",
          text: "Any feedback, suggestions, or ideas you provide about the Service may be used by us without any obligation to compensate you."
        }
      ]
    },
    {
      id: "payments",
      icon: CreditCard,
      title: "6. Payments & Subscriptions",
      content: [
        {
          subtitle: "Free and Paid Services",
          items: [
            "Some features of OmniFolio are available for free",
            "Premium features require a paid subscription",
            "Prices are subject to change with 30 days notice",
            "All fees are exclusive of applicable taxes unless stated otherwise"
          ]
        },
        {
          subtitle: "Billing",
          items: [
            "Subscriptions are billed in advance on a recurring basis (monthly or annually)",
            "You authorize us to charge your payment method on each billing cycle",
            "Failed payments may result in suspension of premium features"
          ]
        },
        {
          subtitle: "Refunds",
          items: [
            "Refunds may be provided at our discretion within 14 days of initial purchase",
            "No refunds are provided for partial subscription periods",
            "Refund requests should be sent to support@omnifolio.app"
          ]
        }
      ]
    },
    {
      id: "cancellation",
      icon: RefreshCw,
      title: "7. Cancellation & Termination",
      content: [
        {
          subtitle: "Cancellation by You",
          items: [
            "You may cancel your subscription at any time through your account settings",
            "Cancellation takes effect at the end of the current billing period",
            "You may continue to use premium features until the period ends",
            "You may delete your account at any time, which will remove all your data"
          ]
        },
        {
          subtitle: "Termination by Us",
          items: [
            "We may suspend or terminate your account for violation of these Terms",
            "We may terminate accounts that remain inactive for more than 24 months",
            "We will provide notice before termination unless immediate action is required",
            "Upon termination, your right to use the Service ceases immediately"
          ]
        }
      ]
    },
    {
      id: "disclaimers",
      icon: AlertTriangle,
      title: "8. Disclaimers & Limitations",
      content: [
        {
          subtitle: "No Financial Advice",
          text: "OmniFolio is NOT a financial advisor, investment advisor, tax advisor, or licensed financial professional. The Service provides tools for tracking and organizing your financial information only. Any decisions you make based on information in the Service are your sole responsibility."
        },
        {
          subtitle: "Data Accuracy",
          items: [
            "We strive to provide accurate market data and calculations, but we do not guarantee accuracy",
            "Third-party data (prices, exchange rates) may be delayed or inaccurate",
            "You are responsible for verifying important financial information independently",
            "We are not liable for decisions made based on data displayed in the Service"
          ]
        },
        {
          subtitle: "Service Availability",
          text: "The Service is provided \"AS IS\" and \"AS AVAILABLE\" without warranties of any kind. We do not guarantee uninterrupted, secure, or error-free operation. We may modify, suspend, or discontinue any part of the Service at any time."
        }
      ]
    },
    {
      id: "liability",
      icon: Ban,
      title: "9. Limitation of Liability",
      content: [
        {
          text: "TO THE MAXIMUM EXTENT PERMITTED BY LAW, OMNIFOLIO AND ITS AFFILIATES, OFFICERS, EMPLOYEES, AGENTS, AND LICENSORS SHALL NOT BE LIABLE FOR:"
        },
        {
          items: [
            "Any indirect, incidental, special, consequential, or punitive damages",
            "Any loss of profits, revenue, data, or business opportunities",
            "Any damages arising from your use or inability to use the Service",
            "Any damages arising from unauthorized access to your account or data",
            "Any damages exceeding the amount you paid us in the 12 months preceding the claim"
          ]
        },
        {
          text: "Some jurisdictions do not allow the exclusion of certain warranties or limitation of liability. In such cases, our liability shall be limited to the maximum extent permitted by law."
        }
      ]
    },
    {
      id: "indemnification",
      icon: Shield,
      title: "10. Indemnification",
      content: [
        {
          text: "You agree to defend, indemnify, and hold harmless OmniFolio and its affiliates, officers, directors, employees, and agents from any claims, damages, losses, liabilities, costs, and expenses (including legal fees) arising from:"
        },
        {
          items: [
            "Your use of the Service",
            "Your violation of these Terms",
            "Your violation of any third-party rights",
            "Any content or data you submit to the Service"
          ]
        }
      ]
    },
    {
      id: "governing-law",
      icon: Gavel,
      title: "11. Governing Law & Disputes",
      content: [
        {
          subtitle: "Governing Law",
          text: "These Terms shall be governed by and construed in accordance with the laws of the State of Delaware, United States, without regard to its conflict of law provisions."
        },
        {
          subtitle: "Dispute Resolution",
          items: [
            "Any disputes shall first be attempted to be resolved through good-faith negotiation",
            "If negotiation fails, disputes shall be resolved through binding arbitration",
            "Arbitration shall be conducted in accordance with the rules of the American Arbitration Association",
            "You waive any right to participate in class action lawsuits against OmniFolio"
          ]
        },
        {
          subtitle: "Exceptions",
          text: "Nothing in these Terms prevents either party from seeking injunctive relief in court for intellectual property violations or other urgent matters."
        }
      ]
    },
    {
      id: "international",
      icon: Globe,
      title: "12. International Users",
      content: [
        {
          items: [
            "The Service is operated from the United States",
            "If you access the Service from outside the US, you do so at your own risk",
            "You are responsible for compliance with local laws in your jurisdiction",
            "We make no representation that the Service is appropriate for use in all locations"
          ]
        }
      ]
    },
    {
      id: "changes",
      icon: RefreshCw,
      title: "13. Changes to Terms",
      content: [
        {
          items: [
            "We reserve the right to modify these Terms at any time",
            "Material changes will be notified via email or prominent notice in the Service",
            "Changes become effective 30 days after posting unless otherwise specified",
            "Continued use of the Service after changes constitutes acceptance",
            "If you disagree with changes, you must stop using the Service"
          ]
        }
      ]
    },
    {
      id: "miscellaneous",
      icon: FileText,
      title: "14. Miscellaneous",
      content: [
        {
          subtitle: "Entire Agreement",
          text: "These Terms, together with our Privacy Policy, constitute the entire agreement between you and OmniFolio regarding the Service."
        },
        {
          subtitle: "Severability",
          text: "If any provision of these Terms is found to be unenforceable, the remaining provisions will continue in full force and effect."
        },
        {
          subtitle: "Waiver",
          text: "Our failure to enforce any right or provision of these Terms shall not be considered a waiver of those rights."
        },
        {
          subtitle: "Assignment",
          text: "You may not assign or transfer these Terms without our prior written consent. We may assign our rights and obligations without restriction."
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
                <span>Back to Home</span>
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
            <Scale className="w-4 h-4" />
            <span>Legal</span>
          </motion.div>
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-5xl sm:text-6xl lg:text-7xl font-bold tracking-tight text-white mb-8"
          >
            Terms of <span className="bg-gradient-to-r from-purple-400 via-cyan-400 to-blue-500 bg-clip-text text-transparent drop-shadow-[0_0_15px_rgba(168,85,247,0.3)]">Service</span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-xl text-gray-400 leading-relaxed max-w-2xl mx-auto"
          >
            Please read these terms carefully before using OmniFolio.
          </motion.p>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4 text-gray-500 text-sm font-medium"
          >
            <span>Effective Date: {effectiveDate}</span>
            <span className="hidden sm:inline">•</span>
            <span>Last Updated: {lastUpdated}</span>
          </motion.div>
        </div>
      </section>

      {/* Highlights Summary */}
      <section className="px-4 sm:px-6 lg:px-8 pb-16 relative z-10">
        <div className="max-w-6xl mx-auto">
          <motion.div
            variants={staggerContainer}
            initial="initial"
            whileInView="animate"
            viewport={{ once: true }}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6"
          >
            {summaryCards.map((card, index) => (
              <CardContainer key={index} className="inter-var w-full">
                <div className="bg-white/[0.03] backdrop-blur-md relative group/card border-white/5 w-full h-full rounded-[1.5rem] p-5 md:p-6 border hover:border-purple-500/30 transition-all overflow-hidden flex flex-col items-center text-center">
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

      {/* Table of Contents */}
      <section className="px-4 sm:px-6 lg:px-8 pb-12 relative z-10">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="bg-white/[0.02] backdrop-blur-sm rounded-[1.5rem] p-6 border border-white/5"
          >
            <h2 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
              <FileText className="w-5 h-5 text-purple-400" />
              Quick Navigation
            </h2>
            <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-2">
              {sections.map((section) => (
                <a
                  key={section.id}
                  href={`#${section.id}`}
                  className="text-gray-400 hover:text-purple-400 transition-colors text-sm py-1.5 flex items-center gap-2 group"
                >
                  <span className="w-1 h-1 bg-gray-600 rounded-full group-hover:bg-purple-400 transition-colors" />
                  {section.title}
                </a>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* Main Content Sections */}
      <section className="px-4 sm:px-6 lg:px-8 pb-32 relative z-10">
        <div className="max-w-4xl mx-auto space-y-16">
          {sections.map((section, idx) => (
            <motion.div
              key={section.id}
              id={section.id}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.6 }}
              className="group relative bg-white/[0.02] backdrop-blur-sm rounded-[2rem] p-6 md:p-10 border border-white/5 hover:border-purple-500/20 transition-all scroll-mt-24"
            >
              <div className="flex items-center gap-5 mb-10">
                <div className="w-12 h-12 bg-gradient-to-br from-purple-500/10 to-cyan-500/10 rounded-xl flex items-center justify-center border border-white/10 group-hover:scale-105 transition-transform duration-500 shadow-lg">
                  <section.icon className="w-6 h-6 text-purple-400 group-hover:text-cyan-400 transition-colors" />
                </div>
                <div>
                  <h2 className="text-3xl font-bold text-white mb-1">{section.title}</h2>
                  <div className="h-1 w-12 bg-gradient-to-r from-purple-500 to-transparent rounded-full" />
                </div>
              </div>

              <div className="space-y-10">
                {section.content.map((block, blockIndex) => (
                  <div key={blockIndex} className="relative">
                    {block.subtitle && (
                      <h3 className="text-xl font-semibold text-gray-100 mb-5 flex items-center gap-3">
                        <span className="w-2 h-2 bg-purple-500 rounded-full" />
                        {block.subtitle}
                      </h3>
                    )}
                    {block.text && (
                      <p className="text-gray-400 leading-relaxed text-lg mb-4">
                        {block.text}
                      </p>
                    )}
                    {block.items && (
                      <ul className="grid gap-4 sm:grid-cols-1 md:grid-cols-2 mt-4">
                        {block.items.map((item, itemIndex) => (
                          <li key={itemIndex} className="flex items-start gap-4 p-5 rounded-2xl bg-white/[0.02] border border-white/5 hover:border-white/10 hover:bg-white/[0.04] transition-all group/item shadow-sm">
                            <div className="mt-1 flex-shrink-0">
                              <Zap className="w-4 h-4 text-purple-500/50 group-hover/item:text-purple-400 transition-colors" />
                            </div>
                            <span className="text-gray-300 text-sm leading-relaxed group-hover/item:text-white transition-colors">{item}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                ))}
              </div>
            </motion.div>
          ))}

          {/* Contact Section - Redesigned - REMOVED */}


          {/* Related Links - Redesigned */}
          <section className="pt-8">
            <div className="bg-white/[0.02] border border-white/5 rounded-[2rem] p-8">
              <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                <Shield className="w-5 h-5 text-cyan-400" />
                Related Resources
              </h3>
              <div className="flex flex-wrap gap-4">
                <Link
                  href="/privacy"
                  className="flex items-center gap-3 px-6 py-3 bg-white/[0.05] border border-white/10 text-gray-300 rounded-xl hover:bg-white/[0.1] hover:text-white transition-all group"
                >
                  <Shield className="w-4 h-4 text-purple-400" />
                  <span>Privacy Policy</span>
                  <ArrowLeft className="w-4 h-4 rotate-180 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                </Link>
              </div>
            </div>
          </section>

          {/* Legal Footer Note */}
          <footer className="text-center py-12">
            <p className="text-gray-500 text-sm leading-relaxed max-w-3xl mx-auto italic">
              These Terms of Service are effective as of {effectiveDate}. By using OmniFolio,
              you acknowledge that you have read, understood, and agree to be bound by these Terms.
              Securely managed in the cloud.
            </p>
          </footer>
        </div>
      </section>

      {/* Main Footer */}
      <footer className="border-t border-white/5 py-12 px-4 sm:px-6 lg:px-8 relative z-10 bg-[#030712]/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-8 mb-12">
            <div className="flex items-center gap-3 group">
              <OmnifolioLogo size="sm" />
              <div className="w-px h-6 bg-white/10 mx-2" />
              <span className="text-gray-500 font-medium tracking-wider text-sm uppercase">Legal Department</span>
            </div>

            <nav className="flex items-center gap-8">
              {[
                { name: 'Home', href: '/' },
                { name: 'About', href: '/about' },
                { name: 'Privacy', href: '/privacy' },
                { name: 'Terms', href: '/terms', active: true },
              ].map((item) => (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`text-sm font-medium transition-all relative group ${item.active ? 'text-white' : 'text-gray-400 hover:text-white'}`}
                >
                  {item.name}
                  <span className={`absolute -bottom-1 left-0 h-0.5 bg-gradient-to-r from-purple-500 to-cyan-500 transition-all ${item.active ? 'w-full' : 'w-0 group-hover:w-full'}`} />
                </Link>
              ))}
            </nav>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between pt-8 border-t border-white/5 gap-4">
            <p className="text-gray-600 text-xs font-medium">
              © {new Date().getFullYear()} OmniFolio Technologies. All rights reserved and protected.
            </p>
            <div className="flex items-center gap-6 text-xs text-gray-500 font-medium">
              <Link href="/terms" className="hover:text-purple-400 transition-colors">Term Definitions</Link>
              <Link href="/privacy" className="hover:text-cyan-400 transition-colors">Compliance Information</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
