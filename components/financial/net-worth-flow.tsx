"use client";

import React, { useCallback, useMemo } from 'react';
import {
  Background,
  ReactFlow,
  addEdge,
  ConnectionLineType,
  Panel,
  useNodesState,
  useEdgesState,
  Node,
  Edge,
  Handle,
  Position,
} from '@xyflow/react';
import dagre from '@dagrejs/dagre';
import '@xyflow/react/dist/style.css';
import { 
  TrendingUp, 
  Wallet, 
  PiggyBank, 
  Bitcoin, 
  TrendingDown,
  Diamond,
  Building2,
  BarChart3
} from 'lucide-react';
import { TbCoin, TbChartLine, TbDiamond } from 'react-icons/tb';

const dagreGraph = new dagre.graphlib.Graph().setDefaultEdgeLabel(() => ({}));

const nodeWidth = 220;
const nodeHeight = 80;

// Custom Node Component
function CustomNode({ data }: { data: any }) {
  const Icon = data.icon;
  const isNetWorth = data.type === 'networth';
  const isLiability = data.type === 'liability';
  const cardColor = data.cardColor;
  
  // Helper function to lighten a color for secondary gradient
  const getLightenedColor = (color: string) => {
    // Map of base colors to their lighter variants
    const colorMap: { [key: string]: string } = {
      '#10b981': '#34d399', // Cash - Emerald
      '#3b82f6': '#60a5fa', // Savings - Blue
      '#f97316': '#fb923c', // Crypto - Orange
      '#a855f7': '#c084fc', // Stocks - Purple
      '#84cc16': '#a3e635', // Valuable - Lime
      '#06b6d4': '#22d3ee', // Trading - Cyan
      '#8b5cf6': '#a78bfa', // Real Estate - Violet
      '#ef4444': '#f87171', // Expenses - Red
      '#d946ef': '#e879f9', // Net Worth - Fuchsia
    };
    return colorMap[color] || color;
  };
  
  return (
    <div 
      className="px-4 py-3 rounded-xl border-2 shadow-lg transition-all duration-300 hover:scale-105"
      style={{
        minWidth: nodeWidth,
        minHeight: nodeHeight,
        background: isNetWorth 
          ? `linear-gradient(to bottom right, ${cardColor}, ${getLightenedColor(cardColor)})`
          : isLiability
          ? `linear-gradient(to bottom right, ${cardColor}, ${getLightenedColor(cardColor)})`
          : `linear-gradient(to bottom right, ${cardColor}, ${getLightenedColor(cardColor)})`,
        borderColor: cardColor,
        boxShadow: `0 10px 15px -3px ${cardColor}30, 0 4px 6px -4px ${cardColor}20`,
      }}
    >
      <Handle 
        type="target" 
        position={Position.Top} 
        className="w-3 h-3"
        style={{ backgroundColor: cardColor }}
      />
      
      <div className="flex items-center gap-3">
        <div 
          className="p-2 rounded-lg"
          style={{ backgroundColor: 'rgba(255, 255, 255, 0.15)' }}
        >
          <Icon className="w-5 h-5 text-white" />
        </div>
        <div className="flex-1">
          <div className="text-white font-bold text-sm">{data.label}</div>
          <div className="text-white/90 text-xs font-semibold">{data.value}</div>
          {data.change && (
            <div className={`text-xs font-medium ${
              data.change.startsWith('+') ? 'text-green-200' : 'text-red-200'
            }`}>
              {data.change}
            </div>
          )}
        </div>
      </div>
      
      <Handle 
        type="source" 
        position={Position.Bottom} 
        className="w-3 h-3"
        style={{ backgroundColor: cardColor }}
      />
    </div>
  );
}

const nodeTypes = {
  custom: CustomNode,
};

const getLayoutedElements = (nodes: Node[], edges: Edge[], direction = 'TB') => {
  const isHorizontal = direction === 'LR';
  dagreGraph.setGraph({ 
    rankdir: direction,
    nodesep: 50,
    ranksep: 100,
    marginx: 50,
    marginy: 50,
  });

  nodes.forEach((node) => {
    dagreGraph.setNode(node.id, { width: nodeWidth, height: nodeHeight });
  });

  edges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target);
  });

  dagre.layout(dagreGraph);

  const newNodes = nodes.map((node) => {
    const nodeWithPosition = dagreGraph.node(node.id);
    const newNode = {
      ...node,
      targetPosition: isHorizontal ? Position.Left : Position.Top,
      sourcePosition: isHorizontal ? Position.Right : Position.Bottom,
      position: {
        x: nodeWithPosition.x - nodeWidth / 2,
        y: nodeWithPosition.y - nodeHeight / 2,
      },
    };

    return newNode;
  });

  return { nodes: newNodes, edges };
};

