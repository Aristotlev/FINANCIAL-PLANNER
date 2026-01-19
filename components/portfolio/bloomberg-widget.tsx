"use client";

import React, { useState } from 'react';
import { Tv, X, Minimize2, Maximize2 } from 'lucide-react';
import clsx from 'clsx';
import { createPortal } from 'react-dom';

export function BloombergWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);

  const toggleOpen = () => setIsOpen(!isOpen);
  
  return (
    <>
      <button 
        onClick={toggleOpen}
        className={clsx(
          "flex items-center gap-2 px-4 h-10 text-sm",
          "bg-[#1A1A1A] hover:bg-[#252525] border border-[#333]",
          "text-white font-medium rounded-[5px] transition-colors duration-200",
          isOpen && "bg-[#252525] border-cyan-900/50 text-cyan-400"
        )}
      >
        <Tv className="w-4 h-4" />
        <span className="hidden sm:inline">Bloomberg TV</span>
      </button>

      {isOpen && typeof document !== 'undefined' && createPortal(
        <div className={clsx(
            "fixed z-[100] transition-all duration-300 shadow-2xl bg-black border border-[#333] rounded-lg overflow-hidden",
            isMinimized 
                ? "bottom-4 left-4 w-64 h-12 flex items-center justify-between px-4" 
                : "bottom-4 left-4 w-[424px] h-auto"
        )}>
           {isMinimized ? (
               // Minimized Header
                <div className="flex items-center justify-between w-full">
                    <div className="flex items-center gap-2 text-sm font-medium text-white">
                        <Tv className="w-4 h-4 text-cyan-400" />
                        Bloomberg Live
                    </div>
                    <div className="flex items-center gap-2">
                        <button 
                            onClick={() => setIsMinimized(false)}
                            className="p-1 hover:bg-[#222] rounded text-gray-400 hover:text-white"
                        >
                            <Maximize2 className="w-4 h-4" />
                        </button>
                        <button 
                            onClick={() => setIsOpen(false)}
                            className="p-1 hover:bg-[#222] rounded text-gray-400 hover:text-white"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                </div>
           ) : (
               // Full Player
               <>
                    <div className="h-8 bg-[#111] border-b border-[#333] flex items-center justify-between px-3">
                         <span className="text-xs font-medium text-gray-400 flex items-center gap-1">
                            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
                            LIVE
                         </span>
                         <div className="flex items-center gap-1">
                            <button 
                                onClick={() => setIsMinimized(true)}
                                className="p-1 hover:bg-[#222] rounded text-gray-400 hover:text-white"
                                title="Minimize"
                            >
                                <Minimize2 className="w-3 h-3" />
                            </button>
                            <button 
                                onClick={() => setIsOpen(false)}
                                className="p-1 hover:bg-[#222] rounded text-gray-400 hover:text-white"
                                title="Close"
                            >
                                <X className="w-3 h-3" />
                            </button>
                         </div>
                    </div>
                    <div className="relative w-full aspect-video bg-black">
                        <iframe 
                            width="100%" 
                            height="100%" 
                            src="https://www.youtube.com/embed/iEpJwprxDdk?autoplay=1" 
                            title="Bloomberg Business News Live" 
                            frameBorder="0" 
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" 
                            referrerPolicy="strict-origin-when-cross-origin" 
                            allowFullScreen
                        ></iframe>
                    </div>
               </>
           )}
        </div>,
        document.body
      )}
    </>
  );
}
