"use client";

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
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
  Globe
} from 'lucide-react';
import { OmnifolioLogo } from '@/components/ui/omnifolio-logo';

export default function PrivacyPolicyPage() {
  const router = useRouter();
  const lastUpdated = "December 19, 2025";

  const handleBackToHome = () => {
    router.push('/');
  };

  const sections = [
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
              <button 
                onClick={handleBackToHome}
                className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Home
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="pt-32 pb-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-purple-500 to-cyan-500 rounded-2xl mb-6">
            <Shield className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold text-white mb-6">
            Privacy Policy
          </h1>
          <p className="text-xl text-gray-300 leading-relaxed mb-4">
            Your privacy is fundamental to everything we build at OmniFolio.
          </p>
          <p className="text-gray-500 text-sm">
            Last Updated: {lastUpdated}
          </p>
        </div>
      </section>

      {/* Quick Summary */}
      <section className="py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <div className="bg-gradient-to-r from-purple-500/10 to-cyan-500/10 rounded-2xl p-8 border border-purple-500/20">
            <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
              <Lock className="w-5 h-5 text-purple-400" />
              Privacy at a Glance
            </h2>
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-green-400 mt-0.5 flex-shrink-0" />
                <span className="text-gray-300">We never sell your personal data</span>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-green-400 mt-0.5 flex-shrink-0" />
                <span className="text-gray-300">Bank-level encryption protects your data</span>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-green-400 mt-0.5 flex-shrink-0" />
                <span className="text-gray-300">You can delete your data anytime</span>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-green-400 mt-0.5 flex-shrink-0" />
                <span className="text-gray-300">We're GDPR and CCPA compliant</span>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-green-400 mt-0.5 flex-shrink-0" />
                <span className="text-gray-300">Your financial data stays private</span>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-green-400 mt-0.5 flex-shrink-0" />
                <span className="text-gray-300">Transparent about data practices</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Table of Contents */}
      <section className="py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <div className="bg-gray-800/50 rounded-2xl p-6 border border-gray-700">
            <h2 className="text-lg font-semibold text-white mb-4">Contents</h2>
            <div className="grid sm:grid-cols-2 gap-2">
              {sections.map((section) => (
                <a
                  key={section.id}
                  href={`#${section.id}`}
                  className="text-gray-400 hover:text-purple-400 transition-colors text-sm py-1"
                >
                  {section.title}
                </a>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <section className="py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto space-y-12">
          {sections.map((section) => (
            <div 
              key={section.id} 
              id={section.id}
              className="bg-gray-800/30 rounded-2xl p-8 border border-gray-700 scroll-mt-24"
            >
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-gradient-to-br from-purple-500/20 to-cyan-500/20 rounded-xl flex items-center justify-center border border-purple-500/30">
                  <section.icon className="w-5 h-5 text-purple-400" />
                </div>
                <h2 className="text-2xl font-bold text-white">{section.title}</h2>
              </div>
              
              <div className="space-y-6">
                {section.content.map((block, blockIndex) => (
                  <div key={blockIndex}>
                    <h3 className="text-lg font-medium text-gray-200 mb-3">
                      {block.subtitle}
                    </h3>
                    <ul className="space-y-2">
                      {block.items.map((item, itemIndex) => (
                        <li key={itemIndex} className="flex items-start gap-3">
                          <div className="w-1.5 h-1.5 rounded-full bg-purple-400 mt-2 flex-shrink-0" />
                          <span className="text-gray-400">{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Contact Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-gray-800/30">
        <div className="max-w-4xl mx-auto">
          <div className="bg-gray-800/50 rounded-2xl p-8 border border-gray-700 text-center">
            <div className="inline-flex items-center justify-center w-12 h-12 bg-gradient-to-br from-purple-500 to-cyan-500 rounded-xl mb-4">
              <Mail className="w-6 h-6 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-4">Questions About Privacy?</h2>
            <p className="text-gray-400 mb-6 max-w-2xl mx-auto">
              If you have any questions about this Privacy Policy or our data practices, 
              we're here to help. Your privacy matters to us.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <a
                href="mailto:privacy@omnifolio.app"
                className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-cyan-600 text-white rounded-xl font-medium hover:from-purple-500 hover:to-cyan-500 transition-all"
              >
                <Mail className="w-4 h-4" />
                privacy@omnifolio.app
              </a>
            </div>
            <p className="text-gray-500 text-sm mt-6">
              We aim to respond to all privacy-related inquiries within 48 hours.
            </p>
          </div>
        </div>
      </section>

      {/* Legal Footer Note */}
      <section className="py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <div className="bg-gray-900/50 rounded-xl p-6 border border-gray-800">
            <p className="text-gray-500 text-sm leading-relaxed">
              This Privacy Policy is effective as of {lastUpdated} and applies to all users of 
              OmniFolio services. This policy complies with the General Data Protection Regulation 
              (GDPR), the California Consumer Privacy Act (CCPA), and other applicable privacy laws. 
              By using OmniFolio, you acknowledge that you have read and understood this Privacy Policy.
            </p>
          </div>
        </div>
      </section>

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
            <Link href="/privacy" className="text-purple-400 text-sm transition-colors">
              Privacy
            </Link>
            <Link href="/terms" className="text-gray-400 hover:text-white text-sm transition-colors">
              Terms
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
