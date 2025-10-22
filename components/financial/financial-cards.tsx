"use client";

import { AnimatedCard, CardBody, CardTitle, CardDescription, Visual3 } from "../ui/animated-card";

// Enhanced cards from separate files with hover previews and modal functionality
export { RealEstateCard } from "./real-estate-card";
export { CryptoCard } from "./crypto-card";
export { StocksCard } from "./stocks-card";
export { CashCard } from "./cash-card";
export { SavingsCard } from "./savings-card";
export { ExpensesCard } from "./expenses-card";
export { ValuableItemsCard } from "./valuable-items-card";
export { TradingAccountCard, TradingToolsCard } from "./trading-account-card";
export { NetWorthCard } from "./net-worth-card";
export { ToolsCard } from "./tools-card";
export { NewsCard } from "./news-card";
export { TaxesCard } from "./taxes-card";

interface FinancialData {
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
}

interface FinancialCardProps {
  data: FinancialData;
}

export function FinancialCard({ data }: FinancialCardProps) {
  return (
    <AnimatedCard>
      <Visual3
        mainColor={data.mainColor}
        secondaryColor={data.secondaryColor}
        gridColor={data.gridColor}
      />
      <CardBody>
        <div className="flex items-center justify-between">
          <CardTitle>{data.title}</CardTitle>
          <div className={`text-sm font-medium ${data.changeType === 'positive' ? 'text-green-600' : 'text-red-600'}`}>
            {data.change}
          </div>
        </div>
        <CardDescription>{data.description}</CardDescription>
        <div className="text-2xl font-bold text-black dark:text-white">
          {data.amount}
        </div>
        <div className="flex gap-2 mt-2">
          {data.stats.map((stat, index) => (
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
  );
}

// All cards now use enhanced modal system with hover previews from separate files
