"use client";

import { useState } from "react";
import { ExternalLink, TrendingUp, DollarSign, PieChart } from "lucide-react";
import { AnimatedCard, CardBody, CardTitle, CardDescription, Visual3 } from "../ui/animated-card";
import { Modal } from "../ui/modal";

interface FinancialCardWithModalProps {
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
  modalContent: React.ReactNode;
}

export function FinancialCardWithModal({
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
  modalContent
}: FinancialCardWithModalProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <>
      <AnimatedCard className="w-[356px]">
        <Visual3
          mainColor={mainColor}
          secondaryColor={secondaryColor}
          gridColor={gridColor}
        />
        <CardBody>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div style={{ color: mainColor }}>
                <Icon className="w-5 h-5" />
              </div>
              <CardTitle>{title}</CardTitle>
            </div>
            <div className="flex items-center gap-2">
              <div className={`text-sm font-medium ${changeType === 'positive' ? 'text-green-600' : 'text-red-600'}`}>
                {change}
              </div>
              <button
                onClick={() => setIsModalOpen(true)}
                className="p-1 hover:bg-gray-100 rounded-full transition-colors dark:hover:bg-gray-800"
              >
                <ExternalLink className="w-4 h-4" />
              </button>
            </div>
          </div>
          
          <CardDescription>{description}</CardDescription>
          
          <div className="text-2xl font-bold text-black dark:text-white">
            {amount}
          </div>
          
          <div className="flex gap-2 mt-2 flex-wrap">
            {stats.map((stat, index) => (
              <div key={index} className="flex items-center gap-1 text-xs">
                <div 
                  className="w-2 h-2 rounded-full" 
                  style={{ backgroundColor: stat.color }}
                />
                <span className="text-neutral-600 dark:text-neutral-400">{stat.label}: {stat.value}</span>
              </div>
            ))}
          </div>
        </CardBody>
      </AnimatedCard>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={`${title} - Detailed Analysis`}
      >
        {modalContent}
      </Modal>
    </>
  );
}
