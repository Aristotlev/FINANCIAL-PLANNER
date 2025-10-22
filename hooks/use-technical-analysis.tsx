"use client";

import { useState } from "react";
import { TechnicalAnalysisModal } from "../components/ui/technical-analysis-modal";

interface TechnicalAnalysisConfig {
  symbol: string;
  assetType: 'crypto' | 'stock' | 'forex' | 'commodity' | 'index';
  assetName?: string;
}

export function useTechnicalAnalysis() {
  const [isOpen, setIsOpen] = useState(false);
  const [config, setConfig] = useState<TechnicalAnalysisConfig>({
    symbol: 'BTC',
    assetType: 'crypto',
    assetName: 'Bitcoin'
  });

  const openTechnicalAnalysis = (analysisConfig: TechnicalAnalysisConfig) => {
    setConfig(analysisConfig);
    setIsOpen(true);
  };

  const closeTechnicalAnalysis = () => {
    setIsOpen(false);
  };

  const TechnicalAnalysisComponent = () => (
    <TechnicalAnalysisModal
      isOpen={isOpen}
      onClose={closeTechnicalAnalysis}
      symbol={config.symbol}
      assetType={config.assetType}
      assetName={config.assetName}
    />
  );

  return {
    openTechnicalAnalysis,
    closeTechnicalAnalysis,
    TechnicalAnalysisComponent,
    isOpen
  };
}
