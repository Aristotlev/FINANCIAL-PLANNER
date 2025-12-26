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
  const dragEnterTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Use refs to track state in event handlers (avoids stale closure issues)
  const isDraggingRef = useRef(false);
  const hiddenCardsRef = useRef<CardType[]>([]);
  const isOpenRef = useRef(false);
  const isDragOverRef = useRef(false);
  const isDropdownDragOverRef = useRef(false);
  const currentDragCardRef = useRef<CardType | null>(null);
  const buttonRectRef = useRef<DOMRect | null>(null);
  const dropdownRectRef = useRef<DOMRect | null>(null);
  
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
        // Update cached rect for drag detection
        buttonRectRef.current = rect;
        
        setDropdownPosition({
          top: rect.bottom + 8,
          left: Math.max(rect.left, 16), // Ensure it doesn't go off-screen
        });
      }
      
      if (dropdownRef.current) {
        dropdownRectRef.current = dropdownRef.current.getBoundingClientRect();
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
    } else {
       // Even if closed, update button rect if we are dragging (handled in dragStart, but good to have fresh)
       if (buttonRef.current) {
          buttonRectRef.current = buttonRef.current.getBoundingClientRect();
       }
    }
  }, [isOpen]);

  // Listen for global drag events - keep dropdown open during drag
  useEffect(() => {
    const handleDragStart = (e: Event) => {
      const customEvent = e as CustomEvent;
      // Check if it's a custom event or native drag event
      const cardId = customEvent.detail?.cardId || (window as any).__currentDragCard;
      
      if (cardId) {
        currentDragCardRef.current = cardId;
      }
      
      // Cache rects on start to avoid reflows during drag
      if (buttonRef.current) {
        buttonRectRef.current = buttonRef.current.getBoundingClientRect();
      }
      if (dropdownRef.current) {
        dropdownRectRef.current = dropdownRef.current.getBoundingClientRect();
      }

      // Also check if it's a native drag event with dataTransfer
      if (!cardId && e instanceof DragEvent) {
        // We can't access dataTransfer in dragstart for security, but we know a drag started
        isDraggingRef.current = true;
        setIsDraggingCard(true);
        return;
      }

      if (cardId || e.type === 'cardDragStart') {
        isDraggingRef.current = true;
        setIsDraggingCard(true);
      }
    };

    const handleDragEnd = () => {
      // Check if we should hide the card based on where it was dropped
      if (currentDragCardRef.current && (isDragOverRef.current || isDropdownDragOverRef.current)) {
         const cardId = currentDragCardRef.current;
         if (!hiddenCardsRef.current.includes(cardId)) {
             hideCard(cardId);
             showNotification(cardId);
         }
      }

      isDraggingRef.current = false;
      setIsDraggingCard(false);
      setIsDragOver(false);
      setIsDropdownDragOver(false);
      isDragOverRef.current = false;
      isDropdownDragOverRef.current = false;
      currentDragCardRef.current = null;
      // Clear cached rects
      buttonRectRef.current = null;
      dropdownRectRef.current = null;

      if (dragEnterTimeoutRef.current) {
        clearTimeout(dragEnterTimeoutRef.current);
        dragEnterTimeoutRef.current = null;
      }
    };

    const handleCardDragMove = (e: Event) => {
      const customEvent = e as CustomEvent;
      const { x, y } = customEvent.detail;
      
      // Check button intersection - Always get fresh rect to handle scrolling/resizing during drag
      if (buttonRef.current) {
        const rect = buttonRef.current.getBoundingClientRect();
        const isOver = x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom;
        
        if (isOver) {
           if (!isDragOverRef.current) {
               isDragOverRef.current = true;
               setIsDragOver(true);
               // Auto open logic
               if (!isOpenRef.current && !dragEnterTimeoutRef.current) {
                  dragEnterTimeoutRef.current = setTimeout(() => setIsOpen(true), 500);
               }
           }
        } else {
           if (isDragOverRef.current) {
             isDragOverRef.current = false;
             setIsDragOver(false);
             if (dragEnterTimeoutRef.current) {
               clearTimeout(dragEnterTimeoutRef.current);
               dragEnterTimeoutRef.current = null;
             }
           }
        }
      }
      
      // Check dropdown intersection if open
      if (isOpenRef.current && dropdownRef.current) {
         const rect = dropdownRef.current.getBoundingClientRect();

         if (rect) {
            const isOver = x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom;
            
            if (isOver) {
                if (!isDropdownDragOverRef.current) {
                    isDropdownDragOverRef.current = true;
                    setIsDropdownDragOver(true);
                }
            } else {
                if (isDropdownDragOverRef.current) {
                    isDropdownDragOverRef.current = false;
                    setIsDropdownDragOver(false);
                }
            }
         }
      }
    };

    const handleHideCardRequest = (e: Event) => {
      const customEvent = e as CustomEvent;
      const { cardId } = customEvent.detail;
      if (cardId && !hiddenCardsRef.current.includes(cardId)) {
        hideCard(cardId);
        showNotification(cardId);
        // Reset states
        setIsDragOver(false);
        setIsDropdownDragOver(false);
      }
    };

    window.addEventListener('cardDragStart', handleDragStart);
    window.addEventListener('cardDragEnd', handleDragEnd);
    window.addEventListener('cardDragMove', handleCardDragMove);
    window.addEventListener('hideCardRequest', handleHideCardRequest);
    
    // Also listen for native drag events on window to catch start/end
    window.addEventListener('dragstart', handleDragStart);
    window.addEventListener('dragend', handleDragEnd);

    return () => {
      window.removeEventListener('cardDragStart', handleDragStart);
      window.removeEventListener('cardDragEnd', handleDragEnd);
      window.removeEventListener('cardDragMove', handleCardDragMove);
      window.removeEventListener('hideCardRequest', handleHideCardRequest);
      window.removeEventListener('dragstart', handleDragStart);
      window.removeEventListener('dragend', handleDragEnd);
    };
  }, []);

  // Handle drop on the folder button
  const handleButtonDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    if (dragEnterTimeoutRef.current) {
      clearTimeout(dragEnterTimeoutRef.current);
      dragEnterTimeoutRef.current = null;
    }

    const cardId = e.dataTransfer.getData('text/plain') as CardType;
    if (cardId && !hiddenCards.includes(cardId)) {
      hideCard(cardId);
      showNotification(cardId);
    }
  };

  // Handle drop on the dropdown area
  const handleDropdownDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDropdownDragOver(false);
    const cardId = e.dataTransfer.getData('text/plain') as CardType;
    if (cardId && !hiddenCards.includes(cardId)) {
      hideCard(cardId);
      showNotification(cardId);
    }
  };

  const handleDragEnterButton = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setIsDragOver(true);
    
    // Auto-open folder if hovering for 500ms
    if (!isOpen && !dragEnterTimeoutRef.current) {
      dragEnterTimeoutRef.current = setTimeout(() => {
        setIsOpen(true);
      }, 500);
    }
  };

  const handleDragOverButton = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (!isDragOver) setIsDragOver(true);
  };

  const handleDragLeaveButton = (e: React.DragEvent) => {
    // Prevent flickering when moving over children
    if (e.currentTarget.contains(e.relatedTarget as Node)) {
      return;
    }

    setIsDragOver(false);
    if (dragEnterTimeoutRef.current) {
      clearTimeout(dragEnterTimeoutRef.current);
      dragEnterTimeoutRef.current = null;
    }
  };

  const handleDragEnterDropdown = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setIsDropdownDragOver(true);
  };

  const handleDragOverDropdown = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (!isDropdownDragOver) setIsDropdownDragOver(true);
  };

  const handleDragLeaveDropdown = (e: React.DragEvent) => {
    if (e.currentTarget.contains(e.relatedTarget as Node)) {
      return;
    }
    setIsDropdownDragOver(false);
  };

  const showNotification = (cardId: CardType) => {
    const cardInfo = CARD_METADATA[cardId];
    if (cardInfo) {
      const notification = document.createElement('div');
      notification.className = 'fixed top-24 right-6 z-[100000] bg-green-500 text-white px-4 py-2 rounded-lg shadow-lg font-medium flex items-center gap-2';
      notification.innerHTML = `<span>${cardInfo.icon}</span> <span>${cardInfo.name} hidden!</span>`;
      document.body.appendChild(notification);
      setTimeout(() => {
        notification.style.opacity = '0';
        notification.style.transform = 'translateX(100%)';
        notification.style.transition = 'all 0.3s';
        setTimeout(() => notification.remove(), 300);
      }, 2000);
    }
  };

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
        onDragEnter={handleDragEnterButton}
        onDragOver={handleDragOverButton}
        onDragLeave={handleDragLeaveButton}
        onDrop={handleButtonDrop}
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
          <div className="pointer-events-none flex items-center gap-2">
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
          </div>
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
            zIndex: 50000, // High enough to be above dashboard, but allows dragged cards on top
            top: dropdownPosition.top,
            left: dropdownPosition.left,
            pointerEvents: 'all',
          }}
          onDragEnter={handleDragEnterDropdown}
          onDragOver={handleDragOverDropdown}
          onDragLeave={handleDragLeaveDropdown}
          onDrop={handleDropdownDrop}
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
