"use client";

import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Folder, ChevronDown, X, Eye, EyeOff } from 'lucide-react';
import { useHiddenCards, CardType, CARD_METADATA } from '../../contexts/hidden-cards-context';

export function HiddenCardsFolder() {
  const [isOpen, setIsOpen] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [isDropdownDragOver, setIsDropdownDragOver] = useState(false);
  const [isDraggingCard, setIsDraggingCard] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0 });
  const [mounted, setMounted] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  // Use refs to track state in event handlers (avoids stale closure issues)
  const isDraggingRef = useRef(false);
  const hiddenCardsRef = useRef<CardType[]>([]);
  const isOpenRef = useRef(false);
  
  const { hiddenCards, getHiddenCardInfo, showCard, hideCard } = useHiddenCards();

  // Keep refs in sync with state
  useEffect(() => {
    hiddenCardsRef.current = hiddenCards;
  }, [hiddenCards]);

  useEffect(() => {
    isOpenRef.current = isOpen;
  }, [isOpen]);

  // Mount check for portal
  useEffect(() => {
    setMounted(true);
  }, []);

  // Update dropdown position when button position changes or when open
  useEffect(() => {
    let rafId: number;
    
    const updatePosition = () => {
      if (buttonRef.current) {
        const rect = buttonRef.current.getBoundingClientRect();
        setDropdownPosition({
          top: rect.bottom + 8,
          left: Math.max(rect.left, 16), // Ensure it doesn't go off-screen
        });
      }
    };

    const onScrollOrResize = () => {
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(updatePosition);
    };

    if (isOpen) {
      updatePosition();
      // Also update on scroll/resize while open
      window.addEventListener('scroll', onScrollOrResize, true);
      window.addEventListener('resize', onScrollOrResize);
      return () => {
        window.removeEventListener('scroll', onScrollOrResize, true);
        window.removeEventListener('resize', onScrollOrResize);
        cancelAnimationFrame(rafId);
      };
    }
  }, [isOpen]);

  // Listen for global drag events - keep dropdown open during drag
  useEffect(() => {
    const handleDragStart = (e: Event) => {
      const customEvent = e as CustomEvent;
      const cardId = customEvent.detail?.cardId || (window as any).__currentDragCard;
      if (cardId) {
        isDraggingRef.current = true;
        setIsDraggingCard(true);
      }
    };

    const handleDragEnd = () => {
      isDraggingRef.current = false;
      setIsDraggingCard(false);
      setIsDragOver(false);
      setIsDropdownDragOver(false);
    };

    const handleDragMove = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail?.isOverDropTarget) {
        setIsDropdownDragOver(true);
      } else {
        setIsDropdownDragOver(false);
      }
    };

    const handleHideCardRequest = (e: Event) => {
      const customEvent = e as CustomEvent;
      const cardId = customEvent.detail?.cardId;
      if (cardId && !hiddenCardsRef.current.includes(cardId)) {
        hideCard(cardId);
        
        const cardInfo = CARD_METADATA[cardId as CardType];
        if (cardInfo) {
          const notification = document.createElement('div');
          notification.className = 'fixed top-24 right-6 z-[100000] bg-green-500 text-white px-4 py-2 rounded-lg shadow-lg font-medium';
          notification.textContent = cardInfo.icon + ' ' + cardInfo.name + ' hidden!';
          document.body.appendChild(notification);
          setTimeout(() => {
            notification.style.opacity = '0';
            notification.style.transform = 'translateX(100%)';
            notification.style.transition = 'all 0.3s';
            setTimeout(() => notification.remove(), 300);
          }, 2000);
        }
      }
    };

    window.addEventListener('cardDragStart', handleDragStart);
    window.addEventListener('cardDragEnd', handleDragEnd);
    window.addEventListener('cardDragMove', handleDragMove);
    window.addEventListener('hideCardRequest', handleHideCardRequest);

    return () => {
      window.removeEventListener('cardDragStart', handleDragStart);
      window.removeEventListener('cardDragEnd', handleDragEnd);
      window.removeEventListener('cardDragMove', handleDragMove);
      window.removeEventListener('hideCardRequest', handleHideCardRequest);
    };
  }, [hideCard]);

  useEffect(() => {
    if (isOpen) {
      window.dispatchEvent(new CustomEvent('hiddenFolderOpened'));
    } else {
      window.dispatchEvent(new CustomEvent('hiddenFolderClosed'));
    }
  }, [isOpen]);

  // Close dropdown when clicking outside, but NOT during drag operations
  // Also don't close if clicking on a card (they're draggable)
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      // Don't close if we're dragging
      if (isDraggingRef.current) return;
      
      const target = event.target as HTMLElement;
      const clickedInContainer = containerRef.current?.contains(target);
      const clickedInDropdown = dropdownRef.current?.contains(target);
      
      // Don't close if clicking on a draggable card element
      const clickedOnCard = target.closest('[draggable="true"]');
      if (clickedOnCard) return;
      
      if (!clickedInContainer && !clickedInDropdown) {
        setIsOpen(false);
      }
    };

    const timeoutId = setTimeout(() => {
      document.addEventListener('click', handleClickOutside);
    }, 100);

    return () => {
      clearTimeout(timeoutId);
      document.removeEventListener('click', handleClickOutside);
    };
  }, [isOpen]);

  const handleRestoreCard = (cardId: CardType) => {
    showCard(cardId);
  };

  const hiddenCardInfos = getHiddenCardInfo();
  const hasHiddenCards = hiddenCards.length > 0;

  return (
    <div 
      ref={containerRef}
      className="relative"
      style={{ zIndex: 10000 }}
    >
      <div
        ref={buttonRef}
        data-hidden-folder-button
        className={"transition-all duration-200 rounded-lg " + (
          isDragOver 
            ? "ring-2 ring-blue-500 ring-offset-2 ring-offset-gray-900 scale-105" 
            : isDraggingCard 
            ? "ring-2 ring-blue-400/50 ring-offset-1 ring-offset-gray-900 animate-pulse"
            : ""
        )}
      >
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={"flex items-center gap-2 px-4 py-2.5 rounded-lg transition-all duration-200 " + (
            isDragOver
              ? "text-white bg-blue-600 shadow-lg shadow-blue-500/30"
              : isDraggingCard
              ? "text-blue-300 bg-blue-900/50 border border-blue-500/50"
              : hasHiddenCards
              ? "text-gray-300 hover:text-white bg-gray-800/50 hover:bg-gray-700"
              : "text-gray-500 hover:text-gray-400 bg-gray-800/30"
          )}
        >
          {isDragOver || isDraggingCard ? (
            <EyeOff className={"w-5 h-5 " + (isDragOver ? "animate-pulse" : "")} />
          ) : (
            <Folder className="w-5 h-5" />
          )}
          <span className="text-sm font-medium">
            {isDragOver ? "Drop to Hide" : isDraggingCard ? "Drop Here to Hide" : "Hidden Cards"}
          </span>
          {hasHiddenCards && !isDragOver && !isDraggingCard && (
            <span className="px-1.5 py-0.5 text-xs font-semibold bg-blue-500/20 text-blue-400 rounded-full">
              {hiddenCards.length}
            </span>
          )}
          <ChevronDown className={"w-4 h-4 transition-transform " + (isOpen ? "rotate-180" : "")} />
        </button>
      </div>

      {isOpen && mounted && createPortal(
        <div 
          ref={dropdownRef}
          data-hidden-folder-dropdown
          className={"fixed w-80 bg-white dark:bg-gray-800 rounded-lg shadow-2xl border overflow-hidden transition-all duration-200 " + (
            isDropdownDragOver 
              ? "border-blue-500 ring-4 ring-blue-500/50 scale-[1.05]" 
              : isDraggingCard
              ? "border-blue-400 ring-2 ring-blue-400/50"
              : "border-gray-200 dark:border-gray-700"
          )}
          style={{ 
            zIndex: 2147483647, // Maximum possible z-index
            top: dropdownPosition.top,
            left: dropdownPosition.left,
            pointerEvents: 'all',
          }}
        >
          <div className="px-4 py-3 bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Folder className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Hidden Cards</h3>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Drag cards here to hide them from your dashboard
            </p>
          </div>

          {/* Large Drop Zone - Always visible when dropdown is open */}
          <div className={"mx-3 my-3 p-6 border-2 border-dashed rounded-xl flex flex-col items-center justify-center gap-2 transition-all duration-200 " + (
            isDropdownDragOver 
              ? "border-blue-500 bg-blue-500/20 scale-[1.02]" 
              : isDraggingCard
              ? "border-blue-400 bg-blue-400/10"
              : "border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-900/50"
          )}>
            <EyeOff className={"w-8 h-8 transition-all " + (
              isDropdownDragOver 
                ? "text-blue-500 animate-pulse scale-110" 
                : isDraggingCard
                ? "text-blue-400"
                : "text-gray-400 dark:text-gray-500"
            )} />
            <span className={"text-sm font-medium transition-colors " + (
              isDropdownDragOver 
                ? "text-blue-500" 
                : isDraggingCard
                ? "text-blue-400"
                : "text-gray-500 dark:text-gray-400"
            )}>
              {isDropdownDragOver ? "Release to hide card!" : "Drop card here to hide"}
            </span>
          </div>

          <div className="max-h-64 overflow-y-auto">
            {hasHiddenCards && (
              <div className="p-2 space-y-1 border-t border-gray-200 dark:border-gray-700">
                <p className="px-2 py-1 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Currently Hidden
                </p>
                {hiddenCardInfos.map((card) => (
                  <div
                    key={card.id}
                    className="group flex items-center justify-between px-3 py-2.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-lg flex-shrink-0"
                        style={{ backgroundColor: card.color + '20' }}
                      >
                        {card.icon}
                      </div>
                      <span className="text-sm font-medium text-gray-900 dark:text-white">{card.name}</span>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRestoreCard(card.id);
                      }}
                      className="opacity-0 group-hover:opacity-100 flex items-center gap-1 px-2 py-1 text-xs font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded transition-all flex-shrink-0"
                      title="Show card"
                    >
                      <Eye className="w-3 h-3" />
                      Show
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
