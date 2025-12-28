"use client";

import React, { useRef, useState } from "react";
import { Modal } from "../ui/modal";
import { Share2, Download, Copy, Check } from "lucide-react";
import { FaTwitter, FaLinkedin, FaFacebook, FaReddit } from "react-icons/fa";
import html2canvas from "html2canvas";
import { formatNumber } from "../../lib/utils";
import { OmnifolioIcon } from "../ui/omnifolio-logo";

interface SharePortfolioModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  totalValue: number;
  currencySymbol: string;
  userName: string;
  changePercent: string;
  topHoldings: Array<{
    name: string;
    symbol: string;
    value: number;
    color?: string;
  }>;
  themeColor: string; // e.g. '#f59e0b' for crypto, '#8b5cf6' for stocks
}

export function SharePortfolioModal({
  isOpen,
  onClose,
  title,
  totalValue,
  currencySymbol,
  userName,
  changePercent,
  topHoldings,
  themeColor
}: SharePortfolioModalProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [copied, setCopied] = useState(false);

  const generateImage = async () => {
    if (!cardRef.current) return null;
    setIsGenerating(true);
    try {
      const canvas = await html2canvas(cardRef.current, {
        backgroundColor: null,
        scale: 2, // Higher quality
        logging: false,
        useCORS: true
      });
      setIsGenerating(false);
      return canvas.toDataURL("image/png");
    } catch (error) {
      console.error("Error generating image:", error);
      setIsGenerating(false);
      return null;
    }
  };

  const handleShare = async (platform: 'twitter' | 'linkedin' | 'facebook' | 'reddit') => {
    const text = `Check out my ${title} on Omnifolio! 🚀\n\nValue: ${currencySymbol}${formatNumber(totalValue)}\nGrowth: ${changePercent}\n\n#Omnifolio #Finance #Investing #${title.replace(/\s/g, '')}`;
    
    const params = new URLSearchParams({
      type: 'portfolio',
      title: title,
      value: totalValue.toString(),
      currency: currencySymbol,
      user: userName,
      change: changePercent,
      theme: themeColor,
      holdings: JSON.stringify(topHoldings.map(h => ({
        symbol: h.symbol,
        value: h.value,
        color: h.color
      })))
    });
    const shareUrl = `${window.location.origin}/share?${params.toString()}`;

    // Fallback to URL sharing
    let platformUrl = '';
    switch (platform) {
      case 'twitter':
        platformUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(shareUrl)}`;
        break;
      case 'linkedin':
        platformUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`;
        break;
      case 'facebook':
        platformUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}&quote=${encodeURIComponent(text)}`;
        break;
      case 'reddit':
        platformUrl = `https://www.reddit.com/submit?url=${encodeURIComponent(shareUrl)}&title=${encodeURIComponent(`My ${title} Journey on Omnifolio`)}`;
        break;
    }

    window.open(platformUrl, '_blank', 'width=600,height=400');
  };

  const handleDownload = async () => {
    const imageData = await generateImage();
    if (!imageData) return;
    
    const link = document.createElement('a');
    link.href = imageData;
    link.download = `omnifolio-${title.toLowerCase().replace(/\s/g, '-')}-${new Date().toISOString().split('T')[0]}.png`;
    link.click();
  };

  const handleCopyImage = async () => {
    const imageData = await generateImage();
    if (!imageData) return;

    try {
      const res = await fetch(imageData);
      const blob = await res.blob();
      await navigator.clipboard.write([
        new ClipboardItem({
          [blob.type]: blob
        })
      ]);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy image:', err);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Share ${title}`} maxWidth="max-w-2xl">
      <div className="space-y-6">
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Share your portfolio progress with your network. An image has been generated below.
        </p>

        {/* Preview Area - This is what gets captured */}
        <div className="flex justify-center p-4 bg-gray-100 dark:bg-gray-900 rounded-xl overflow-hidden">
          <div 
            ref={cardRef}
            className="relative w-full max-w-md aspect-[1.6/1] bg-gradient-to-br from-gray-900 to-black text-white p-6 rounded-xl shadow-2xl overflow-hidden border border-gray-800"
          >
            {/* Background Effects */}
            <div 
              className="absolute top-0 right-0 w-64 h-64 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 opacity-20"
              style={{ backgroundColor: themeColor }}
            ></div>
            <div 
              className="absolute bottom-0 left-0 w-64 h-64 rounded-full blur-3xl translate-y-1/2 -translate-x-1/3 opacity-20"
              style={{ backgroundColor: themeColor }}
            ></div>
            
            {/* Content */}
            <div className="relative z-10 h-full flex flex-col justify-between">
              <div className="flex justify-between items-start">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <div className="flex items-center justify-center">
                      <OmnifolioIcon size={48} />
                    </div>
                    <span className="font-bold text-xl tracking-tight">Omnifolio</span>
                  </div>
                  <div className="text-gray-400 text-sm ml-1">Financial Analytics</div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-gray-400 uppercase tracking-wider">User</div>
                  <div className="font-semibold">{userName}</div>
                </div>
              </div>

              <div className="space-y-1">
                <div className="text-sm text-gray-400 uppercase tracking-wider">{title}</div>
                <div className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-white via-gray-200 to-gray-400">
                  {currencySymbol}{formatNumber(totalValue)}
                </div>
                <div className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                  changePercent.includes('+') ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                }`}>
                  {changePercent} This Month
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-800">
                {topHoldings.slice(0, 2).map((holding, index) => (
                  <div key={index}>
                    <div className="text-xs text-gray-400 mb-1 flex items-center gap-1">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: holding.color || themeColor }}></div>
                      {holding.symbol}
                    </div>
                    <div className="font-semibold text-lg" style={{ color: themeColor }}>
                      {currencySymbol}{formatNumber(holding.value)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <button
            onClick={handleCopyImage}
            className="flex items-center justify-center gap-2 px-4 py-3 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors text-gray-900 dark:text-white font-medium"
          >
            {copied ? <Check className="w-5 h-5 text-green-500" /> : <Copy className="w-5 h-5" />}
            {copied ? "Copied to Clipboard" : "Copy Image"}
          </button>
          
          <button
            onClick={handleDownload}
            className="flex items-center justify-center gap-2 px-4 py-3 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors text-gray-900 dark:text-white font-medium"
          >
            <Download className="w-5 h-5" />
            Download Image
          </button>
        </div>

        <div className="space-y-3">
          <div className="text-sm font-medium text-gray-900 dark:text-white text-center">Share to Social Media</div>
          <div className="grid grid-cols-4 gap-3">
            <button
              onClick={() => handleShare('twitter')}
              className="flex flex-col items-center gap-2 p-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors group"
            >
              <div className="w-10 h-10 rounded-full bg-[#1DA1F2]/10 flex items-center justify-center group-hover:bg-[#1DA1F2] transition-all duration-200 group-hover:scale-90">
                <FaTwitter className="w-5 h-5 text-[#1DA1F2] group-hover:text-white" />
              </div>
              <span className="text-xs text-gray-600 dark:text-gray-400">Twitter</span>
            </button>

            <button
              onClick={() => handleShare('reddit')}
              className="flex flex-col items-center gap-2 p-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors group"
            >
              <div className="w-10 h-10 rounded-full bg-[#FF4500]/10 flex items-center justify-center group-hover:bg-[#FF4500] transition-all duration-200 group-hover:scale-90">
                <FaReddit className="w-5 h-5 text-[#FF4500] group-hover:text-white" />
              </div>
              <span className="text-xs text-gray-600 dark:text-gray-400">Reddit</span>
            </button>

            <button
              onClick={() => handleShare('linkedin')}
              className="flex flex-col items-center gap-2 p-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors group"
            >
              <div className="w-10 h-10 rounded-full bg-[#0A66C2]/10 flex items-center justify-center group-hover:bg-[#0A66C2] transition-all duration-200 group-hover:scale-90">
                <FaLinkedin className="w-5 h-5 text-[#0A66C2] group-hover:text-white" />
              </div>
              <span className="text-xs text-gray-600 dark:text-gray-400">LinkedIn</span>
            </button>

            <button
              onClick={() => handleShare('facebook')}
              className="flex flex-col items-center gap-2 p-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors group"
            >
              <div className="w-10 h-10 rounded-full bg-[#1877F2]/10 flex items-center justify-center group-hover:bg-[#1877F2] transition-all duration-200 group-hover:scale-90">
                <FaFacebook className="w-5 h-5 text-[#1877F2] group-hover:text-white" />
              </div>
              <span className="text-xs text-gray-600 dark:text-gray-400">Facebook</span>
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
