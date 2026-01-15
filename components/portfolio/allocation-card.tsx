"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { usePortfolioContext } from "../../contexts/portfolio-context";
import { useFinancialData } from "../../contexts/financial-data-context";
import { getBrandColor } from "../../lib/brand-colors";

interface AllocationCardProps {
    selectedCategory?: string;
}

export function AllocationCard({ selectedCategory }: AllocationCardProps = {}) {
    const { cryptoHoldings, stockHoldings, portfolioValues } = usePortfolioContext();
    const { cash, savings, valuableItems, realEstate } = useFinancialData();

    console.log('AllocationCard category:', selectedCategory); // Debug

    let chartData: { name: string; value: number; color: string; amount: number }[] = [];
    let totalValue = 0;

    if (selectedCategory === "Stocks") {
        totalValue = portfolioValues.stocks.value;
        chartData = stockHoldings
            .filter(h => (h.shares * h.entryPoint) > 0 || h.value > 0) // Filter out empty positions
            .map(holding => {
                 // Use current value derived from price if available, otherwise fallback
                 const holdingValue = holding.value || (holding.shares * holding.entryPoint);
                 // Calculate percentage
                 const percentage = totalValue > 0 ? (holdingValue / totalValue) * 100 : 0;
                 return {
                     name: holding.symbol,
                     value: parseFloat(percentage.toFixed(2)),
                     color: holding.color || getBrandColor(holding.symbol, 'stock'),
                     amount: holdingValue
                 };
            })
            .sort((a, b) => b.value - a.value)
            .slice(0, 5); // Show top 5
    } else if (selectedCategory === "Networth") {
        totalValue = portfolioValues.crypto.value + portfolioValues.stocks.value + realEstate + valuableItems + cash + savings;
        
        const liquidAssets = cash + savings;

        chartData = [
            { name: "Crypto", value: 0, color: "#F59E0B", amount: portfolioValues.crypto.value },
            { name: "Stocks", value: 0, color: "#8B5CF6", amount: portfolioValues.stocks.value },
            { name: "Real Estate", value: 0, color: "#06B6D4", amount: realEstate },
            { name: "Valuables", value: 0, color: "#EC4899", amount: valuableItems },
            { name: "Liquid Assets", value: 0, color: "#10B981", amount: liquidAssets },
        ]
        .filter(item => item.amount > 0)
        .map(item => ({
            ...item,
            value: totalValue > 0 ? parseFloat(((item.amount / totalValue) * 100).toFixed(2)) : 0
        }))
        .sort((a, b) => b.value - a.value);

    } else {
        // Default to Crypto / Existing logic
        // If we want to use real crypto data:
        totalValue = portfolioValues.crypto.value;
        if (cryptoHoldings.length > 0) {
             chartData = cryptoHoldings
                .filter(h => (h.amount * h.entryPoint) > 0 || h.value > 0)
                .map(holding => {
                     const holdingValue = holding.value || (holding.amount * holding.entryPoint);
                     const percentage = totalValue > 0 ? (holdingValue / totalValue) * 100 : 0;
                     return {
                         name: holding.symbol,
                         value: parseFloat(percentage.toFixed(2)),
                         color: holding.color || getBrandColor(holding.symbol, 'crypto'),
                         amount: holdingValue
                     };
                })
                .sort((a, b) => b.value - a.value)
                .slice(0, 5);
        } else {
            // Fallback to the hardcoded example data if no real data (preserve existing look for empty state/demo)
             const demoData = [
                { name: "BNB", value: 36.34, color: "#F0B90B", amount: 108358090 },
                { name: "ADA", value: 30.49, color: "#0033AD", amount: 90000000 },
                { name: "ZEC", value: 20.25, color: "#ECB244", amount: 60000000 },
                { name: "STETH", value: 12.91, color: "#00a3ff", amount: 38000000 },
            ];
            chartData = demoData;
        }
    }

    // Handle empty state if filtering resulted in no data? 
    // If stock holdings are empty, chartData will be empty. 
    // We should probably show a "No Data" state or empty pie.
    const primaryItem = chartData.length > 0 ? chartData[0] : { name: "N/A", value: 0, color: "#333", amount: 0 };


	return (
		<div className="rounded-3xl bg-black border border-gray-800 p-8 w-full">
			<h3 className="text-lg font-bold text-white mb-6">
                {selectedCategory === "Stocks" ? "Stock Allocation" : selectedCategory === "Networth" ? "Net Worth Allocation" : "Coin Allocation"}
            </h3>

			<div className="flex flex-col lg:flex-row items-center gap-8">
				{/* Chart */}
				<div className="relative h-64 w-64 flex-shrink-0">
					<ResponsiveContainer width="100%" height="100%">
						<PieChart>
							<Pie
								data={chartData}
								cx="50%"
								cy="50%"
								innerRadius={80}
								outerRadius={100}
								paddingAngle={0}
								dataKey="value"
								stroke="none"
							>
								{chartData.map((entry, index) => (
									<Cell key={`cell-${index}`} fill={entry.color} />
								))}
							</Pie>
						</PieChart>
					</ResponsiveContainer>

					{/* Centered Text */}
					<div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
						<div className="flex items-center gap-1.5 text-white font-bold mb-1">
							<div
								className="w-2 h-2 rounded-full"
								style={{ backgroundColor: primaryItem.color }}
							/>
							{primaryItem.name}
						</div>
						<div className="text-xl font-bold text-white">
							${primaryItem.amount.toLocaleString()}
						</div>
						<div className="text-sm text-gray-500">
							{primaryItem.value}%
						</div>
					</div>
				</div>

				{/* Legend */}
				<div className="flex-1 w-full space-y-4">
					{chartData.map((item) => (
						<div
							key={item.name}
							className="flex items-center justify-between group"
						>
							<div className="flex items-center gap-3">
								<div
									className="h-8 w-8 rounded-full flex items-center justify-center bg-gray-900 border border-gray-800"
									style={{ color: item.color }}
								>
									{/* Placeholder for coin icon */}
									<span className="text-[10px] font-bold">
										{item.name[0]}
									</span>
								</div>
								<span className="font-bold text-white">{item.name}</span>
							</div>

							<div className="flex items-center gap-2">
								<span className="text-white font-bold">{item.value}%</span>
								<div
									className="w-2 h-2 rounded-sm"
									style={{ backgroundColor: item.color }}
								/>
							</div>
						</div>
					))}
				</div>
			</div>
		</div>
	);
}
