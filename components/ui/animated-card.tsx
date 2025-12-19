"use client";

import * as React from "react";
import { useState } from "react";
import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

// --- Utility Function (from @/lib/utils) ---

/**
 * A utility function to conditionally join class names.
 * Requires `clsx` and `tailwind-merge` to be installed.
 * `npm install clsx tailwind-merge`
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// --- Card Components ---

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {}

export function AnimatedCard({ className, ...props }: CardProps) {
  return (
    <div
      role="region"
      aria-labelledby="card-title"
      aria-describedby="card-description"
      className={cn(
        "group/animated-card relative w-[356px] overflow-visible rounded-xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-900 dark:bg-black",
        className
      )}
      style={{
        perspective: "2500px",
        perspectiveOrigin: "50% 50%",
        transformStyle: "preserve-3d",
        backfaceVisibility: "hidden",
        WebkitBackfaceVisibility: "hidden",
      }}
      {...props}
    />
  );
}

export function CardBody({ className, ...props }: CardProps) {
  return (
    <div
      role="group"
      className={cn(
        "flex flex-col space-y-1.5 border-t border-zinc-200 p-4 dark:border-zinc-900",
        className
      )}
      {...props}
    />
  );
}

interface CardTitleProps extends React.HTMLAttributes<HTMLHeadingElement> {}

export function CardTitle({ className, ...props }: CardTitleProps) {
  return (
    <h3
      className={cn(
        "text-lg font-semibold leading-none tracking-tight text-black dark:text-white",
        className
      )}
      {...props}
    />
  );
}

interface CardDescriptionProps
  extends React.HTMLAttributes<HTMLParagraphElement> {}

export function CardDescription({ className, ...props }: CardDescriptionProps) {
  return (
    <p
      className={cn(
        "text-sm text-neutral-500 dark:text-neutral-400",
        className
      )}
      {...props}
    />
  );
}

export function CardVisual({ className, ...props }: CardProps) {
  return (
    <div
      className={cn("h-[180px] w-[356px] overflow-hidden", className)}
      {...props}
    />
  );
}

// --- Visual3 Component and its Sub-components ---

interface Visual3Props {
  mainColor?: string;
  secondaryColor?: string;
  gridColor?: string;
  chartData?: Array<{ value: number; change?: string }>;
  hologramData?: {
    title: string;
    amount: string;
    change: string;
    changeType: "positive" | "negative";
    stats: Array<{ label: string; value: string }>;
    convertedAmount?: string; // Converted amount in selected currency
    sourceCurrency?: string; // Source currency code
  };
  onChartClick?: (e: React.MouseEvent) => void; // NEW: Optional click handler for chart
}

export function Visual3({
  mainColor = "#8b5cf6",
  secondaryColor = "#fbbf24",
  gridColor = "#80808015",
  chartData,
  hologramData,
  onChartClick,
}: Visual3Props) {
  const [hovered, setHovered] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  React.useEffect(() => {
    const handleDragStart = () => setIsDragging(true);
    const handleDragEnd = () => setIsDragging(false);
    
    window.addEventListener('cardDragStart', handleDragStart);
    window.addEventListener('cardDragEnd', handleDragEnd);
    
    return () => {
      window.removeEventListener('cardDragStart', handleDragStart);
      window.removeEventListener('cardDragEnd', handleDragEnd);
    };
  }, []);

  const handleMouseEnter = () => {
    if (!isDragging) {
      setHovered(true);
    }
  };

  const handleMouseLeave = () => {
    setHovered(false);
  };

  return (
    <div
      className={cn(
        "relative h-[180px] w-[356px] overflow-visible rounded-t-lg pointer-events-none"
      )}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      style={{
          "--color": mainColor,
          "--secondary-color": secondaryColor,
          transformStyle: "preserve-3d",
        } as React.CSSProperties}
    >
      {/* Background base layer */}
      <div 
        className="absolute inset-0 bg-gradient-to-br from-gray-50 to-white dark:from-gray-900 dark:to-gray-800 rounded-t-lg" 
        style={{ transformStyle: "preserve-3d", transform: "translateZ(0px)" }}
      />
      
      {/* Glow effect */}
      <div 
        className={cn(
          "absolute inset-0 rounded-t-lg pointer-events-none",
          "transition-opacity duration-200 will-change-opacity",
          hovered ? "opacity-80" : "opacity-0"
        )}
        style={{
          background: `radial-gradient(ellipse 60% 50% at 50% 50%, ${mainColor}60, transparent 80%)`,
          transformStyle: "preserve-3d",
          transform: "translateZ(20px)",
        } as React.CSSProperties}
      />
      
      <EllipseGradient color={mainColor} />
      <GridLayer color={gridColor} hovered={hovered} />
      <Layer4
        color={mainColor}
        secondaryColor={secondaryColor}
        hovered={hovered}
        data={chartData}
        onChartClick={onChartClick}
      />
      <Layer3 color={mainColor} hovered={hovered} />
      <Layer2 color={mainColor} hologramData={hologramData} hovered={hovered} />
      <Layer1 color={mainColor} secondaryColor={secondaryColor} hovered={hovered} hologramData={hologramData} />
    </div>
  );
}

