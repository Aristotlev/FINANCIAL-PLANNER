"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  maxWidth?: string;
}

export function Modal({ isOpen, onClose, title, children, maxWidth = "max-w-6xl" }: ModalProps) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const modalContent = (
    <div 
      className="fixed inset-0 z-[1000000] overflow-y-auto"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        width: '100vw',
        height: '100vh',
      }}
    >
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
        onClick={onClose}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0
        }}
      />
      
      {/* Modal */}
      <div 
        className="flex min-h-full items-center justify-center p-2 sm:p-4"
      >
        <div 
          className={`relative w-full ${maxWidth} bg-white dark:bg-gray-900 rounded-xl sm:rounded-2xl shadow-2xl transition-all modal-content`}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-3 sm:p-6 border-b border-gray-200 dark:border-gray-700 sticky top-0 bg-white dark:bg-gray-900 z-10 rounded-t-xl sm:rounded-t-2xl">
            <h2 className="text-lg sm:text-2xl font-bold text-gray-900 dark:text-white pr-2">
              {title}
            </h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors min-h-touch min-w-touch flex-shrink-0"
              aria-label="Close modal"
            >
              <X className="w-5 h-5 text-gray-600 dark:text-white dark:drop-shadow-[0_0_8px_rgba(255,255,255,0.8)]" />
            </button>
          </div>
          
          {/* Content */}
          <div className="max-h-[calc(90vh-80px)] sm:max-h-[80vh] overflow-y-auto overflow-x-hidden -webkit-overflow-scrolling-touch" style={{ overflowX: 'visible' }}>
            {children}
          </div>
        </div>
      </div>
    </div>
  );

  // Render modal using Portal to document.body to escape stacking context issues
  return typeof document !== 'undefined' ? createPortal(modalContent, document.body) : null;
}
