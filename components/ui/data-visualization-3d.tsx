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
            "rounded-2xl shadow-2xl border-2",
            "border-gray-200 dark:border-gray-700",
            "p-8 min-w-[600px] max-w-4xl",
            "transform transition-all duration-500 ease-out",
            "hover:scale-105",
            "animate-float"
          )}
          style={{
            transform: "translateZ(100px) rotateX(5deg)",
            transformStyle: "preserve-3d",
            boxShadow: "0 50px 100px -20px rgba(0, 0, 0, 0.25), 0 30px 60px -30px rgba(0, 0, 0, 0.3)",
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
          <div className="mb-6">
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2 flex items-center gap-3">
              <PieChart className="w-7 h-7 text-blue-600" />
              {title}
            </h3>
            <p className="text-lg text-gray-600 dark:text-gray-400">
              {totalLabel}: <span className="font-bold text-gray-900 dark:text-white">${calculatedTotal.toLocaleString()}</span>
            </p>
          </div>

          {/* Visualization */}
          {chartType === "bar" ? (
            <div className="space-y-4">
              {data.map((item, index) => {
                const percentage = (item.value / maxValue) * 100;
                const isPositive = item.change && item.change.startsWith('+');
                
                return (
                  <div 
                    key={index}
                    className="group"
                    style={{
                      transform: `translateZ(${20 + index * 10}px)`,
                      transformStyle: "preserve-3d",
                    }}
                  >
                    {/* Label and value */}
                    <div className="flex justify-between items-center mb-2">
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-3 h-3 rounded-full shadow-lg"
                          style={{ backgroundColor: item.color }}
                        />
                        <span className="font-medium text-gray-700 dark:text-gray-300">
                          {item.label}
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-lg font-bold text-gray-900 dark:text-white">
                          ${item.value.toLocaleString()}
                        </span>
                        {item.change && (
                          <span className={cn(
                            "text-sm font-medium flex items-center gap-1",
                            isPositive ? "text-green-600" : "text-red-600"
                          )}>
                            {isPositive ? (
                              <TrendingUp className="w-4 h-4" />
                            ) : (
                              <TrendingDown className="w-4 h-4" />
                            )}
                            {item.change}
                          </span>
                        )}
                      </div>
                    </div>
                    
                    {/* Progress bar */}
                    <div className="relative h-8 bg-gray-200 dark:bg-gray-700 rounded-lg overflow-hidden shadow-inner">
                      <div
                        className="absolute inset-y-0 left-0 rounded-lg transition-all duration-1000 ease-out group-hover:opacity-90"
                        style={{
                          width: `${percentage}%`,
                          backgroundColor: item.color,
                          boxShadow: `0 0 20px ${item.color}40`,
                        }}
                      >
                        <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent" />
                      </div>
                      
                      {/* Percentage label inside bar */}
                      <div className="absolute inset-0 flex items-center px-3">
                        <span className="text-xs font-semibold text-white drop-shadow-lg">
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
            <div className="flex items-center justify-center gap-8">
              {/* Simple pie chart */}
              <div className="relative w-64 h-64">
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
                          filter: `drop-shadow(0 4px 8px ${item.color}40)`,
                        }}
                      />
                    );
                  })}
                </svg>
              </div>
              
              {/* Legend */}
              <div className="space-y-3">
                {data.map((item, index) => (
                  <div key={index} className="flex items-center gap-3">
                    <div 
                      className="w-4 h-4 rounded shadow-lg"
                      style={{ backgroundColor: item.color }}
                    />
                    <div>
                      <div className="font-medium text-gray-900 dark:text-white">
                        {item.label}
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        ${item.value.toLocaleString()} ({calculatedTotal > 0 ? ((item.value / calculatedTotal) * 100).toFixed(1) : '0.0'}%)
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Footer stats */}
          <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700 grid grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-sm text-gray-600 dark:text-gray-400">Categories</div>
              <div className="text-xl font-bold text-gray-900 dark:text-white">{data.length}</div>
            </div>
            <div className="text-center">
              <div className="text-sm text-gray-600 dark:text-gray-400">Highest</div>
              <div className="text-xl font-bold text-gray-900 dark:text-white">
                ${Math.max(...data.map(d => d.value)).toLocaleString()}
              </div>
            </div>
            <div className="text-center">
              <div className="text-sm text-gray-600 dark:text-gray-400">Average</div>
              <div className="text-xl font-bold text-gray-900 dark:text-white">
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
        transform: translateZ(100px) rotateX(5deg) translateY(0px);
      }
      50% {
        transform: translateZ(100px) rotateX(5deg) translateY(-10px);
      }
    }
    
    .animate-float {
      animation: float 3s ease-in-out infinite;
    }
    
    /* Respect user's motion preferences for better accessibility and performance */
    @media (prefers-reduced-motion: reduce) {
      .animate-float {
        animation: none;
        transform: translateZ(100px) rotateX(5deg);
      }
    }
  `;
  document.head.appendChild(style);
}
