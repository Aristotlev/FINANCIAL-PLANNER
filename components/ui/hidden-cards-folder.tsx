"use client";

import React, { useState, useRef, useEffect } from 'react';
import { Folder, ChevronDown, X, Eye } from 'lucide-react';
import { useHiddenCards, CardInfo, CardType, CARD_METADATA } from '../../contexts/hidden-cards-context';

export function HiddenCardsFolder() {
  const [isOpen, setIsOpen] = useState(false);
  const [isDragOverDropZone, setIsDragOverDropZone] = useState(false);
  const [isDraggingCard, setIsDraggingCard] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const folderButtonRef = useRef<HTMLDivElement>(null);
  const draggedCardIdRef = useRef<CardType | null>(null);
  const hasHiddenCardRef = useRef(false);
  const { hiddenCards, getHiddenCardInfo, showCard, hideCard } = useHiddenCards();

  // Dispatch events when folder opens/closes
  useEffect(() => {
    if (isOpen) {
      console.log('📂 Folder opened - notifying cards');
      window.dispatchEvent(new CustomEvent('hiddenFolderOpened'));
    } else {
      console.log('📂 Folder closed - notifying cards');
      window.dispatchEvent(new CustomEvent('hiddenFolderClosed'));
    }
  }, [isOpen]);

  // Keep dropdown open when dragging cards
  useEffect(() => {
    const handleDragStart = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail?.cardId) {
        draggedCardIdRef.current = customEvent.detail.cardId;
        hasHiddenCardRef.current = false;
        setIsDraggingCard(true);
        setIsOpen(true); // FORCE open when drag starts
        console.log('📁 Card drag detected:', customEvent.detail.cardId);
        console.log('📂 FORCING dropdown open during drag');
        console.log('📂 All card types can be hidden:', Object.keys(CARD_METADATA));
      }
    };
    
    // Backup: Also listen to native dragstart
    const handleNativeDragStart = (e: DragEvent) => {
      const target = e.target as HTMLElement;
      if (target.getAttribute('draggable') === 'true') {
        console.log('📁 Native dragstart detected');
        // Try to extract card ID from dataTransfer
        const types = Array.from(e.dataTransfer?.types || []);
        console.log('📁 DataTransfer types:', types);
        setIsDraggingCard(true);
        setIsOpen(true);
      }
    };

    const handleDragEnd = () => {
      console.log('📁 Card drag ended');
      draggedCardIdRef.current = null;
      hasHiddenCardRef.current = false;
      setIsDraggingCard(false);
      setIsDragOverDropZone(false);
      // Auto-close dropdown after a delay if no cards are hidden
      setTimeout(() => {
        if (!hiddenCards.length) {
          setIsOpen(false);
        }
      }, 300);
    };

    // Detect mousedown on draggable cards to prepare for drag
    const handleMouseDown = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      // Check if mousedown is on a draggable card wrapper
      const draggableCard = target.closest('[draggable="true"]');
      if (draggableCard && !dropdownRef.current?.contains(draggableCard)) {
        console.log('🖱️ Mousedown on draggable card - preparing for drag');
        // Set a flag that we might be starting a drag
        // This helps prevent the dropdown from closing before drag starts
        setIsDraggingCard(true);
        // Reset after a short delay if no drag actually starts
        const resetTimer = setTimeout(() => {
          setIsDraggingCard(false);
        }, 500);
        // Clear the timer if we get a dragstart event
        const clearTimer = () => {
          clearTimeout(resetTimer);
          window.removeEventListener('dragstart', clearTimer);
        };
        window.addEventListener('dragstart', clearTimer);
      }
    };

    window.addEventListener('cardDragStart', handleDragStart);
    window.addEventListener('cardDragEnd', handleDragEnd);
    window.addEventListener('dragstart', handleNativeDragStart, true);
    window.addEventListener('mousedown', handleMouseDown, true);
    return () => {
      window.removeEventListener('cardDragStart', handleDragStart);
      window.removeEventListener('cardDragEnd', handleDragEnd);
      window.removeEventListener('dragstart', handleNativeDragStart, true);
      window.removeEventListener('mousedown', handleMouseDown, true);
    };
  }, [hiddenCards.length]);

  // Close dropdown when clicking outside (but not while dragging)
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      // Don't close if we're dragging a card
      if (isDraggingCard) {
        return;
      }
      
      const target = event.target as Node;
      // Check if click is outside both the dropdown and the folder button
      if (dropdownRef.current && 
          folderButtonRef.current && 
          !dropdownRef.current.contains(target) && 
          !folderButtonRef.current.contains(target)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      // Use capture phase to catch clicks before they bubble
      document.addEventListener('mousedown', handleClickOutside, true);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside, true);
    };
  }, [isOpen, isDraggingCard]);

  // Auto-open folder when hovering during drag
  const handleFolderDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Check if we have card data
    const types = Array.from(e.dataTransfer.types);
    const hasCardData = types.includes('application/x-card-type') || types.includes('text/plain');
    
    if (hasCardData) {
      console.log('📂 Card detected over folder button');
      if (!isOpen) {
        console.log('📂 Auto-opening folder');
        setIsOpen(true);
      }
      setIsDraggingCard(true);
    }
  };

  const handleFolderDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'move';
  };





  const handleRestoreCard = (cardId: CardType) => {
    showCard(cardId);
  };

  const hiddenCardInfos = getHiddenCardInfo();
  const hasHiddenCards = hiddenCards.length > 0;

  return (
    <div 
      className="relative" 
      ref={dropdownRef}
    >
      {/* Folder Button */}
      <div 
        ref={folderButtonRef}
        onDragEnter={handleFolderDragEnter}
        onDragOver={handleFolderDragOver}
      >
        <button
          onClick={(e) => {
            e.stopPropagation();
            const newState = !isOpen;
            setIsOpen(newState);
            console.log('👆 Folder manually', newState ? 'opened' : 'closed');
          }}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-lg transition-all duration-200 ${
            isDraggingCard && !isOpen
              ? 'text-white bg-gradient-to-r from-blue-600 to-purple-600 ring-4 ring-blue-400/50 animate-pulse shadow-lg shadow-blue-500/50 scale-110'
              : hasHiddenCards
              ? 'text-gray-300 hover:text-white bg-gray-800/50 hover:bg-gray-700'
              : 'text-gray-500 hover:text-gray-400 bg-gray-800/30'
          }`}
        >
        <Folder className={`w-5 h-5 ${isDraggingCard && !isOpen ? 'animate-bounce' : ''}`} />
        <span className="text-sm font-medium">Hidden Cards</span>
        {isDraggingCard && !isOpen && (
          <span className="px-2 py-0.5 text-xs font-bold bg-yellow-500/90 text-black rounded-full animate-pulse">
            DROP HERE
          </span>
        )}
        {hasHiddenCards && !isDraggingCard && (
          <span className="px-1.5 py-0.5 text-xs font-semibold bg-blue-500/20 text-blue-400 rounded-full">
            {hiddenCards.length}
          </span>
        )}
        <ChevronDown
          className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>
      </div>

      {/* Dropdown Menu */}
      {isOpen && (
        <>
          {/* Backdrop - invisible but clickable */}
          <div 
            className="fixed inset-0 z-[9998]" 
            onClick={(e) => {
              if (!isDraggingCard) {
                e.stopPropagation();
                setIsOpen(false);
              }
            }}
            onDragOver={(e) => e.preventDefault()}
            style={{
              pointerEvents: isDraggingCard ? 'none' : 'auto'
            }}
          />

          {/* Dropdown Content */}
          <div 
            className="absolute left-0 mt-2 w-80 bg-white dark:bg-gray-800 rounded-lg shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
            onDragEnter={(e) => {
              e.preventDefault();
              e.stopPropagation();
              const types = Array.from(e.dataTransfer.types);
              if (types.includes('application/x-card-type') || types.includes('text/plain')) {
                console.log('🎯 Card entered DROPDOWN');
                setIsDragOverDropZone(true);
                
                // Get card ID from multiple sources for reliability
                let cardId = draggedCardIdRef.current;
                if (!cardId) {
                  cardId = (window as any).__currentDragCard;
                  console.log('📦 Got cardId from window:', cardId);
                }
                
                // Don't hide immediately on enter, wait for drop
                if (cardId) {
                  console.log('🎯 Card hovering over folder:', cardId);
                }
              }
            }}
            onDragOver={(e) => {
              e.preventDefault();
              e.stopPropagation();
              e.dataTransfer.dropEffect = 'move';
              setIsDragOverDropZone(true);
            }}
            onDragLeave={(e) => {
              e.preventDefault();
              e.stopPropagation();
              const relatedTarget = e.relatedTarget as Node;
              if (!e.currentTarget.contains(relatedTarget)) {
                console.log('📍 Left dropdown');
                setIsDragOverDropZone(false);
              }
            }}
            onDrop={(e) => {
              e.preventDefault();
              e.stopPropagation();
              console.log('📦 DROP EVENT TRIGGERED');
              
              // Get card ID from multiple sources
              let cardId = draggedCardIdRef.current;
              if (!cardId) {
                cardId = (window as any).__currentDragCard;
              }
              if (!cardId) {
                try {
                  cardId = e.dataTransfer.getData('application/x-card-type') as CardType;
                  if (!cardId) {
                    cardId = e.dataTransfer.getData('text/plain') as CardType;
                  }
                } catch (err) {
                  console.error('Error getting card data:', err);
                }
              }
              
              console.log('📦 Card ID to hide:', cardId);
              console.log('📦 Currently hidden cards:', hiddenCards);
              
              if (cardId && !hiddenCards.includes(cardId)) {
                console.log('✅ HIDING CARD:', cardId);
                
                // CRITICAL FIX: Defer hiding until after drag completes
                // This prevents the DOM element from being removed while still being dragged
                setTimeout(() => {
                  hideCard(cardId!);
                  
                  // Visual feedback
                  const cardInfo = CARD_METADATA[cardId!];
                  if (cardInfo) {
                    const notification = document.createElement('div');
                    notification.className = 'fixed top-24 right-6 z-[10020] bg-green-500 text-white px-4 py-2 rounded-lg shadow-lg font-medium';
                    notification.textContent = `${cardInfo.icon} ${cardInfo.name} hidden!`;
                    document.body.appendChild(notification);
                    setTimeout(() => {
                      if (notification.parentNode) {
                        notification.style.opacity = '0';
                        notification.style.transform = 'translateX(100%)';
                        notification.style.transition = 'all 0.3s';
                        setTimeout(() => notification.remove(), 300);
                      }
                    }, 2000);
                  }
                }, 50); // Small delay to let drag operation fully complete
              } else if (cardId && hiddenCards.includes(cardId)) {
                console.log('⚠️ Card already hidden:', cardId);
              } else {
                console.error('❌ No valid card ID found!');
              }
              
              setIsDragOverDropZone(false);
              setIsDraggingCard(false);
              draggedCardIdRef.current = null;
            }}
            style={{
              pointerEvents: 'auto',
              zIndex: 10000
            }}
          >
            {/* Header */}
            <div className="px-4 py-3 bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Folder className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                    Hidden Cards
                  </h3>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsOpen(false);
                  }}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Drag cards here to hide them from your dashboard
              </p>
            </div>

            {/* Drop Zone for Dragging Cards */}
            <div
              className={`min-h-[120px] max-h-96 overflow-y-auto transition-all duration-200 relative ${
                isDragOverDropZone
                  ? 'bg-gradient-to-br from-green-500/30 to-emerald-500/30 border-2 border-dashed border-green-400 shadow-lg shadow-green-500/50 scale-[1.03]'
                  : isDraggingCard
                  ? 'bg-gradient-to-br from-blue-500/20 to-purple-500/20 border-2 border-dashed border-blue-400 shadow-inner'
                  : 'border-2 border-transparent'
              }`}
              style={{
                pointerEvents: 'auto',
                zIndex: 10005,
                position: 'relative'
              }}
            >
              {hasHiddenCards ? (
                <div className="p-2 space-y-1">
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
                        <span className="text-sm font-medium text-gray-900 dark:text-white">
                          {card.name}
                        </span>
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
              ) : (
                <div className={`px-4 py-8 text-center transition-all ${
                  isDragOverDropZone ? 'scale-105' : ''
                }`}>
                  {isDragOverDropZone ? (
                    <>
                      <div className="text-4xl mb-2 animate-bounce">✨</div>
                      <p className="text-sm font-semibold text-green-500 dark:text-green-400 mb-1">
                        Card Hidden!
                      </p>
                      <p className="text-xs text-green-400 dark:text-green-500">
                        Release mouse to finish
                      </p>
                    </>
                  ) : (
                    <>
                      <Folder className="w-12 h-12 mx-auto text-gray-300 dark:text-gray-600 mb-3" />
                      <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">
                        No hidden cards
                      </p>
                      <p className="text-xs text-gray-400 dark:text-gray-500">
                        Drag cards here to organize your dashboard
                      </p>
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Footer Hint */}
            <div className="px-4 py-3 bg-gray-50 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700">
              <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
                {isDragOverDropZone ? (
                  <span className="text-green-500 font-bold animate-pulse">✨ Card hidden! Release mouse</span>
                ) : hasHiddenCards ? (
                  <span>💡 Click "Show" to restore cards to dashboard</span>
                ) : (
                  <span>👆 Hover over this area while dragging to hide cards</span>
                )}
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
