"use client";

import { useEffect, useCallback, useRef } from "react";
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
  const scrollYRef = useRef(0);
  const modalContentRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    if (isOpen) {
      // Save scroll position
      scrollYRef.current = window.scrollY;
      
      // Lock body scroll - comprehensive approach for iOS/mobile
      document.body.style.overflow = 'hidden';
      document.body.style.position = 'fixed';
      document.body.style.top = `-${scrollYRef.current}px`;
      document.body.style.left = '0';
      document.body.style.right = '0';
      document.body.style.width = '100%';
      document.documentElement.style.overflow = 'hidden';
    } else {
      // Restore body scroll
      document.body.style.overflow = '';
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.left = '';
      document.body.style.right = '';
      document.body.style.width = '';
      document.documentElement.style.overflow = '';
      
      // Restore scroll position
      window.scrollTo(0, scrollYRef.current);
    }

    return () => {
      document.body.style.overflow = '';
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.left = '';
      document.body.style.right = '';
      document.body.style.width = '';
      document.documentElement.style.overflow = '';
      window.scrollTo(0, scrollYRef.current);
    };
  }, [isOpen]);
  
  // Prevent touchmove from propagating to body on mobile
  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    // Allow scrolling within the modal content
    const target = e.target as HTMLElement;
    const modalContent = modalContentRef.current;
    
    if (modalContent && modalContent.contains(target)) {
      // Check if the element or any parent is scrollable
      let element: HTMLElement | null = target;
      while (element && element !== modalContent) {
        if (element.scrollHeight > element.clientHeight) {
          // Element is scrollable, allow the event
          return;
        }
        element = element.parentElement;
      }
      // Modal content itself is scrollable
      if (modalContent.scrollHeight > modalContent.clientHeight) {
        return;
      }
    }
    
    // Prevent scroll if not in a scrollable area
    e.preventDefault();
  }, []);

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
      className="fixed inset-0 z-[1000000] overflow-hidden"
      onTouchMove={handleTouchMove}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        width: '100vw',
        height: '100vh',
        touchAction: 'none',
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
        className="flex min-h-full items-center justify-center p-2 sm:p-4 overflow-y-auto"
        style={{ touchAction: 'pan-y' }}
      >
        <div 
          className={`relative w-full ${maxWidth} rounded-2xl bg-zinc-900/80 backdrop-blur-sm border border-white/[0.08] text-white/95 shadow-xl shadow-black/40 transition-all modal-content dark`}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-3 sm:p-6 border-b border-white/[0.08] sticky top-0 bg-zinc-900/80 backdrop-blur-sm z-10 rounded-t-2xl">
            <h2 className="text-lg sm:text-2xl font-bold text-white/95 pr-2">
              {title}
            </h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/10 rounded-full transition-colors min-h-touch min-w-touch flex-shrink-0"
              aria-label="Close modal"
            >
              <X className="w-5 h-5 text-white/70 hover:text-white" />
            </button>
          </div>
          
          {/* Content */}
          <div 
            ref={modalContentRef}
            className="max-h-[calc(90vh-80px)] sm:max-h-[80vh] overflow-y-auto overflow-x-hidden overscroll-contain"
            style={{ 
              WebkitOverflowScrolling: 'touch',
              touchAction: 'pan-y',
            }}
          >
            {children}
          </div>
        </div>
      </div>
    </div>
  );

  // Render modal using Portal to document.body to escape stacking context issues
  return typeof document !== 'undefined' ? createPortal(modalContent, document.body) : null;
}
