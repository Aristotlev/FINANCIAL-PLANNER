"use client";

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
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
  LucideIcon
} from 'lucide-react';
import { OmnifolioLogo } from '@/components/ui/omnifolio-logo';

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
  const lastUpdated = "December 19, 2025";
  const effectiveDate = "December 19, 2025";

  const handleBackToHome = () => {
    router.push('/');
  };

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
            <FileText className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold text-white mb-6">
            Terms of Service
          </h1>
          <p className="text-xl text-gray-300 leading-relaxed mb-4">
            Please read these terms carefully before using OmniFolio.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 text-sm text-gray-500">
            <span>Effective Date: {effectiveDate}</span>
            <span className="hidden sm:inline">•</span>
            <span>Last Updated: {lastUpdated}</span>
          </div>
        </div>
      </section>

      {/* Quick Summary */}
      <section className="py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <div className="bg-gradient-to-r from-purple-500/10 to-cyan-500/10 rounded-2xl p-8 border border-purple-500/20">
            <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
              <Scale className="w-5 h-5 text-purple-400" />
              Key Points Summary
            </h2>
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-green-400 mt-0.5 flex-shrink-0" />
                <span className="text-gray-300">You own your data—we just help you organize it</span>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-green-400 mt-0.5 flex-shrink-0" />
                <span className="text-gray-300">We're a tracking tool, not financial advisors</span>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-green-400 mt-0.5 flex-shrink-0" />
                <span className="text-gray-300">Cancel anytime—no long-term commitments</span>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-green-400 mt-0.5 flex-shrink-0" />
                <span className="text-gray-300">14-day refund policy on new subscriptions</span>
              </div>
              <div className="flex items-start gap-3">
                <XCircle className="w-5 h-5 text-red-400 mt-0.5 flex-shrink-0" />
                <span className="text-gray-300">No illegal activities or abuse of the Service</span>
              </div>
              <div className="flex items-start gap-3">
                <XCircle className="w-5 h-5 text-red-400 mt-0.5 flex-shrink-0" />
                <span className="text-gray-300">No automated scraping or reverse engineering</span>
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
                    {block.subtitle && (
                      <h3 className="text-lg font-medium text-gray-200 mb-3">
                        {block.subtitle}
                      </h3>
                    )}
                    {block.text && (
                      <p className="text-gray-400 leading-relaxed">
                        {block.text}
                      </p>
                    )}
                    {block.items && (
                      <ul className="space-y-2">
                        {block.items.map((item, itemIndex) => (
                          <li key={itemIndex} className="flex items-start gap-3">
                            <div className="w-1.5 h-1.5 rounded-full bg-purple-400 mt-2 flex-shrink-0" />
                            <span className="text-gray-400">{item}</span>
                          </li>
                        ))}
                      </ul>
                    )}
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
            <h2 className="text-2xl font-bold text-white mb-4">Questions About These Terms?</h2>
            <p className="text-gray-400 mb-6 max-w-2xl mx-auto">
              If you have any questions about these Terms of Service, please contact our legal team.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <a
                href="mailto:legal@omnifolio.app"
                className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-cyan-600 text-white rounded-xl font-medium hover:from-purple-500 hover:to-cyan-500 transition-all"
              >
                <Mail className="w-4 h-4" />
                legal@omnifolio.app
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Related Links */}
      <section className="py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <div className="bg-gray-900/50 rounded-xl p-6 border border-gray-800">
            <h3 className="text-lg font-semibold text-white mb-4">Related Documents</h3>
            <div className="flex flex-wrap gap-4">
              <Link
                href="/privacy"
                className="inline-flex items-center gap-2 px-4 py-2 bg-gray-800 text-gray-300 rounded-lg hover:bg-gray-700 hover:text-white transition-colors"
              >
                <Shield className="w-4 h-4" />
                Privacy Policy
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Legal Footer Note */}
      <section className="py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <div className="bg-gray-900/50 rounded-xl p-6 border border-gray-800">
            <p className="text-gray-500 text-sm leading-relaxed">
              These Terms of Service are effective as of {effectiveDate}. By using OmniFolio, 
              you acknowledge that you have read, understood, and agree to be bound by these Terms. 
              If you are using the Service on behalf of an organization, you represent that you 
              have the authority to bind that organization to these Terms.
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
            <Link href="/privacy" className="text-gray-400 hover:text-white text-sm transition-colors">
              Privacy
            </Link>
            <Link href="/terms" className="text-purple-400 text-sm transition-colors">
              Terms
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
