"use client";

import React from "react";
import { cn } from "@/lib/utils";

interface GPUOptimizedWrapperProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
  /**
   * Estimated height of the content. Required for content-visibility: auto to work correctly without scroll jumping.
   */
  estimatedHeight?: string;
}

export const GPUOptimizedWrapper = ({
  children,
  className,
  estimatedHeight = "500px",
  ...props
}: GPUOptimizedWrapperProps) => {
  return (
    <div
      className={cn("gpu-accelerated content-visibility-auto", className)}
      style={{
        containIntrinsicSize: `1px ${estimatedHeight}`,
      }}
      {...props}
    >
      {children}
    </div>
  );
};
