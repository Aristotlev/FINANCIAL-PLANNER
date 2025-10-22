"use client";

import React, { useState } from 'react';
import { useHiddenCards, CardType } from '../../contexts/hidden-cards-context';
import { useCardOrder } from '../../contexts/card-order-context';

interface DraggableCardWrapperProps {
  cardId: CardType;
  children: React.ReactNode;
}

export function DraggableCardWrapper({ cardId, children }: DraggableCardWrapperProps) {
  const { moveCard } = useCardOrder();
  const [isDragging, setIsDragging] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [folderDropdownOpen, setFolderDropdownOpen] = useState(false);
  const dragPreviewRef = React.useRef<HTMLElement | null>(null);
  const wrapperRef = React.useRef<HTMLDivElement>(null);

  // Listen for folder dropdown open/close
  React.useEffect(() => {
    const handleFolderOpen = () => {
      setFolderDropdownOpen(true);
    };
    const handleFolderClose = () => {
      setFolderDropdownOpen(false);
    };

    window.addEventListener('hiddenFolderOpened', handleFolderOpen);
    window.addEventListener('hiddenFolderClosed', handleFolderClose);

    return () => {
      window.removeEventListener('hiddenFolderOpened', handleFolderOpen);
      window.removeEventListener('hiddenFolderClosed', handleFolderClose);
    };
  }, []);

  const handleDragStart = (e: React.DragEvent) => {
    // Only allow HTML5 drag if folder is open
    if (!folderDropdownOpen) {
      e.preventDefault();
      return;
    }
    
    // CRITICAL: Set drag data FIRST before anything else
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('application/x-card-type', cardId);
    e.dataTransfer.setData('text/plain', cardId);
    // Add to window for reliable access
    (window as any).__currentDragCard = cardId;
    
    setIsDragging(true);
    setIsHovered(false);
    
    // Create drag image
    if (e.currentTarget instanceof HTMLElement) {
      const ghost = e.currentTarget.cloneNode(true) as HTMLElement;
      ghost.style.opacity = '0.8';
      ghost.style.transform = 'rotate(-2deg) scale(0.95)';
      ghost.style.position = 'absolute';
      ghost.style.top = '-10000px';
      ghost.style.left = '-10000px';
      ghost.style.pointerEvents = 'none';
      ghost.style.zIndex = '10010';
      
      try {
        document.body.appendChild(ghost);
        dragPreviewRef.current = ghost;
        e.dataTransfer.setDragImage(ghost, e.currentTarget.offsetWidth / 2, e.currentTarget.offsetHeight / 2);
        
        setTimeout(() => {
          if (ghost.parentNode) {
            document.body.removeChild(ghost);
          }
        }, 0);
      } catch (err) {
        console.warn('Drag image error (non-critical):', err);
      }
    }
    
    // Notify that HTML5 drag for hiding started
    const event = new CustomEvent('cardDragStart', { 
      detail: { cardId },
      bubbles: true,
      cancelable: false
    });
    window.dispatchEvent(event);
  };

  const handleDragEnd = (e: React.DragEvent) => {
    setIsDragging(false);
    setIsDragOver(false);
    
    // Clean up drag preview if it still exists
    if (dragPreviewRef.current && dragPreviewRef.current.parentNode) {
      document.body.removeChild(dragPreviewRef.current);
      dragPreviewRef.current = null;
    }
    
    // Clean up window reference
    (window as any).__currentDragCard = null;
    
    // Dispatch custom event to notify drag ended
    window.dispatchEvent(new CustomEvent('cardDragEnd', { detail: { cardId } }));
  };

  const handleDragOver = (e: React.DragEvent) => {
    if (!isDragging) {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      setIsDragOver(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    // Only handle if leaving the entire card, not child elements
    const relatedTarget = e.relatedTarget as Node;
    if (!e.currentTarget.contains(relatedTarget)) {
      setIsDragOver(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    setIsDragOver(false);
    
    try {
      const draggedCardId = e.dataTransfer.getData('application/x-card-type') as CardType;
      
      // Only process card-to-card drops (folder handles its own drops)
      if (draggedCardId && draggedCardId !== cardId) {
        moveCard(draggedCardId, cardId);
      }
    } catch (error) {
      console.error('Error handling drop:', error);
    }
  };

  return (
    <div
      ref={wrapperRef}
      draggable={folderDropdownOpen}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onMouseEnter={() => !isDragging && setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`transition-all duration-200 relative group ${
        isDragging 
          ? 'opacity-40 scale-90 cursor-grabbing blur-[2px] rotate-[-2deg]' 
          : isDragOver
          ? 'scale-105 ring-4 ring-blue-500 ring-opacity-50 shadow-2xl cursor-grab'
          : 'cursor-grab hover:scale-[1.02] hover:shadow-2xl active:scale-[0.98]'
      }`}
      style={{
        touchAction: 'none',
        userSelect: 'none',
        WebkitUserSelect: 'none',
        zIndex: isDragging ? 5000 : isDragOver ? 75 : (isHovered ? 50 : 1),
        transition: isDragging 
          ? 'opacity 0.2s ease, transform 0.2s ease, filter 0.2s ease' 
          : 'all 0.2s ease',
      }}
    >
      {isDragging && folderDropdownOpen && (
        <div className="absolute inset-0 flex items-center justify-center z-[10015] pointer-events-none">
          <div className="bg-gradient-to-r from-green-500/40 to-emerald-500/40 backdrop-blur-lg rounded-xl px-8 py-4 border-2 border-green-400 border-dashed shadow-2xl animate-pulse">
            <p className="text-white font-bold text-base flex items-center gap-3">
              <span className="text-2xl animate-bounce">✨</span>
              <span>Drop in folder to hide</span>
            </p>
            <p className="text-green-200 text-xs text-center mt-1">Release over folder dropdown</p>
          </div>
        </div>
      )}
      {isDragOver && !isDragging && (
        <div className="absolute inset-0 flex items-center justify-center z-[10015] pointer-events-none">
          <div className="bg-gradient-to-r from-blue-500/40 to-cyan-500/40 backdrop-blur-sm rounded-lg px-6 py-3 border-2 border-blue-400 shadow-xl">
            <p className="text-blue-200 font-bold text-sm flex items-center gap-2">
              <span className="text-lg">🔄</span>
              Drop here to swap positions
            </p>
          </div>
        </div>
      )}
      {children}
    </div>
  );
}
