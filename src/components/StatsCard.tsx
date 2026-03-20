"use client";

import { ReactNode } from "react";

interface StatsCardProps {
  title: string;
  value: string | number;
  icon: ReactNode;
  iconColor?: string;
  trend?: {
    value: number;
    isPositive: boolean;
  };
}

export function StatsCard({
  title,
  value,
  icon,
  iconColor = "var(--blue-500)",
  trend,
}: StatsCardProps) {
  return (
    <div 
      className="rounded-xl p-4 md:p-6"
      style={{
        backgroundColor: "var(--bg-secondary)",
        border: "1px solid var(--border-primary)",
      }}
    >
      <div className="flex items-center justify-between mb-1.5 md:mb-2">
        <span 
          className="text-xs md:text-sm font-medium"
          style={{ color: "var(--text-tertiary-600)" }}
        >
          {title}
        </span>
        <div className="[&>svg]:w-4 [&>svg]:h-4 md:[&>svg]:w-5 md:[&>svg]:h-5" style={{ color: iconColor }}>
          {icon}
        </div>
      </div>

      <div className="flex items-end justify-between">
        <span 
          className="text-2xl md:text-3xl font-bold tracking-tight"
          style={{ 
            fontFamily: 'var(--font-sora), system-ui, sans-serif',
            color: "var(--text-primary-900)",
            letterSpacing: '-1.5px'
          }}
        >
          {value}
        </span>
        {trend && (
          <span
            className="text-xs md:text-sm font-medium"
            style={{ color: trend.isPositive ? 'var(--success-500)' : 'var(--error-500)' }}
          >
            {trend.isPositive ? "↑" : "↓"} {trend.value}%
          </span>
        )}
      </div>
    </div>
  );
}
