"use client";

import { useState, useEffect } from 'react';
import { useBetterAuth } from '@/contexts/better-auth-context';
import { Modal } from '@/components/ui/modal';
import { Shield, Download, Copy, CheckCircle, AlertTriangle, Key, Lock } from 'lucide-react';

export function SecurityKeyModal() {
  const { user, isAuthenticated } = useBetterAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [securityKey, setSecurityKey] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [hasCopied, setHasCopied] = useState(false);
  const [hasDownloaded, setHasDownloaded] = useState(false);

  useEffect(() => {
    if (isAuthenticated && user) {
      checkUserPreference();
    } else {
      setIsOpen(false);
      setIsLoading(false);
    }
  }, [isAuthenticated, user]);

  const checkUserPreference = async () => {
    try {
      // Check if user has seen the modal via API (bypassing RLS issues)
      const response = await fetch('/api/user/security-key');
      
      if (!response.ok) {
        console.error('Error checking user preferences:', response.statusText);
        return;
      }

      const data = await response.json();

      // If no preference record exists or has_seen_security_modal is false OR security_key is missing
      // We check for security_key specifically to handle cases where the flag might be true but no key is saved
      // This ensures users always have a key generated and saved
      if (!data.hasSeenModal || !data.securityKey) {
        // Only generate key if one doesn't exist in DB
        if (!data.securityKey) {
          generateKey();
        } else {
          // If key exists but flag is false, use existing key
          setSecurityKey(data.securityKey);
        }
        setIsOpen(true);
      } else {
        // If they have seen it AND have a key, ensure modal is closed
        setIsOpen(false);
      }
    } catch (error) {
      console.error('Error in checkUserPreference:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const generateKey = () => {
    // Generate a random security key
    // Format: XXXX-XXXX-XXXX-XXXX-XXXX
    const array = new Uint8Array(20);
    crypto.getRandomValues(array);
    const key = Array.from(array)
      .map(b => b.toString(16).padStart(2, '0'))
      .join('')
      .match(/.{1,4}/g)
      ?.join('-')
      .toUpperCase() || '';
    
    setSecurityKey(key);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(securityKey);
    setHasCopied(true);
    setTimeout(() => setHasCopied(false), 2000);
  };

  const handleDownload = () => {
    const element = document.createElement("a");
    const file = new Blob(
      [`OMNIFOLIO SECURITY KEY\n\nThis is your unique security key. Please keep it safe.\n\nKEY: ${securityKey}\n\nGenerated on: ${new Date().toLocaleString()}\nUser: ${user?.email}`], 
      { type: 'text/plain' }
    );
    element.href = URL.createObjectURL(file);
    element.download = "omnifolio-security-key.txt";
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
    setHasDownloaded(true);
  };

  const handleConfirm = async () => {
    if (!hasDownloaded && !hasCopied) {
      // Ideally we force them to download, but for now let's just warn or allow if they insist?
      // Let's require download or copy action at least once.
      // But for better UX, maybe just require them to click "I have saved this key"
    }

    if (!user?.id) return;

    setIsSaving(true);
    try {
      // Save via API to bypass RLS
      const response = await fetch('/api/user/security-key', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ securityKey }),
      });

      if (!response.ok) {
        console.error('Error updating user preferences:', response.statusText);
        // Show error toast?
      } else {
        setIsOpen(false);
      }
    } catch (error) {
      console.error('Error in handleConfirm:', error);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading || !isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {}} // Prevent closing
      title="Security Key Generation"
      maxWidth="max-w-2xl"
      hideCloseButton={true}
      preventCloseOnOutsideClick={true}
    >
      <div className="space-y-6 p-2">
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-4 flex items-start gap-3">
          <AlertTriangle className="w-6 h-6 text-amber-500 flex-shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h3 className="font-semibold text-amber-500">Important Security Action Required</h3>
            <p className="text-sm text-amber-200/80">
              To ensure the highest level of security for your financial data, we have generated a unique security key for your account. 
              You must save this key in a secure location.
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center gap-2 text-white/90">
            <Shield className="w-5 h-5 text-emerald-500" />
            <h3 className="font-medium">Your Unique Security Key</h3>
          </div>
          
          <div className="relative group">
            <div className="bg-black/40 border border-white/10 rounded-lg p-6 text-center font-mono text-2xl tracking-wider text-emerald-400 break-all select-all">
              {securityKey}
            </div>
            <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                onClick={handleCopy}
                className="p-2 hover:bg-white/10 rounded-md transition-colors"
                title="Copy to clipboard"
              >
                {hasCopied ? <CheckCircle className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4 text-white/70" />}
              </button>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="bg-zinc-900/50 border border-white/5 rounded-lg p-4 space-y-2">
              <div className="flex items-center gap-2 text-white/90">
                <Lock className="w-4 h-4 text-blue-400" />
                <h4 className="font-medium text-sm">Why do I need this?</h4>
              </div>
              <p className="text-xs text-white/60 leading-relaxed">
                This key is used to encrypt your sensitive financial data. Without it, you may lose access to your encrypted information if you forget your password.
              </p>
            </div>
            
            <div className="bg-zinc-900/50 border border-white/5 rounded-lg p-4 space-y-2">
              <div className="flex items-center gap-2 text-white/90">
                <Key className="w-4 h-4 text-purple-400" />
                <h4 className="font-medium text-sm">How to store it?</h4>
              </div>
              <p className="text-xs text-white/60 leading-relaxed">
                We recommend storing this key in a password manager or printing it out and keeping it in a safe place. Do not share this key with anyone.
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-white/10">
          <button
            onClick={handleDownload}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-medium transition-all ${
              hasDownloaded 
                ? 'bg-zinc-800 text-white hover:bg-zinc-700' 
                : 'bg-zinc-800 text-white hover:bg-zinc-700'
            }`}
          >
            <Download className="w-4 h-4" />
            {hasDownloaded ? 'Download Again' : 'Download Key'}
          </button>
          
          <button
            onClick={handleConfirm}
            disabled={!hasDownloaded && !hasCopied}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-medium transition-all ${
              (!hasDownloaded && !hasCopied)
                ? 'bg-zinc-800/50 text-white/40 cursor-not-allowed'
                : 'bg-emerald-600 text-white hover:bg-emerald-500 shadow-lg shadow-emerald-900/20'
            }`}
          >
            {isSaving ? (
              <span className="animate-pulse">Saving...</span>
            ) : (
              <>
                <CheckCircle className="w-4 h-4" />
                I have saved my key
              </>
            )}
          </button>
        </div>
        
        {(!hasDownloaded && !hasCopied) && (
          <p className="text-center text-xs text-amber-500/80">
            Please download or copy your key to continue
          </p>
        )}
      </div>
    </Modal>
  );
}
