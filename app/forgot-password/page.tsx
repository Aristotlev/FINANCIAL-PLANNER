"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { 
  Mail, 
  ArrowRight, 
  Loader2, 
  CheckCircle,
  ArrowLeft
} from 'lucide-react';
import { useBetterAuth } from '../../contexts/better-auth-context';
import { OmnifolioLogo } from '../../components/ui/omnifolio-logo';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [error, setError] = useState('');
  const { resetPassword } = useBetterAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      await resetPassword(email);
      setIsSubmitted(true);
    } catch (err: any) {
      setError(err.message || 'Failed to send reset email. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white flex flex-col">
      {/* Header */}
      <header className="px-6 py-6 flex justify-between items-center border-b border-gray-800/50">
        <Link href="/">
          <OmnifolioLogo size="md" />
        </Link>
        <Link href="/login" className="text-sm text-gray-400 hover:text-white flex items-center gap-2 transition-colors">
          <ArrowLeft className="w-4 h-4" />
          Back to Login
        </Link>
      </header>

      <div className="flex-1 flex items-center justify-center p-4 sm:p-8">
        <div className="w-full max-w-md space-y-8">
          <div className="text-center">
            <h1 className="text-3xl font-bold tracking-tight text-white">
              Reset Password
            </h1>
            <p className="mt-2 text-gray-400">
              Enter your email address and we'll send you a link to reset your password.
            </p>
          </div>

          <div className="bg-gray-900/50 backdrop-blur-xl border border-gray-800 rounded-2xl p-8 shadow-xl">
            {isSubmitted ? (
              <div className="text-center space-y-6">
                <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center mx-auto">
                  <CheckCircle className="w-8 h-8 text-green-500" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-xl font-semibold text-white">Check your email</h3>
                  <p className="text-gray-400 text-sm">
                    We've sent a password reset link to <span className="text-white font-medium">{email}</span>
                  </p>
                </div>
                <Link 
                  href="/login"
                  className="block w-full py-3 bg-gray-800 hover:bg-gray-700 text-white font-medium rounded-xl transition-colors"
                >
                  Return to Login
                </Link>
                <button 
                  onClick={() => setIsSubmitted(false)}
                  className="text-sm text-gray-500 hover:text-gray-400"
                >
                  Did not receive the email? Try again
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6">
                {error && (
                  <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
                    {error}
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-5 w-5 text-gray-500" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 bg-gray-800/50 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all"
                      placeholder="john@example.com"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full flex items-center justify-center gap-2 py-4 bg-white/5 border border-gray-700 hover:border-gray-600 rounded-xl text-lg font-medium hover:bg-white/10 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      Send Reset Link
                      <ArrowRight className="w-5 h-5" />
                    </>
                  )}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
