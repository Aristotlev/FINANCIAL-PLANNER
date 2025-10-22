import React from 'react';

interface InstrumentTooltipProps {
  instrument: {
    symbol: string;
    name: string;
    type: string;
    exchange?: string;
    category?: string;
    description?: string;
    marketCap?: string;
    volume?: string;
    sector?: string;
    employees?: string;
    founded?: string;
    headquarters?: string;
    ceo?: string;
    website?: string;
    dividendYield?: string | number;
    peRatio?: string | number;
    eps?: string | number;
    revenue?: string;
    currency?: string;
    currentPrice?: number;
  };
  children: React.ReactNode;
}

export function InstrumentTooltip({ instrument, children }: InstrumentTooltipProps) {
  return (
    <div className="group relative">
      {children}
      <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-50 pointer-events-none min-w-[280px] max-w-[400px]">
        <div className="space-y-2">
          <div className="border-b border-gray-700 pb-2">
            <div className="font-semibold">{instrument.name}</div>
            <div className="text-gray-300">{instrument.symbol} • {instrument.exchange}</div>
            {instrument.sector && (
              <div className="text-blue-300">{instrument.sector}</div>
            )}
          </div>
          
          {/* Key Metrics */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            {instrument.marketCap && (
              <div>
                <span className="text-gray-400">Market Cap:</span>
                <div className="text-white">{instrument.marketCap}</div>
              </div>
            )}
            {instrument.volume && (
              <div>
                <span className="text-gray-400">Volume:</span>
                <div className="text-white">{instrument.volume}</div>
              </div>
            )}
            {instrument.peRatio && (
              <div>
                <span className="text-gray-400">P/E Ratio:</span>
                <div className="text-white">{instrument.peRatio}</div>
              </div>
            )}
            {instrument.dividendYield && (
              <div>
                <span className="text-gray-400">Dividend:</span>
                <div className="text-white">{instrument.dividendYield}</div>
              </div>
            )}
          </div>

          {/* Company Info for Stocks */}
          {instrument.type === 'stock' && (instrument.ceo || instrument.founded) && (
            <div className="border-t border-gray-700 pt-2">
              <div className="grid grid-cols-1 gap-1 text-xs">
                {instrument.ceo && (
                  <div>
                    <span className="text-gray-400">CEO:</span>
                    <span className="text-white ml-1">{instrument.ceo}</span>
                  </div>
                )}
                {instrument.founded && (
                  <div>
                    <span className="text-gray-400">Founded:</span>
                    <span className="text-white ml-1">{instrument.founded}</span>
                  </div>
                )}
                {instrument.employees && (
                  <div>
                    <span className="text-gray-400">Employees:</span>
                    <span className="text-white ml-1">{instrument.employees}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Description */}
          <div className="border-t border-gray-700 pt-2">
            <p className="text-gray-300 text-xs leading-relaxed max-h-20 overflow-y-auto">
              {instrument.description}
            </p>
          </div>
        </div>
        
        {/* Tooltip Arrow */}
        <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-900"></div>
      </div>
    </div>
  );
}
