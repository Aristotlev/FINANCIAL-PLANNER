"use client";

import { useState } from "react";
import { X, TrendingUp, TrendingDown, DollarSign, PieChart } from "lucide-react";
import { cn } from "@/lib/utils";

interface DataVisualization3DProps {
  title: string;
  data: {
    label: string;
    value: number;
    change?: string;
    color: string;
  }[];
  totalLabel?: string;
  totalValue?: number;
  chartType?: "bar" | "pie";
}

export function DataVisualization3D({
  title,
  data,
  totalLabel = "Total",
  totalValue,
  chartType = "bar"
}: DataVisualization3DProps) {
  const [isVisible, setIsVisible] = useState(true);

  if (!isVisible) return null;

  const maxValue = Math.max(...data.map(d => d.value));
  const calculatedTotal = totalValue || data.reduce((sum, d) => sum + d.value, 0);

  return (
    <div className="fixed inset-0 z-[1000000] flex items-center justify-center pointer-events-none">
      {/* Backdrop blur */}
      <div 
        className="absolute inset-0 bg-black/20 backdrop-blur-sm pointer-events-auto"
        onClick={() => setIsVisible(false)}
      />
      
      {/* 3D Container */}
      <div 
        className="relative pointer-events-auto"
        style={{
          perspective: "2000px",
          transformStyle: "preserve-3d",
        }}
      >
        <div
          className={cn(
            "bg-gradient-to-br from-white via-gray-50 to-white",
            "dark:from-gray-900 dark:via-gray-800 dark:to-gray-900",
            "rounded-xl sm:rounded-2xl shadow-2xl border-2",
            "border-gray-200 dark:border-gray-700",
            "p-4 sm:p-6 md:p-8 w-[calc(100vw-2rem)] sm:w-auto sm:min-w-[500px] md:min-w-[600px] max-w-[calc(100vw-2rem)] sm:max-w-4xl",
            "transform transition-all duration-500 ease-out",
            "sm:hover:scale-105",
            "sm:animate-float"
          )}
          style={{
            transform: "translateZ(50px) rotateX(2deg)",
            transformStyle: "preserve-3d",
            boxShadow: "0 25px 50px -10px rgba(0, 0, 0, 0.2), 0 15px 30px -15px rgba(0, 0, 0, 0.25)",
            willChange: "transform", // Hint to browser for GPU optimization
            contain: "layout style",
          }}
        >
          {/* Close button */}
          <button
            onClick={() => setIsVisible(false)}
            className="absolute top-4 right-4 p-2 rounded-full bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors z-10"
          >
            <X className="w-5 h-5 text-gray-600 dark:text-gray-300" />
          </button>

          {/* Header */}
          <div className="mb-4 sm:mb-6">
            <h3 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900 dark:text-white mb-2 flex items-center gap-2 sm:gap-3">
              <PieChart className="w-5 h-5 sm:w-6 sm:h-6 md:w-7 md:h-7 text-blue-600 flex-shrink-0" />
              <span className="truncate">{title}</span>
            </h3>
            <p className="text-sm sm:text-base md:text-lg text-gray-600 dark:text-gray-400">
              {totalLabel}: <span className="font-bold text-gray-900 dark:text-white">${calculatedTotal.toLocaleString()}</span>
            </p>
          </div>

          {/* Visualization */}
          {chartType === "bar" ? (
            <div className="space-y-3 sm:space-y-4">
              {data.map((item, index) => {
                const percentage = (item.value / maxValue) * 100;
                const isPositive = item.change && item.change.startsWith('+');
                
                return (
                  <div 
                    key={index}
                    className="group"
                    style={{
                      transform: `translateZ(${10 + index * 5}px)`,
                      transformStyle: "preserve-3d",
                    }}
                  >
                    {/* Label and value */}
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-1 sm:mb-2 gap-1 sm:gap-0">
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full shadow-lg flex-shrink-0"
                          style={{ backgroundColor: item.color }}
                        />
                        <span className="font-medium text-gray-700 dark:text-gray-300 text-sm sm:text-base truncate">
                          {item.label}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 sm:gap-3 ml-4 sm:ml-0">
                        <span className="text-sm sm:text-base md:text-lg font-bold text-gray-900 dark:text-white">
                          ${item.value.toLocaleString()}
                        </span>
                        {item.change && (
                          <span className={cn(
                            "text-xs sm:text-sm font-medium flex items-center gap-1",
                            isPositive ? "text-green-600" : "text-red-600"
                          )}>
                            {isPositive ? (
                              <TrendingUp className="w-3 h-3 sm:w-4 sm:h-4" />
                            ) : (
                              <TrendingDown className="w-3 h-3 sm:w-4 sm:h-4" />
                            )}
                            {item.change}
                          </span>
                        )}
                      </div>
                    </div>
                    
                    {/* Progress bar */}
                    <div className="relative h-6 sm:h-8 bg-gray-200 dark:bg-gray-700 rounded-lg overflow-hidden shadow-inner">
                      <div
                        className="absolute inset-y-0 left-0 rounded-lg transition-all duration-1000 ease-out group-hover:opacity-90"
                        style={{
                          width: `${percentage}%`,
                          backgroundColor: item.color,
                          boxShadow: `0 0 15px ${item.color}30`,
                        }}
                      >
                        <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent" />
                      </div>
                      
                      {/* Percentage label inside bar */}
                      <div className="absolute inset-0 flex items-center px-2 sm:px-3">
                        <span className="text-[10px] sm:text-xs font-semibold text-white drop-shadow-lg">
                          {calculatedTotal > 0 ? ((item.value / calculatedTotal) * 100).toFixed(1) : '0.0'}%
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            // Pie chart visualization
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-8">
              {/* Simple pie chart */}
              <div className="relative w-40 h-40 sm:w-52 sm:h-52 md:w-64 md:h-64 flex-shrink-0">
                <svg viewBox="0 0 100 100" className="transform -rotate-90">
                  {data.map((item, index) => {
                    const total = data.reduce((sum, d) => sum + d.value, 0);
                    const startPercentage = data.slice(0, index).reduce((sum, d) => sum + d.value, 0) / total;
                    const percentage = item.value / total;
                    const startAngle = startPercentage * 360;
                    const endAngle = (startPercentage + percentage) * 360;
                    
                    const startX = 50 + 40 * Math.cos((startAngle - 90) * Math.PI / 180);
                    const startY = 50 + 40 * Math.sin((startAngle - 90) * Math.PI / 180);
                    const endX = 50 + 40 * Math.cos((endAngle - 90) * Math.PI / 180);
                    const endY = 50 + 40 * Math.sin((endAngle - 90) * Math.PI / 180);
                    
                    const largeArc = percentage > 0.5 ? 1 : 0;
                    
                    return (
                      <path
                        key={index}
                        d={`M 50 50 L ${startX} ${startY} A 40 40 0 ${largeArc} 1 ${endX} ${endY} Z`}
                        fill={item.color}
                        className="transition-all duration-300 hover:opacity-80"
                        style={{
                          filter: `drop-shadow(0 2px 4px ${item.color}30)`,
                        }}
                      />
                    );
                  })}
                </svg>
              </div>
              
              {/* Legend */}
              <div className="space-y-2 sm:space-y-3 w-full sm:w-auto">
                {data.map((item, index) => (
                  <div key={index} className="flex items-center gap-2 sm:gap-3">
                    <div 
                      className="w-3 h-3 sm:w-4 sm:h-4 rounded shadow-lg flex-shrink-0"
                      style={{ backgroundColor: item.color }}
                    />
                    <div className="min-w-0">
                      <div className="font-medium text-gray-900 dark:text-white text-sm sm:text-base truncate">
                        {item.label}
                      </div>
                      <div className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                        ${item.value.toLocaleString()} ({calculatedTotal > 0 ? ((item.value / calculatedTotal) * 100).toFixed(1) : '0.0'}%)
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Footer stats */}
          <div className="mt-4 sm:mt-6 pt-4 sm:pt-6 border-t border-gray-200 dark:border-gray-700 grid grid-cols-3 gap-2 sm:gap-4">
            <div className="text-center">
              <div className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">Categories</div>
              <div className="text-base sm:text-lg md:text-xl font-bold text-gray-900 dark:text-white">{data.length}</div>
            </div>
            <div className="text-center">
              <div className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">Highest</div>
              <div className="text-base sm:text-lg md:text-xl font-bold text-gray-900 dark:text-white truncate">
                ${Math.max(...data.map(d => d.value)).toLocaleString()}
              </div>
            </div>
            <div className="text-center">
              <div className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">Average</div>
              <div className="text-base sm:text-lg md:text-xl font-bold text-gray-900 dark:text-white truncate">
                ${data.length > 0 ? (calculatedTotal / data.length).toLocaleString(undefined, {maximumFractionDigits: 0}) : '0'}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Floating animation - only runs in browser, respects reduced motion preference
if (typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.textContent = `
    @keyframes float {
      0%, 100% {
        transform: translateZ(50px) rotateX(2deg) translateY(0px);
      }
      50% {
        transform: translateZ(50px) rotateX(2deg) translateY(-6px);
      }
    }
    
    .sm\\:animate-float {
      animation: none;
    }
    
    @media (min-width: 640px) {
      .sm\\:animate-float {
        animation: float 3s ease-in-out infinite;
      }
    }
    
    /* Respect user's motion preferences for better accessibility and performance */
    @media (prefers-reduced-motion: reduce) {
      .sm\\:animate-float {
        animation: none;
        transform: translateZ(50px) rotateX(2deg);
      }
    }
  `;
  document.head.appendChild(style);
}
