"use client";

import React, { useState, useRef } from 'react';
import { GripVertical, X, RotateCcw, Check } from 'lucide-react';
import { useCardOrder, DEFAULT_CARD_ORDER } from '../../contexts/card-order-context';
import { CardType, CARD_METADATA } from '../../contexts/hidden-cards-context';

interface CardOrderPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CardOrderPanel({ isOpen, onClose }: CardOrderPanelProps) {
  const { cardOrder, moveCard, resetOrder } = useCardOrder();
  const [draggedCard, setDraggedCard] = useState<CardType | null>(null);
  const [dragOverCard, setDragOverCard] = useState<CardType | null>(null);
  const dragNodeRef = useRef<HTMLDivElement | null>(null);

  if (!isOpen) return null;

  const handleDragStart = (e: React.DragEvent, cardId: CardType) => {
    setDraggedCard(cardId);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', cardId);
    
    // Add a slight delay to allow the drag image to be captured
    setTimeout(() => {
      if (dragNodeRef.current) {
        dragNodeRef.current.style.opacity = '0.5';
      }
    }, 0);
  };

  const handleDragEnd = () => {
    setDraggedCard(null);
    setDragOverCard(null);
    if (dragNodeRef.current) {
      dragNodeRef.current.style.opacity = '1';
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDragEnter = (e: React.DragEvent, cardId: CardType) => {
    e.preventDefault();
    if (draggedCard && draggedCard !== cardId) {
      setDragOverCard(cardId);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    // Only clear if we're leaving the card, not entering a child
    const relatedTarget = e.relatedTarget as HTMLElement;
    if (!e.currentTarget.contains(relatedTarget)) {
      setDragOverCard(null);
    }
  };

  const handleDrop = (e: React.DragEvent, targetCardId: CardType) => {
    e.preventDefault();
    if (draggedCard && draggedCard !== targetCardId) {
      moveCard(draggedCard, targetCardId);
    }
    setDraggedCard(null);
    setDragOverCard(null);
  };

  const handleReset = () => {
    resetOrder();
    // Show a brief confirmation
    const notification = document.createElement('div');
    notification.className = 'fixed top-24 right-6 z-[100000] bg-green-500 text-white px-4 py-2 rounded-lg shadow-lg font-medium flex items-center gap-2';
    notification.innerHTML = '<svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"></path></svg> Card order reset!';
    document.body.appendChild(notification);
    setTimeout(() => {
      notification.style.opacity = '0';
      notification.style.transform = 'translateX(100%)';
      notification.style.transition = 'all 0.3s';
      setTimeout(() => notification.remove(), 300);
    }, 2000);
  };

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[99998]"
        onClick={onClose}
      />
      
      {/* Panel */}
      <div className="fixed right-4 top-20 bottom-4 w-80 bg-white dark:bg-gray-900 rounded-2xl shadow-2xl z-[99999] flex flex-col overflow-hidden border border-gray-200 dark:border-gray-700">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-purple-500/10 to-blue-500/10">
          <div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">Arrange Cards</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400">Drag to reorder your dashboard</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
          </button>
        </div>

        {/* Card List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {cardOrder.map((cardId, index) => {
            const cardInfo = CARD_METADATA[cardId];
            const isDragging = draggedCard === cardId;
            const isDragOver = dragOverCard === cardId;
            
            return (
              <div
                key={cardId}
                ref={isDragging ? dragNodeRef : null}
                draggable
                onDragStart={(e) => handleDragStart(e, cardId)}
                onDragEnd={handleDragEnd}
                onDragOver={handleDragOver}
                onDragEnter={(e) => handleDragEnter(e, cardId)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, cardId)}
                className={`
                  flex items-center gap-3 p-3 rounded-xl cursor-grab active:cursor-grabbing
                  transition-all duration-200 select-none
                  ${isDragging 
                    ? 'opacity-50 scale-95 bg-gray-100 dark:bg-gray-800' 
                    : 'bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-800'
                  }
                  ${isDragOver 
                    ? 'ring-2 ring-purple-500 ring-offset-2 dark:ring-offset-gray-900 bg-purple-50 dark:bg-purple-900/20 scale-[1.02]' 
                    : ''
                  }
                `}
              >
                {/* Drag Handle */}
                <div className="flex-shrink-0 text-gray-400 dark:text-gray-500">
                  <GripVertical className="w-5 h-5" />
                </div>
                
                {/* Card Info */}
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <span className="text-2xl flex-shrink-0">{cardInfo?.icon || '📊'}</span>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 dark:text-white truncate">
                      {cardInfo?.name || cardId}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Position {index + 1}
                    </p>
                  </div>
                </div>
                
                {/* Position Badge */}
                <div className="flex-shrink-0 w-7 h-7 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-sm font-medium text-gray-600 dark:text-gray-300">
                  {index + 1}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-700 flex gap-2">
          <button
            onClick={handleReset}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 font-medium transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
            Reset
          </button>
          <button
            onClick={onClose}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 text-white font-medium transition-colors"
          >
            <Check className="w-4 h-4" />
            Done
          </button>
        </div>
      </div>
    </>
  );
}
