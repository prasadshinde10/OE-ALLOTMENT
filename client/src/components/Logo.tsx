'use client'

import React from 'react'

interface LogoProps {
  className?: string
  variant?: 'full' | 'compact' | 'icon'
  theme?: 'dark' | 'light'
}

export default function Logo({
  className = '',
  variant = 'full',
  theme = 'light'
}: LogoProps) {
  const isDark = theme === 'dark'
  const textColorPrimary = isDark ? 'text-white' : 'text-neutral-900'
  const textColorSecondary = isDark ? 'text-teal-200' : 'text-teal-700'
  const textSub = isDark ? 'text-teal-300' : 'text-neutral-500'

  return (
    <div className={`flex items-center gap-3 select-none ${className}`}>
      {/* Precision Geometric SVG Shield / Emblem */}
      <svg
        className="w-9 h-9 shrink-0"
        viewBox="0 0 36 36"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-label="MIT CSN Logo"
      >
        {/* Deep Teal Outer Shield / Hexagon Frame */}
        <rect
          x="1"
          y="1"
          width="34"
          height="34"
          rx="8"
          fill="#0E4C5C"
          stroke="#0A3B48"
          strokeWidth="1.5"
        />
        {/* Accent Orange Geometric Geometry Corner / Triangle Indicator */}
        <path
          d="M27 5L31 9V5H27Z"
          fill="#E8792E"
        />
        {/* Abstract Architectural / Academic Symbol: Intersecting nodes & book geometry */}
        <path
          d="M10 24V14L18 10L26 14V24L18 28L10 24Z"
          stroke="white"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeOpacity="0.9"
        />
        <path
          d="M18 10V28"
          stroke="white"
          strokeWidth="1.5"
          strokeOpacity="0.4"
        />
        <path
          d="M10 14L18 18L26 14"
          stroke="white"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeOpacity="0.7"
        />
        {/* Orange Accent Node at the Center */}
        <circle
          cx="18"
          cy="18"
          r="2.5"
          fill="#E8792E"
        />
      </svg>

      {variant !== 'icon' && (
        <div className="flex flex-col justify-center leading-tight">
          <div className="flex items-center gap-1.5">
            <span className={`text-base sm:text-lg font-bold tracking-tight ${textColorPrimary}`}>
              MIT
            </span>
            <span className="text-xs font-extrabold uppercase px-1.5 py-0.5 rounded bg-accent-500 text-white tracking-wider">
              CSN
            </span>
          </div>
          {variant === 'full' && (
            <span className={`text-[10px] font-medium tracking-wide ${textSub}`}>
              Elective Allocation Platform
            </span>
          )}
        </div>
      )}
    </div>
  )
}