interface LayerProps {
  color: string;
  secondaryColor?: string;
  hovered?: boolean;
  data?: Array<{ value: number; change?: string }>;
  onChartClick?: (e: React.MouseEvent) => void;
}

const GridLayer: React.FC<{ color: string; hovered?: boolean }> = ({ color, hovered }) => {
  return (
    <div
      style={{ 
        "--grid-color": color,
      } as React.CSSProperties}
      className={cn(
        "pointer-events-none absolute inset-0 z-[2] h-full w-full bg-transparent",
        "bg-[linear-gradient(to_right,var(--grid-color)_1px,transparent_1px),linear-gradient(to_bottom,var(--grid-color)_1px,transparent_1px)]",
        "bg-[size:20px_20px] bg-center transition-opacity duration-200 will-change-opacity",
        "[mask-image:radial-gradient(ellipse_50%_50%_at_50%_50%,#000_70%,transparent_100%)]",
        hovered ? "opacity-50" : "opacity-20"
      )}
    />
  );
};

const EllipseGradient: React.FC<{ color: string }> = ({ color }) => {
  return (
    <div className="absolute inset-0 z-[1] flex h-full w-full items-center justify-center">
      <svg
        width="356"
        height="196"
        viewBox="0 0 356 180"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <rect width="356" height="180" fill="url(#paint0_radial_12_207)" />
        <defs>
          <radialGradient
            id="paint0_radial_12_207"
            cx="0"
            cy="0"
            r="1"
            gradientUnits="userSpaceOnUse"
            gradientTransform="translate(178 98) rotate(90) scale(98 178)"
          >
            <stop stopColor={color} stopOpacity="0.15" />
            <stop offset="0.5" stopColor={color} stopOpacity="0.08" />
            <stop offset="1" stopOpacity="0" />
          </radialGradient>
        </defs>
      </svg>
    </div>
  );
};

interface Layer1Props {
  color: string;
  secondaryColor?: string;
  hovered?: boolean;
  hologramData?: {
    stats: Array<{ label: string; value: string }>;
  };
}

const Layer1: React.FC<Layer1Props> = ({ color, secondaryColor, hovered, hologramData }) => {
  // Extract percentage values from stats if available
  const stat1 = hologramData?.stats?.[0]?.value || "+0%";
  const stat2 = hologramData?.stats?.[1]?.value || "+0%";
  
  return (
    <div
      className="absolute top-4 left-4 z-[6] flex items-center gap-2"
      style={
        {
          "--color": color,
          "--secondary-color": secondaryColor,
          transform: hovered ? "translateZ(60px) scale(1.02)" : "translateZ(30px)",
          transformStyle: "preserve-3d",
          transition: "transform 0.3s cubic-bezier(0.23, 1, 0.32, 1)",
        } as React.CSSProperties
      }
    >
      <div className={cn(
        "flex shrink-0 items-center rounded-full border border-white/30 bg-white/60 px-2.5 py-1 backdrop-blur-md shadow-lg transition-all duration-200 ease-out will-change-transform dark:border-black/30 dark:bg-black/60",
        hovered && "opacity-0 -translate-y-4"
      )}
      style={{
        boxShadow: hovered ? "0 10px 25px rgba(0,0,0,0.2)" : "0 4px 12px rgba(0,0,0,0.1)",
      }}
      >
        <div className="h-1.5 w-1.5 rounded-full bg-[var(--color)]" style={{ boxShadow: `0 0 8px var(--color)` }} />
        <span className="ml-1.5 text-[10px] font-bold text-gray-900 dark:text-white">
          {hologramData?.stats?.[0]?.label || ""}: {stat1}
        </span>
      </div>
      <div className={cn(
        "flex shrink-0 items-center rounded-full border border-white/30 bg-white/60 px-2.5 py-1 backdrop-blur-md shadow-lg transition-all duration-200 ease-out will-change-transform dark:border-black/30 dark:bg-black/60",
        hovered && "opacity-0 -translate-y-4"
      )}
      style={{
        boxShadow: hovered ? "0 10px 25px rgba(0,0,0,0.2)" : "0 4px 12px rgba(0,0,0,0.1)",
      }}
      >
        <div className="h-1.5 w-1.5 rounded-full bg-[var(--secondary-color)]" style={{ boxShadow: `0 0 8px var(--secondary-color)` }} />
        <span className="ml-1.5 text-[10px] font-bold text-gray-900 dark:text-white">
          {hologramData?.stats?.[1]?.label || ""}: {stat2}
        </span>
      </div>
    </div>
  );
};

