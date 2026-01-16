import React from 'react';
import { cn } from '@/lib/utils';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'spinner' | 'dots' | 'pulse' | 'bars';
  color?: 'blue' | 'green' | 'red' | 'yellow' | 'purple' | 'gray';
  className?: string;
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 'md',
  variant = 'spinner',
  color = 'blue',
  className
}) => {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
    xl: 'w-12 h-12'
  };

  const colorClasses = {
    blue: 'text-blue-600',
    green: 'text-green-600',
    red: 'text-red-600',
    yellow: 'text-yellow-600',
    purple: 'text-purple-600',
    gray: 'text-gray-600'
  };

  if (variant === 'spinner') {
    return (
      <div className={cn('inline-block animate-spin', sizeClasses[size], className)}>
        <svg
          className={cn('w-full h-full', colorClasses[color])}
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
      </div>
    );
  }

  if (variant === 'dots') {
    const dotSize = {
      sm: 'w-1 h-1',
      md: 'w-1.5 h-1.5',
      lg: 'w-2 h-2',
      xl: 'w-3 h-3'
    };

    return (
      <div className={cn('inline-flex space-x-1', className)}>
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className={cn(
              'rounded-full animate-bounce',
              dotSize[size],
              `bg-${color}-600`
            )}
            style={{ animationDelay: `${i * 0.1}s` }}
          />
        ))}
      </div>
    );
  }

  if (variant === 'pulse') {
    return (
      <div
        className={cn(
          'rounded-full animate-pulse',
          sizeClasses[size],
          `bg-${color}-600`,
          className
        )}
      />
    );
  }

  if (variant === 'bars') {
    const barHeight = {
      sm: 'h-3',
      md: 'h-4',
      lg: 'h-6',
      xl: 'h-8'
    };

    const barWidth = {
      sm: 'w-0.5',
      md: 'w-1',
      lg: 'w-1.5',
      xl: 'w-2'
    };

    return (
      <div className={cn('inline-flex items-end space-x-1', className)}>
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className={cn(
              'animate-pulse',
              barWidth[size],
              barHeight[size],
              `bg-${color}-600`
            )}
            style={{ 
              animationDelay: `${i * 0.15}s`,
              animationDuration: '1s'
            }}
          />
        ))}
      </div>
    );
  }

  return null;
};

export default LoadingSpinner;
