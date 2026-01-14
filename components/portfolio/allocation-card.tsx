"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

const data = [
	{ name: "BNB", value: 36.34, color: "#F0B90B", amount: 108358090 },
	{ name: "ADA", value: 30.49, color: "#0033AD", amount: 90000000 },
	{ name: "ZEC", value: 20.25, color: "#ECB244", amount: 60000000 },
	{ name: "STETH", value: 12.91, color: "#00a3ff", amount: 38000000 },
];

export function AllocationCard() {
	const primaryItem = data[0];

	return (
		<div className="rounded-3xl bg-black border border-gray-800 p-8 w-full">
			<h3 className="text-lg font-bold text-white mb-6">Coin Allocation</h3>

			<div className="flex flex-col lg:flex-row items-center gap-8">
				{/* Chart */}
				<div className="relative h-64 w-64 flex-shrink-0">
					<ResponsiveContainer width="100%" height="100%">
						<PieChart>
							<Pie
								data={data}
								cx="50%"
								cy="50%"
								innerRadius={80}
								outerRadius={100}
								paddingAngle={0}
								dataKey="value"
								stroke="none"
							>
								{data.map((entry, index) => (
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
					{data.map((item) => (
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