const Layer2: React.FC<{ 
  color: string;
  hovered?: boolean;
  hologramData?: {
    title: string;
    amount: string;
    change: string;
    changeType: "positive" | "negative";
    stats: Array<{ label: string; value: string }>;
    convertedAmount?: string;
    sourceCurrency?: string;
  };
}> = ({ color, hologramData, hovered }) => {
  // Calculate performance percentage from change string
  const performanceValue = hologramData?.change || "+24.5%";
  const isPositive = hologramData?.changeType === "positive";
  
  return (
    <>
      {/* Hologram container - pops out to the RIGHT of card with MASSIVE spacing and effect */}
      <div 
        data-hologram
        className={cn(
          "absolute z-[200] flex items-center justify-center pointer-events-none",
          "transition-all duration-300 ease-out will-change-transform will-change-opacity"
        )}
        style={{
          left: "calc(100% + 40px)", // MUCH MORE SPACE from card
          top: "50%",
          transform: hovered 
            ? "translateY(-50%) translateX(10px) scale(1.05)" // Pops OUT and GROWS
            : "translateY(-50%) translateX(-20px) scale(0.85)", // Tucked away when not hovered
          opacity: hovered ? 1 : 0,
        } as React.CSSProperties}
      >
        {/* Connecting line from card to tooltip */}
        <div 
          className={cn(
            "absolute right-full mr-[10px] h-[3px] transition-all duration-300",
            hovered ? "w-[30px] opacity-100" : "w-0 opacity-0"
          )}
          style={{
            background: `linear-gradient(90deg, transparent, ${color})`,
            boxShadow: `0 0 8px ${color}`,
          }}
        />
        
        {/* Arrow pointing to tooltip */}
        <div 
          className={cn(
            "absolute right-full mr-[-2px] transition-all duration-300",
            hovered ? "opacity-100 scale-100" : "opacity-0 scale-50"
          )}
          style={{
            width: 0,
            height: 0,
            borderTop: '8px solid transparent',
            borderBottom: '8px solid transparent',
            borderLeft: `12px solid ${color}`,
            filter: `drop-shadow(0 0 4px ${color})`,
          }}
        />
        
        {/* Hologram glass container with MASSIVE shadow and glow */}
        <div 
          className={cn(
            "relative w-[320px] rounded-2xl",
            "bg-white dark:bg-gray-900",
            "border-[3px] backdrop-blur-2xl p-5",
            "shadow-[0_0_80px_rgba(0,0,0,0.3)]"
          )}
          style={{
            borderColor: color,
            boxShadow: hovered 
              ? `0 25px 80px ${color}60, 0 10px 40px ${color}40, 0 0 60px ${color}30, 0 0 0 2px ${color}40, inset 0 0 40px ${color}10`
              : `0 10px 40px ${color}30, 0 0 0 1px ${color}20`,
          }}
        >
          {/* PULSING border accent - SUPER visible */}
          <div 
            className="absolute inset-0 rounded-2xl pointer-events-none animate-pulse"
            style={{
              border: `2px solid ${color}`,
              opacity: 0.5,
            }}
          />

          {/* Header with hologram styling */}
          <div className="relative flex items-center gap-2 mb-3 pb-3 border-b" style={{ borderColor: `${color}30` }}>
            <div className="relative">
              <div 
                className="h-3 w-3 rounded-full"
                style={{ 
                  backgroundColor: color,
                  boxShadow: `0 0 8px ${color}`,
                }}
              />
            </div>
            <h4 className="text-sm font-black text-gray-900 dark:text-white tracking-wider">
              ⚡ {hologramData?.title || "HOLOGRAM DATA"}
            </h4>
            <div className="ml-auto">
              <svg className="w-4 h-4" style={{ color: color }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
          </div>

          {/* Stats grid with solid backgrounds */}
          <div className="relative grid grid-cols-2 gap-3 mb-3">
            <div 
              className="rounded-lg p-2.5 border-2 shadow-md transform transition-transform hover:scale-105"
              style={{ 
                backgroundColor: `${color}10`,
                borderColor: `${color}30`
              }}
            >
              <div className="text-[10px] font-semibold text-gray-600 dark:text-gray-300 mb-1">
                Total Value
              </div>
              {hologramData?.convertedAmount && hologramData?.convertedAmount !== hologramData?.amount && (
                <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-0.5">
                  ≈ {hologramData.convertedAmount}
                </div>
              )}
              <div className="text-xl font-black text-black dark:text-white">
                {hologramData?.amount || "$0"}
              </div>
              <div className="text-[9px] text-gray-500 dark:text-gray-400 mt-0.5">
                {hologramData?.sourceCurrency ? `in ${hologramData.sourceCurrency}` : 'current balance'}
              </div>
            </div>
            <div 
              className={cn(
                "rounded-lg p-2.5 border-2 shadow-md transform transition-transform hover:scale-105",
                isPositive ? "bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border-green-200 dark:border-green-800" : "bg-gradient-to-br from-red-50 to-rose-50 dark:from-red-900/20 dark:to-rose-900/20 border-red-200 dark:border-red-800"
              )}
            >
              <div className="text-[10px] font-semibold text-gray-600 dark:text-gray-300 mb-1">
                Performance
              </div>
              <div className={cn(
                "text-xl font-black flex items-center gap-1",
                isPositive ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
              )}>
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  {isPositive ? (
                    <path fillRule="evenodd" d="M12 7a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0V8.414l-4.293 4.293a1 1 0 01-1.414 0L8 10.414l-4.293 4.293a1 1 0 01-1.414-1.414l5-5a1 1 0 011.414 0L11 10.586 14.586 7H12z" clipRule="evenodd" />
                  ) : (
                    <path fillRule="evenodd" d="M12 13a1 1 0 100 2h5a1 1 0 001-1v-5a1 1 0 10-2 0v2.586l-4.293-4.293a1 1 0 00-1.414 0L8 9.586l-4.293-4.293a1 1 0 00-1.414 1.414l5 5a1 1 0 001.414 0L11 9.414 14.586 13H12z" clipRule="evenodd" />
                  )}
                </svg>
                {performanceValue}
              </div>
              <div className="text-[9px] text-gray-500 dark:text-gray-400 mt-0.5">
                {isPositive ? "upward momentum" : "downward trend"}
              </div>
            </div>
          </div>

          {/* Info items with better contrast */}
          <div className="relative space-y-2 mb-3">
            {hologramData?.stats?.map((stat, index) => (
              <div key={index} className="flex items-center justify-between p-2 bg-gray-100 dark:bg-gray-800 rounded-lg">
                <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">{stat.label}</span>
                <span className="text-xs font-black text-black dark:text-white">{stat.value}</span>
              </div>
            ))}
            {!hologramData?.stats && (
              <>
                <div className="flex items-center justify-between p-2 bg-gray-100 dark:bg-gray-800 rounded-lg">
                  <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">Status</span>
                  <span 
                    className="font-black px-2 py-1 rounded-lg text-xs flex items-center gap-1 shadow-md"
                    style={{ 
                      backgroundColor: color,
                      color: 'white'
                    }}
                  >
                    <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
                    Active
                  </span>
                </div>
              </>
            )}
            <div className="flex items-center justify-between p-2 bg-gray-100 dark:bg-gray-800 rounded-lg">
              <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">Change</span>
              <span className={cn(
                "text-xs font-black",
                isPositive ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
              )}>{isPositive ? "↑" : "↓"} {performanceValue}</span>
            </div>
          </div>

          {/* Bottom indicator with better visibility */}
          <div className="relative pt-3 border-t-2 border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-semibold text-gray-600 dark:text-gray-400 flex items-center gap-1.5">
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                </svg>
                Just now
              </span>
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-semibold text-green-600 dark:text-green-400">Live</span>
                <div className="flex gap-0.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                  <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" style={{ animationDelay: "0.2s" }} />
                  <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" style={{ animationDelay: "0.4s" }} />
                </div>
              </div>
            </div>
          </div>

          {/* PROMINENT animated corner brackets */}
          <div className="absolute top-0 left-0 w-6 h-6 border-t-[3px] border-l-[3px] rounded-tl-xl animate-pulse" 
            style={{ 
              borderColor: color,
              opacity: 0.8,
              boxShadow: `0 0 10px ${color}50`
            }} 
          />
          <div className="absolute top-0 right-0 w-6 h-6 border-t-[3px] border-r-[3px] rounded-tr-xl animate-pulse" 
            style={{ 
              borderColor: color,
              opacity: 0.8,
              boxShadow: `0 0 10px ${color}50`,
              animationDelay: "0.15s"
            }} 
          />
          <div className="absolute bottom-0 left-0 w-6 h-6 border-b-[3px] border-l-[3px] rounded-bl-xl animate-pulse" 
            style={{ 
              borderColor: color,
              opacity: 0.8,
              boxShadow: `0 0 10px ${color}50`,
              animationDelay: "0.3s"
            }} 
          />
          <div className="absolute bottom-0 right-0 w-6 h-6 border-b-[3px] border-r-[3px] rounded-br-xl animate-pulse" 
            style={{ 
              borderColor: color,
              opacity: 0.8,
              boxShadow: `0 0 10px ${color}50`,
              animationDelay: "0.45s"
            }} 
          />
        </div>
      </div>
    </>
  );
};

const Layer3: React.FC<{ color: string; hovered?: boolean }> = ({ color, hovered }) => {
  return (
    <div 
      className={cn(
        "absolute inset-0 z-[3] flex items-center justify-center transition-all duration-300 ease-out will-change-opacity will-change-transform",
        hovered ? "opacity-100 translate-y-0" : "opacity-0 translate-y-3"
      )}
      style={{
        transform: hovered ? "translateZ(35px)" : "translateZ(15px)",
        transformStyle: "preserve-3d",
        transition: "all 0.3s cubic-bezier(0.23, 1, 0.32, 1)",
      }}
    >
      <svg
        width="356"
        height="180"
        viewBox="0 0 356 180"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <rect width="356" height="180" fill="url(#paint0_linear_29_3)" />
        <defs>
          <linearGradient
            id="paint0_linear_29_3"
            x1="178"
            y1="0"
            x2="178"
            y2="180"
            gradientUnits="userSpaceOnUse"
          >
            <stop offset="0.3" stopColor={color} stopOpacity="0" />
            <stop offset="1" stopColor={color} stopOpacity="0.25" />
          </linearGradient>
        </defs>
      </svg>
    </div>
  );
};

const Layer4: React.FC<LayerProps> = ({ color, secondaryColor, hovered, data, onChartClick }) => {
  // Generate dynamic line chart data if provided
  const generateLinePoints = () => {
    if (!data || data.length === 0) return null;
    
    // Filter out invalid data points
    const validData = data.filter(d => 
      d && typeof d.value === 'number' && !isNaN(d.value) && isFinite(d.value)
    );
    
    if (validData.length === 0) return null;
    
    const values = validData.map(d => d.value);
    const maxValue = Math.max(...values);
    const minValue = Math.min(...values);
    const range = maxValue - minValue || 1;
    
    // Generate points for smooth line
    return validData.slice(0, 12).map((item, index) => {
      const normalizedValue = ((item.value - minValue) / range);
      const y = Math.max(20, Math.min(140, 130 - (normalizedValue * 90))); // Map to y coordinate
      const x = 40 + (index * (280 / Math.max(1, validData.length - 1)));
      
      return {
        x: isNaN(x) ? 40 : x,
        y: isNaN(y) ? 90 : y,
        value: item.value
      };
    });
  };

  const linePoints = generateLinePoints();
  
  // Fallback default line points if no data
  const defaultLinePoints = [
    { x: 40, y: 100 },
    { x: 80, y: 85 },
    { x: 120, y: 70 },
    { x: 160, y: 90 },
    { x: 200, y: 60 },
    { x: 240, y: 75 },
    { x: 280, y: 55 },
    { x: 320, y: 45 },
  ];

  const points = linePoints || defaultLinePoints;
  
  // Create SVG path from points using smooth curves
  const createSmoothPath = (pts: Array<{x: number, y: number}>) => {
    // Validate input
    if (!pts || pts.length === 0) return 'M 0 0';
    if (pts.length < 2) return `M ${pts[0].x} ${pts[0].y}`;
    
    // Ensure first point has valid coordinates
    const firstX = isNaN(pts[0].x) || !isFinite(pts[0].x) ? 0 : pts[0].x;
    const firstY = isNaN(pts[0].y) || !isFinite(pts[0].y) ? 0 : pts[0].y;
    
    let path = `M ${firstX} ${firstY}`;
    
    for (let i = 1; i < pts.length; i++) {
      const prev = pts[i - 1];
      const curr = pts[i];
      
      // Validate current and previous points
      if (!prev || !curr) continue;
      
      const prevX = isNaN(prev.x) || !isFinite(prev.x) ? 0 : prev.x;
      const prevY = isNaN(prev.y) || !isFinite(prev.y) ? 0 : prev.y;
      const currX = isNaN(curr.x) || !isFinite(curr.x) ? 0 : curr.x;
      const currY = isNaN(curr.y) || !isFinite(curr.y) ? 0 : curr.y;
      
      // Calculate control points for smooth curve
      const controlX = (prevX + currX) / 2;
      
      // Use quadratic bezier curve for smooth transitions
      path += ` Q ${controlX} ${prevY}, ${currX} ${currY}`;
    }
    
    return path;
  };

  const linePath = createSmoothPath(points);

  return (
    <div 
      className={cn(
        "absolute inset-0 z-[4] flex h-[180px] w-[356px] items-center justify-center pointer-events-auto cursor-pointer"
      )}
      onClick={onChartClick}
      style={{
        transform: hovered ? "translateZ(45px) scale(1.02)" : "translateZ(25px)",
        transformStyle: "preserve-3d",
        transition: "transform 0.3s cubic-bezier(0.23, 1, 0.32, 1)",
        filter: hovered ? `drop-shadow(0 15px 30px rgba(0,0,0,0.2))` : "drop-shadow(0 8px 16px rgba(0,0,0,0.1))",
      }}
    >
      <svg width="356" height="180" xmlns="http://www.w3.org/2000/svg" className="pointer-events-auto">
        {/* Line shadow for depth */}
        <path
          d={linePath}
          stroke="rgba(0,0,0,0.25)"
          strokeWidth={hovered ? "5" : "3"}
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
          transform="translate(2, 2)"
          className="transition-all duration-200 ease-out"
        />
        
        {/* Main line */}
        <path
          d={linePath}
          stroke={color}
          strokeWidth={hovered ? "4.5" : "2.5"}
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="transition-all duration-200 ease-out"
          style={{ 
            filter: hovered ? `drop-shadow(0 0 12px ${color}) drop-shadow(0 0 20px ${color}80)` : `drop-shadow(0 0 4px ${color}40)`
          }}
        />
        
        {/* Gradient fill under the line */}
        <defs>
          <linearGradient id={`lineGradient-${color.replace('#', '')}`} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={color} stopOpacity="0.3" />
            <stop offset="100%" stopColor={color} stopOpacity="0.05" />
          </linearGradient>
        </defs>
        
        <path
          d={`${linePath} L ${points[points.length - 1].x} 150 L ${points[0].x} 150 Z`}
          fill={`url(#lineGradient-${color.replace('#', '')})`}
          className="transition-all duration-200 ease-out"
          style={{ opacity: hovered ? 0.6 : 0.4 }}
        />
        
        {/* Data point circles - only show on hover */}
        {hovered && points.map((point, index) => (
          <g key={index}>
            {/* Outer glow circle */}
            <circle
              cx={point.x}
              cy={point.y}
              r="6"
              fill={color}
              fillOpacity="0.3"
              className="transition-all duration-200 ease-out"
            />
            {/* Main point */}
            <circle
              cx={point.x}
              cy={point.y}
              r="3"
              fill={color}
              stroke="white"
              strokeWidth="1.5"
              className="transition-all duration-200 ease-out"
              style={{ 
                filter: `drop-shadow(0 0 4px ${color})`
              }}
            />
          </g>
        ))}
      </svg>
    </div>
  );
};