export function NetWorthFlow({ 
  cashValue = 12450.75,
  savingsValue = 45280.50,
  cryptoValue = 70800,
  stocksValue = 194500,
  valuableItemsValue = 185750,
  tradingValue = 15680.40,
  realEstateValue = 862500,
  expensesValue = 3245.60,
  netWorthValue = 1215557,
  cryptoChange = '+15.3%',
  stocksChange = '+12.1%',
}: {
  cashValue?: number;
  savingsValue?: number;
  cryptoValue?: number;
  stocksValue?: number;
  valuableItemsValue?: number;
  tradingValue?: number;
  realEstateValue?: number;
  expensesValue?: number;
  netWorthValue?: number;
  cryptoChange?: string;
  stocksChange?: string;
}) {
  const formatValue = (value: number) => `$${value.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;

  const initialNodes: Node[] = useMemo(() => [
    // Asset Nodes
    {
      id: 'cash',
      type: 'custom',
      data: { 
        label: 'Cash & Liquid',
        value: formatValue(cashValue),
        change: '+4.6%',
        icon: TbCoin,
        type: 'asset',
        cardColor: '#10b981', // Emerald - matches Cash card
      },
      position: { x: 0, y: 0 },
    },
    {
      id: 'savings',
      type: 'custom',
      data: { 
        label: 'Savings',
        value: formatValue(savingsValue),
        change: '+2.1%',
        icon: PiggyBank,
        type: 'asset',
        cardColor: '#3b82f6', // Blue - matches Savings card
      },
      position: { x: 0, y: 0 },
    },
    {
      id: 'crypto',
      type: 'custom',
      data: { 
        label: 'Crypto Portfolio',
        value: formatValue(cryptoValue),
        change: cryptoChange,
        icon: Bitcoin,
        type: 'asset',
        cardColor: '#f97316', // Orange - matches Crypto card
      },
      position: { x: 0, y: 0 },
    },
    {
      id: 'stocks',
      type: 'custom',
      data: { 
        label: 'Stock Portfolio',
        value: formatValue(stocksValue),
        change: stocksChange,
        icon: TbChartLine,
        type: 'asset',
        cardColor: '#a855f7', // Purple - matches Stocks card
      },
      position: { x: 0, y: 0 },
    },
    {
      id: 'valuable',
      type: 'custom',
      data: { 
        label: 'Valuable Items',
        value: formatValue(valuableItemsValue),
        change: '+8.1%',
        icon: TbDiamond,
        type: 'asset',
        cardColor: '#84cc16', // Lime - matches Valuable Items card
      },
      position: { x: 0, y: 0 },
    },
    {
      id: 'trading',
      type: 'custom',
      data: { 
        label: 'Trading Account',
        value: formatValue(tradingValue),
        change: '+12.3%',
        icon: BarChart3,
        type: 'asset',
        cardColor: '#06b6d4', // Cyan - matches Trading card
      },
      position: { x: 0, y: 0 },
    },
    {
      id: 'realestate',
      type: 'custom',
      data: { 
        label: 'Real Estate',
        value: formatValue(realEstateValue),
        change: '+5.2%',
        icon: Building2,
        type: 'asset',
        cardColor: '#8b5cf6', // Violet - matches Real Estate card
      },
      position: { x: 0, y: 0 },
    },
    // Intermediate Nodes
    {
      id: 'totalassets',
      type: 'custom',
      data: { 
        label: 'Total Assets',
        value: formatValue(cashValue + savingsValue + cryptoValue + stocksValue + valuableItemsValue + tradingValue + realEstateValue),
        icon: Wallet,
        type: 'intermediate',
        cardColor: '#6366f1', // Indigo - for aggregated assets
      },
      position: { x: 0, y: 0 },
    },
    {
      id: 'expenses',
      type: 'custom',
      data: { 
        label: 'Liabilities',
        value: formatValue(expensesValue),
        icon: TrendingDown,
        type: 'liability',
        cardColor: '#ef4444', // Red - matches Expenses card
      },
      position: { x: 0, y: 0 },
    },
    // Net Worth Node
    {
      id: 'networth',
      type: 'custom',
      data: { 
        label: 'Net Worth',
        value: formatValue(netWorthValue),
        change: '+7.8%',
        icon: TrendingUp,
        type: 'networth',
        cardColor: '#d946ef', // Fuchsia - matches Net Worth card
      },
      position: { x: 0, y: 0 },
    },
  ], [cashValue, savingsValue, cryptoValue, stocksValue, valuableItemsValue, tradingValue, realEstateValue, expensesValue, netWorthValue, cryptoChange, stocksChange]);

  const initialEdges: Edge[] = useMemo(() => [
    // Assets to Total Assets - each edge matches its source card color
    { 
      id: 'e-cash-total', 
      source: 'cash', 
      target: 'totalassets', 
      type: ConnectionLineType.SmoothStep, 
      animated: true, 
      style: { stroke: '#10b981', strokeWidth: 2.5 } // Cash green
    },
    { 
      id: 'e-savings-total', 
      source: 'savings', 
      target: 'totalassets', 
      type: ConnectionLineType.SmoothStep, 
      animated: true, 
      style: { stroke: '#3b82f6', strokeWidth: 2.5 } // Savings blue
    },
    { 
      id: 'e-crypto-total', 
      source: 'crypto', 
      target: 'totalassets', 
      type: ConnectionLineType.SmoothStep, 
      animated: true, 
      style: { stroke: '#f97316', strokeWidth: 2.5 } // Crypto orange
    },
    { 
      id: 'e-stocks-total', 
      source: 'stocks', 
      target: 'totalassets', 
      type: ConnectionLineType.SmoothStep, 
      animated: true, 
      style: { stroke: '#a855f7', strokeWidth: 2.5 } // Stocks purple
    },
    { 
      id: 'e-valuable-total', 
      source: 'valuable', 
      target: 'totalassets', 
      type: ConnectionLineType.SmoothStep, 
      animated: true, 
      style: { stroke: '#84cc16', strokeWidth: 2.5 } // Valuable lime
    },
    { 
      id: 'e-trading-total', 
      source: 'trading', 
      target: 'totalassets', 
      type: ConnectionLineType.SmoothStep, 
      animated: true, 
      style: { stroke: '#06b6d4', strokeWidth: 2.5 } // Trading cyan
    },
    { 
      id: 'e-realestate-total', 
      source: 'realestate', 
      target: 'totalassets', 
      type: ConnectionLineType.SmoothStep, 
      animated: true, 
      style: { stroke: '#8b5cf6', strokeWidth: 2.5 } // Real Estate violet
    },
    
    // Total Assets and Expenses to Net Worth
    { 
      id: 'e-total-networth', 
      source: 'totalassets', 
      target: 'networth', 
      type: ConnectionLineType.SmoothStep, 
      animated: true, 
      style: { stroke: '#10b981', strokeWidth: 3.5 }, // Green for positive
      label: '+',
      labelStyle: { fill: '#10b981', fontWeight: 700 }
    },
    { 
      id: 'e-expenses-networth', 
      source: 'expenses', 
      target: 'networth', 
      type: ConnectionLineType.SmoothStep, 
      animated: true, 
      style: { stroke: '#ef4444', strokeWidth: 3.5 }, // Red for negative
      label: '-',
      labelStyle: { fill: '#ef4444', fontWeight: 700 }
    },
  ], []);

  const { nodes: layoutedNodes, edges: layoutedEdges } = useMemo(
    () => getLayoutedElements(initialNodes, initialEdges, 'TB'),
    [initialNodes, initialEdges]
  );

  const [nodes, setNodes, onNodesChange] = useNodesState(layoutedNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(layoutedEdges);

  const onConnect = useCallback(
    (params: any) =>
      setEdges((eds) =>
        addEdge({ ...params, type: ConnectionLineType.SmoothStep, animated: true }, eds)
      ),
    [setEdges]
  );

  const onLayout = useCallback(
    (direction: 'TB' | 'LR') => {
      const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(
        nodes,
        edges,
        direction
      );

      setNodes([...layoutedNodes]);
      setEdges([...layoutedEdges]);
    },
    [nodes, edges, setNodes, setEdges]
  );

  return (
    <div className="h-[600px] w-full bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        connectionLineType={ConnectionLineType.SmoothStep}
        nodeTypes={nodeTypes}
        fitView
        attributionPosition="bottom-right"
        className="bg-gray-50 dark:bg-gray-900"
      >
        <Panel position="top-right" className="flex gap-2">
          <button 
            className="px-3 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-sm font-medium shadow-sm"
            onClick={() => onLayout('TB')}
          >
            Vertical Layout
          </button>
          <button 
            className="px-3 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-sm font-medium shadow-sm"
            onClick={() => onLayout('LR')}
          >
            Horizontal Layout
          </button>
        </Panel>
        <Background 
          gap={16} 
          size={1}
          className="bg-gray-50 dark:bg-gray-900"
        />
      </ReactFlow>
      
      {/* Compact Legend */}
      <div className="absolute bottom-3 left-3 bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 shadow-md">
        <div className="flex flex-wrap gap-x-3 gap-y-1 text-[10px]">
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: '#10b981' }}></div>
            <span className="text-gray-700 dark:text-gray-300">Cash</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: '#3b82f6' }}></div>
            <span className="text-gray-700 dark:text-gray-300">Savings</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: '#f97316' }}></div>
            <span className="text-gray-700 dark:text-gray-300">Crypto</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: '#a855f7' }}></div>
            <span className="text-gray-700 dark:text-gray-300">Stocks</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: '#84cc16' }}></div>
            <span className="text-gray-700 dark:text-gray-300">Valuable</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: '#06b6d4' }}></div>
            <span className="text-gray-700 dark:text-gray-300">Trading</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: '#8b5cf6' }}></div>
            <span className="text-gray-700 dark:text-gray-300">Real Estate</span>
          </div>
          <div className="w-px h-3 bg-gray-300 dark:bg-gray-600"></div>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: '#ef4444' }}></div>
            <span className="text-gray-700 dark:text-gray-300">Liabilities</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: '#d946ef' }}></div>
            <span className="text-gray-700 dark:text-gray-300">Net Worth</span>
          </div>
        </div>
      </div>
    </div>
  );
}
