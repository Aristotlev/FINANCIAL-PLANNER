"use client";

import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, Search, Check, Globe } from 'lucide-react';
import { useTranslation, SUPPORTED_LANGUAGES, Language } from '../../contexts/translation-context';

interface LanguageSelectorProps {
  iconOnly?: boolean;
}

export function LanguageSelector({ iconOnly = false }: LanguageSelectorProps) {
  const { language, setLanguage, t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [dropdownPos, setDropdownPos] = useState({ top: 0, right: 0 });
  const dropdownRef = useRef<HTMLDivElement>(null);
  const portalRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Update position when opening
  useEffect(() => {
    if (isOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setDropdownPos({
        top: rect.bottom + 8,
        right: window.innerWidth - rect.right
      });
    }
  }, [isOpen]);

  // Close dropdown when clicking outside
  useEffect(() => {
      const handleClickOutside = (event: MouseEvent | Event) => {
        const target = event.target as Node;
        if (
          isOpen &&
          dropdownRef.current && 
          !dropdownRef.current.contains(target) &&
          portalRef.current &&
          !portalRef.current.contains(target)
        ) {
          setIsOpen(false);
          setSearchQuery('');
        }
      };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      window.addEventListener('scroll', handleClickOutside, true);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('scroll', handleClickOutside, true);
    };
  }, [isOpen]);

  const filteredLanguages = SUPPORTED_LANGUAGES.filter(lang =>
    lang.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    lang.nativeName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    lang.code.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSelectLanguage = (lang: Language) => {
    setLanguage(lang);
    setIsOpen(false);
    setSearchQuery('');
  };

  return (
    <div className={`relative ${iconOnly ? 'w-full h-full flex items-center justify-center' : ''}`} ref={dropdownRef}>
      {/* Language Button */}
      {!iconOnly ? (
        <button
            ref={buttonRef}
            onClick={() => setIsOpen(!isOpen)}
            className="flex items-center gap-2 px-3 py-2 text-gray-300 hover:text-white rounded-md hover:bg-gray-700 transition-colors group"
            title={t('common.language')}
        >
            <div className="flex items-center gap-2">
            <span className="text-lg leading-none">{language.flag}</span>
            <span className="text-sm font-medium hidden sm:inline-block">{language.name}</span>
            </div>
            <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </button>
      ) : (
        <button
            ref={buttonRef}
            onClick={() => setIsOpen(!isOpen)}
            className="w-full h-full flex items-center justify-center p-2 rounded-full hover:bg-gray-800/50 transition-colors"
            title={`${t('common.language')} (${language.name})`}
        >
            <span className="text-2xl leading-none">{language.flag}</span>
        </button>
      )}

      {/* Dropdown Menu */}
      {isOpen && typeof document !== 'undefined' && createPortal(
        <div 
            ref={portalRef}
             style={{ 
                top: `${dropdownPos.top}px`, 
                right: `${dropdownPos.right}px` 
            }}
            className="fixed w-72 bg-white dark:bg-gray-800 rounded-lg shadow-2xl border border-gray-200 dark:border-gray-700 z-[9999] max-h-[500px] flex flex-col"
        >
          {/* Header */}
            <div className="p-4 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                  <Globe className="w-4 h-4" />
                  {t('common.language')}
                </h3>
              </div>
              
              {/* Search Input */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={t('common.search')}
                  className="w-full pl-9 pr-3 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-md text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  autoFocus
                />
              </div>
            </div>

            {/* Language List */}
            <div className="overflow-y-auto flex-1 max-h-[300px]">
              {filteredLanguages.length === 0 ? (
                <div className="p-4 text-center text-sm text-gray-500 dark:text-gray-400">
                  No languages found
                </div>
              ) : (
                <div className="p-2">
                  {filteredLanguages.map((lang) => {
                    const isSelected = lang.code === language.code;
                    return (
                      <button
                        key={lang.code}
                        onClick={() => handleSelectLanguage(lang)}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-md transition-colors ${
                          isSelected
                            ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
                            : 'text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700'
                        }`}
                      >
                        <div className="flex-shrink-0 w-6 flex justify-center">
                          <span className="text-2xl leading-none">{lang.flag}</span>
                        </div>
                        <div className="flex-1 text-left">
                          <div className="text-sm font-semibold">{lang.nativeName}</div>
                          <div className={`text-xs ${
                            isSelected ? 'text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400'
                          }`}>
                            {lang.name}
                          </div>
                        </div>
                        {isSelected && (
                          <Check className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>,
          document.body
      )}
    </div>
  );
}
