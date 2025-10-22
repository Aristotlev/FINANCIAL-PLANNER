"use client";

import { useState } from "react";
import { ExternalLink } from "lucide-react";
import { AnimatedCard, CardBody, CardTitle, CardDescription, Visual3 } from "./animated-card";
import { Modal } from "./modal";
import { CardContainer, CardItem } from "./3d-card";
import { DraggableCardBody } from "./draggable-card";

interface HoverPreviewProps {
  title: string;
  children: React.ReactNode;
}

function HoverPreview({ title, children }: HoverPreviewProps) {
  return (
    <div className="ease-[cubic-bezier(0.6, 0.6, 0, 1)] absolute inset-0 z-[10000] flex w-[356px] translate-y-full items-start justify-center bg-transparent p-4 transition-transform duration-500 group-hover/animated-card:translate-y-0 pointer-events-none">
      <div className="ease-[cubic-bezier(0.6, 0, 1)] rounded-md border border-zinc-200 bg-white/95 backdrop-blur-sm p-3 opacity-0 transition-opacity duration-500 group-hover/animated-card:opacity-100 dark:border-zinc-800 dark:bg-black/95 max-h-[280px] overflow-y-auto shadow-xl pointer-events-auto">
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
  sourceCurrency
}: EnhancedFinancialCardProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleVisualClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    console.log('Visual clicked! Opening modal...');
    setIsModalOpen(true);
  };

  return (
    <>
      <DraggableCardBody>
        <CardContainer className="inter-var">
          <AnimatedCard className="w-[356px] min-w-[356px] max-w-[356px] group relative">
            <CardItem translateZ={50} className="w-full cursor-pointer" onClick={handleVisualClick} data-visual-click>
              <Visual3
                mainColor={mainColor}
                secondaryColor={secondaryColor}
                gridColor={gridColor}
                chartData={chartData}
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

            <CardItem translateZ={100} className="w-full">
              <CardBody onClick={handleVisualClick} className="cursor-pointer">
                <div className="flex justify-between items-start w-full">
                  <div className="flex-1 min-w-0">
                    <CardItem translateZ={60} className="flex items-center gap-2">
                      <div style={{ color: mainColor }}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <CardTitle>{title}</CardTitle>
                    </CardItem>
                  </div>
                  <CardItem translateZ={40} className="flex items-center gap-2">
                    <div className={`text-sm font-medium ${changeType === 'positive' ? 'text-green-600' : 'text-red-600'}`}>
                      {change}
                    </div>
                  </CardItem>
                </div>

                <CardItem translateZ={50}>
                  <CardDescription>{description}</CardDescription>
                </CardItem>
                
                <CardItem translateZ={70} className="text-2xl font-bold text-black dark:text-white break-words overflow-hidden">
                  <span className="truncate">{amount}</span>
                </CardItem>
                
                <CardItem translateZ={30} className="flex gap-2 mt-2 flex-wrap overflow-hidden">
                  {stats.map((stat, index) => (
                    <div key={index} className="flex items-center gap-1 text-xs shrink-0">
                      <div 
                        className="w-2 h-2 rounded-full shrink-0" 
                        style={{ backgroundColor: stat.color }}
                      />
                      <span className="text-neutral-600 dark:text-neutral-400 truncate">{stat.label}: {stat.value}</span>
                    </div>
                  ))}
                </CardItem>
              </CardBody>
            </CardItem>
          </AnimatedCard>
        </CardContainer>
      </DraggableCardBody>
      
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
