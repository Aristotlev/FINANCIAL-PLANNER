"use client";

import React from 'react';

// Chart loading placeholder component
export function ChartLoadingPlaceholder({ 
  height = 200, 
  message = "Loading chart..." 
}: { 
  height?: number | string;
  message?: string;
}) {
  return (
    <div 
      className="flex items-center justify-center bg-gray-50 dark:bg-gray-800/50 rounded-lg animate-pulse"
      style={{ height: typeof height === 'number' ? `${height}px` : height }}
    >
      <div className="text-center">
        <div className="w-8 h-8 border-2 border-gray-300 dark:border-gray-600 border-t-purple-500 rounded-full animate-spin mx-auto mb-2" />
        <span className="text-sm text-gray-500 dark:text-gray-400">{message}</span>
      </div>
    </div>
  );
}

// For components that need to be wrapped together, create wrapper components
// These allow you to use the full Recharts API with dynamic loading

interface LazyChartWrapperProps {
  children: (components: typeof import('recharts')) => React.ReactNode;
  fallback?: React.ReactNode;
  height?: number | string;
}

// A wrapper that provides all recharts components to its children
export function LazyRechartsWrapper({ 
  children, 
  fallback,
  height = 200 
}: LazyChartWrapperProps) {
  const [rechartsModule, setRechartsModule] = React.useState<typeof import('recharts') | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    let mounted = true;
    
    import('recharts').then((mod) => {
      if (mounted) {
        setRechartsModule(mod);
        setIsLoading(false);
      }
    });

    return () => {
      mounted = false;
    };
  }, []);

  if (isLoading || !rechartsModule) {
    return fallback || <ChartLoadingPlaceholder height={height} />;
  }

  return <>{children(rechartsModule)}</>;
}

// Pre-built lazy chart components with common configurations

interface SimpleLazyLineChartProps {
  data: any[];
  dataKey: string;
  xAxisKey?: string;
  color?: string;
  height?: number;
  showGrid?: boolean;
  showTooltip?: boolean;
  showXAxis?: boolean;
  showYAxis?: boolean;
  strokeWidth?: number;
  className?: string;
}

export function SimpleLazyLineChart({
  data,
  dataKey,
  xAxisKey = 'name',
  color = '#8b5cf6',
  height = 200,
  showGrid = true,
  showTooltip = true,
  showXAxis = true,
  showYAxis = true,
  strokeWidth = 2,
  className = '',
}: SimpleLazyLineChartProps) {
  return (
    <LazyRechartsWrapper height={height}>
      {({ LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer }) => (
        <ResponsiveContainer width="100%" height={height} className={className}>
          <LineChart data={data}>
            {showGrid && <CartesianGrid strokeDasharray="3 3" opacity={0.3} />}
            {showXAxis && <XAxis dataKey={xAxisKey} />}
            {showYAxis && <YAxis />}
            {showTooltip && <Tooltip />}
            <Line 
              type="monotone" 
              dataKey={dataKey} 
              stroke={color} 
              strokeWidth={strokeWidth}
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      )}
    </LazyRechartsWrapper>
  );
}

interface SimpleLazyPieChartProps {
  data: any[];
  dataKey: string;
  nameKey?: string;
  colors?: string[];
  height?: number;
  innerRadius?: number;
  outerRadius?: number;
  showTooltip?: boolean;
  className?: string;
}

export function SimpleLazyPieChart({
  data,
  dataKey,
  nameKey = 'name',
  colors = ['#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#ef4444'],
  height = 200,
  innerRadius = 0,
  outerRadius = 80,
  showTooltip = true,
  className = '',
}: SimpleLazyPieChartProps) {
  return (
    <LazyRechartsWrapper height={height}>
      {({ PieChart, Pie, Cell, ResponsiveContainer, Tooltip }) => (
        <ResponsiveContainer width="100%" height={height} className={className}>
          <PieChart>
            <Pie
              data={data}
              dataKey={dataKey}
              nameKey={nameKey}
              cx="50%"
              cy="50%"
              innerRadius={innerRadius}
              outerRadius={outerRadius}
            >
              {data.map((_, index) => (
                <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
              ))}
            </Pie>
            {showTooltip && <Tooltip />}
          </PieChart>
        </ResponsiveContainer>
      )}
    </LazyRechartsWrapper>
  );
}

interface SimpleLazyBarChartProps {
  data: any[];
  dataKey: string;
  xAxisKey?: string;
  color?: string;
  height?: number;
  showGrid?: boolean;
  showTooltip?: boolean;
  showXAxis?: boolean;
  showYAxis?: boolean;
  className?: string;
}

export function SimpleLazyBarChart({
  data,
  dataKey,
  xAxisKey = 'name',
  color = '#8b5cf6',
  height = 200,
  showGrid = true,
  showTooltip = true,
  showXAxis = true,
  showYAxis = true,
  className = '',
}: SimpleLazyBarChartProps) {
  return (
    <LazyRechartsWrapper height={height}>
      {({ BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer }) => (
        <ResponsiveContainer width="100%" height={height} className={className}>
          <BarChart data={data}>
            {showGrid && <CartesianGrid strokeDasharray="3 3" opacity={0.3} />}
            {showXAxis && <XAxis dataKey={xAxisKey} />}
            {showYAxis && <YAxis />}
            {showTooltip && <Tooltip />}
            <Bar dataKey={dataKey} fill={color} />
          </BarChart>
        </ResponsiveContainer>
      )}
    </LazyRechartsWrapper>
  );
}

interface SimpleLazyAreaChartProps {
  data: any[];
  dataKey: string;
  xAxisKey?: string;
  color?: string;
  fillOpacity?: number;
  height?: number;
  showGrid?: boolean;
  showTooltip?: boolean;
  showXAxis?: boolean;
  showYAxis?: boolean;
  strokeWidth?: number;
  className?: string;
}

export function SimpleLazyAreaChart({
  data,
  dataKey,
  xAxisKey = 'name',
  color = '#8b5cf6',
  fillOpacity = 0.3,
  height = 200,
  showGrid = true,
  showTooltip = true,
  showXAxis = true,
  showYAxis = true,
  strokeWidth = 2,
  className = '',
}: SimpleLazyAreaChartProps) {
  return (
    <LazyRechartsWrapper height={height}>
      {({ AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer }) => (
        <ResponsiveContainer width="100%" height={height} className={className}>
          <AreaChart data={data}>
            {showGrid && <CartesianGrid strokeDasharray="3 3" opacity={0.3} />}
            {showXAxis && <XAxis dataKey={xAxisKey} />}
            {showYAxis && <YAxis />}
            {showTooltip && <Tooltip />}
            <Area 
              type="monotone" 
              dataKey={dataKey} 
              stroke={color} 
              fill={color}
              fillOpacity={fillOpacity}
              strokeWidth={strokeWidth}
            />
          </AreaChart>
        </ResponsiveContainer>
      )}
    </LazyRechartsWrapper>
  );
}
