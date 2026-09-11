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
  const textSub = isDark ? 'text-teal-300' : 'text-neutral-500'

  return (
    <div className={`flex items-center gap-3 select-none ${className}`}>
      <img
        src="/mit-csn-logo.png"
        alt="MIT CSN Logo"
        className="h-9 w-auto object-contain shrink-0"
      />
      {variant !== 'icon' && (
        <div className="flex flex-col justify-center leading-tight">
          <span className={`text-base sm:text-lg font-bold tracking-tight ${textColorPrimary}`}>
            MIT CSN
          </span>
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
