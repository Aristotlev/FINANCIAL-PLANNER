'use client';

import { createChart, ColorType, IChartApi, AreaSeries, CandlestickSeries, LineSeries, HistogramSeries, BarSeries } from 'lightweight-charts';
import React, { useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';

export type ChartType = 'Area' | 'Candlestick' | 'Line' | 'Histogram' | 'Bar';

interface ChartProps {
  data: any[];
  chartType?: ChartType;
  colors?: {
    backgroundColor?: string;
    lineColor?: string;
    textColor?: string;
    areaTopColor?: string;
    areaBottomColor?: string;
    upColor?: string;
    downColor?: string;
    wickUpColor?: string;
    wickDownColor?: string;
  };
  className?: string;
}

export const TradingViewChart: React.FC<ChartProps> = ({
  data,
  chartType = 'Area',
  colors: {
    backgroundColor = 'transparent',
    lineColor = '#2962FF',
    textColor = '#B2B5BE',
    areaTopColor = '#2962FF',
    areaBottomColor = 'rgba(41, 98, 255, 0.28)',
    upColor = '#26a69a',
    downColor = '#ef5350',
    wickUpColor = '#26a69a',
    wickDownColor = '#ef5350',
  } = {},
  className,
}) => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);

  useEffect(() => {
    if (!chartContainerRef.current) return;

    const handleResize = () => {
      if (chartRef.current && chartContainerRef.current) {
        chartRef.current.applyOptions({ width: chartContainerRef.current.clientWidth });
      }
    };

    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: backgroundColor },
        textColor,
      },
      width: chartContainerRef.current.clientWidth,
      height: 400,
      grid: {
        vertLines: { color: 'rgba(197, 203, 206, 0.1)' },
        horzLines: { color: 'rgba(197, 203, 206, 0.1)' },
      },
      timeScale: {
        borderColor: 'rgba(197, 203, 206, 0.3)',
      },
      rightPriceScale: {
        borderColor: 'rgba(197, 203, 206, 0.3)',
      }
    });

    chartRef.current = chart;

    let series;

    if (chartType === 'Area') {
      series = chart.addSeries(AreaSeries, {
        lineColor,
        topColor: areaTopColor,
        bottomColor: areaBottomColor,
      });
    } else if (chartType === 'Candlestick') {
      series = chart.addSeries(CandlestickSeries, {
        upColor,
        downColor,
        borderVisible: false,
        wickUpColor,
        wickDownColor,
      });
    } else if (chartType === 'Line') {
      series = chart.addSeries(LineSeries, {
        color: lineColor,
      });
    } else if (chartType === 'Histogram') {
      series = chart.addSeries(HistogramSeries, {
        color: lineColor,
      });
    } else if (chartType === 'Bar') {
        series = chart.addSeries(BarSeries, {
            upColor,
            downColor,
        });
    }

    if (series && data.length > 0) {
      // Deduplicate and sort data by time (ascending)
      const seenTimes = new Set<number>();
      const cleanedData = data
        .filter(item => {
          if (seenTimes.has(item.time)) {
            return false;
          }
          seenTimes.add(item.time);
          return true;
        })
        .sort((a, b) => a.time - b.time);
      
      if (cleanedData.length > 0) {
        series.setData(cleanedData);
      }
    }
    
    chart.timeScale().fitContent();

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      chart.remove();
    };
  }, [data, chartType, backgroundColor, lineColor, textColor, areaTopColor, areaBottomColor, upColor, downColor, wickUpColor, wickDownColor]);

  return (
    <div
      ref={chartContainerRef}
      className={cn("w-full h-[400px] [&_a]:hidden", className)}
    />
  );
};
