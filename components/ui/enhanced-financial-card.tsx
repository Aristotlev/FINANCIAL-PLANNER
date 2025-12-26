"use client";

import { useState } from "react";
import { ExternalLink } from "lucide-react";
import { AnimatedCard, CardBody, CardTitle, CardDescription, Visual3 } from "./animated-card";
import { Modal } from "./modal";
import { CardContainer, CardItem } from "./3d-card";

interface HoverPreviewProps {
  title: string;
  children: React.ReactNode;
}

function HoverPreview({ title, children }: HoverPreviewProps) {
  return (
    <div className="ease-[cubic-bezier(0.6, 0.6, 0, 1)] absolute bottom-0 left-0 right-0 z-[10002] flex w-[356px] items-end justify-center bg-transparent p-4 pb-2 transition-all duration-500 opacity-0 group-hover/animated-card:opacity-100 pointer-events-none">
      <div 
        className="ease-[cubic-bezier(0.6, 0.6, 0, 1)] rounded-md border border-zinc-200 bg-white/95 backdrop-blur-sm p-3 transition-all duration-500 dark:border-zinc-800 dark:bg-black/95 max-h-[280px] overflow-y-auto transform translate-y-2 group-hover/animated-card:translate-y-0 pointer-events-auto" 
        style={{ 
          position: 'relative', 
          zIndex: 10002,
          boxShadow: '0 35px 70px -15px rgba(0, 0, 0, 0.4), 0 25px 50px -12px rgba(0, 0, 0, 0.35), 0 0 25px rgba(139, 92, 246, 0.15)',
          transform: 'translateZ(180px)',
          transformStyle: 'preserve-3d',
        }}
      >
        <div className="space-y-2">
          <h4 className="text-xs font-semibold text-gray-900 dark:text-white">{title}</h4>
          <div className="text-xs text-gray-700 dark:text-gray-300">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}

interface EnhancedFinancialCardProps {
  title: string;
  description: string;
  amount: string;
  change: string;
  changeType: "positive" | "negative";
  mainColor: string;
  secondaryColor: string;
  gridColor: string;
  stats: {
    label: string;
    value: string;
    color: string;
  }[];
  icon: React.ComponentType<{ className?: string }>;
  hoverContent: React.ReactNode;
  modalContent: React.ReactNode;
  chartData?: Array<{ value: number; change?: string }>;
  maxWidth?: string;
  convertedAmount?: string; // Converted amount in selected currency
  sourceCurrency?: string; // Source currency code (e.g., 'USD')
  cardId?: string; // Card ID for hidden folder feature
}

export function EnhancedFinancialCard({
  title,
  description,
  amount,
  change,
  changeType,
  mainColor,
  secondaryColor,
  gridColor,
  stats,
  icon: Icon,
  hoverContent,
  modalContent,
  chartData,
  maxWidth = "max-w-6xl",
  convertedAmount,
  sourceCurrency,
  cardId
}: EnhancedFinancialCardProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleVisualClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    console.log('Visual clicked! Opening modal...');
    setIsModalOpen(true);
  };

  return (
    <>
      <div className="relative isolate">
        <CardContainer className="inter-var">
          <AnimatedCard className="w-full sm:w-[356px] min-w-[280px] sm:min-w-[356px] max-w-[356px] group relative" style={{ isolation: 'isolate', transformStyle: 'preserve-3d' }}>
            <CardItem 
              translateZ={150} 
              className="w-full drop-shadow-2xl" 
              data-visual-click
              style={{
                filter: "drop-shadow(0 30px 60px rgba(0, 0, 0, 0.35))",
                transformStyle: "preserve-3d",
              }}
            >
              <Visual3
                mainColor={mainColor}
                secondaryColor={secondaryColor}
                gridColor={gridColor}
                chartData={chartData}
                onChartClick={handleVisualClick}
                hologramData={{
                  title: title,
                  amount: amount,
                  change: change,
                  changeType: changeType,
                  stats: stats.map(s => ({ label: s.label, value: s.value })),
                  convertedAmount: convertedAmount,
                  sourceCurrency: sourceCurrency
                }}
              />
            </CardItem>
            
            {/* Hover Preview Content */}
            <HoverPreview title={title}>
              {hoverContent}
            </HoverPreview>

            <CardItem 
              translateZ={100} 
              className="w-full"
              style={{
                filter: "drop-shadow(0 20px 45px rgba(0, 0, 0, 0.25))",
                transformStyle: "preserve-3d",
              }}
            >
              <CardBody className="pointer-events-none">
                <div className="flex justify-between items-start w-full">
                  <div className="flex-1 min-w-0">
                    <CardItem 
                      translateZ={130} 
                      className="flex items-center gap-2"
                      style={{
                        filter: "drop-shadow(0 15px 30px rgba(0, 0, 0, 0.2))",
                        transformStyle: "preserve-3d",
                      }}
                    >
                      <div style={{ color: mainColor }}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <CardTitle>{title}</CardTitle>
                    </CardItem>
                  </div>
                  <CardItem 
                    translateZ={120} 
                    className="flex items-center gap-2"
                    style={{
                      filter: "drop-shadow(0 12px 25px rgba(0, 0, 0, 0.18))",
                      transformStyle: "preserve-3d",
                    }}
                  >
                    <div className={`text-sm font-medium ${changeType === 'positive' ? 'text-green-600' : 'text-red-600'}`}>
                      {change}
                    </div>
                  </CardItem>
                </div>

                <CardItem 
                  translateZ={90}
                  style={{
                    filter: "drop-shadow(0 8px 16px rgba(0, 0, 0, 0.12))",
                    transformStyle: "preserve-3d",
                  }}
                >
                  <CardDescription>{description}</CardDescription>
                </CardItem>
                
                <CardItem 
                  translateZ={140} 
                  className="text-xl sm:text-2xl font-bold text-black dark:text-white break-words overflow-hidden"
                  style={{
                    filter: "drop-shadow(0 18px 35px rgba(0, 0, 0, 0.22))",
                    transformStyle: "preserve-3d",
                  }}
                >
                  <span className="truncate">{amount}</span>
                </CardItem>
                
                <CardItem 
                  translateZ={80} 
                  className="flex gap-1 sm:gap-2 mt-2 flex-wrap overflow-hidden"
                  style={{
                    filter: "drop-shadow(0 6px 12px rgba(0, 0, 0, 0.1))",
                    transformStyle: "preserve-3d",
                  }}
                >
                  {stats.map((stat, index) => (
                    <div key={index} className="flex items-center gap-1 text-xs shrink-0">
                      <div 
                        className="w-2 h-2 rounded-full shrink-0" 
                        style={{ backgroundColor: stat.color }}
                      />
                      <span className="text-neutral-600 dark:text-neutral-400 truncate text-xs-mobile sm:text-xs">{stat.label}: {stat.value}</span>
                    </div>
                  ))}
                </CardItem>
              </CardBody>
            </CardItem>
          </AnimatedCard>
        </CardContainer>
      </div>
      
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={`${title} - Detailed Analysis`}
        maxWidth={maxWidth}
      >
        {modalContent}
      </Modal>
    </>
  );
}
