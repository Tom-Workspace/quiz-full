import React from 'react';
import { cn } from '@/lib/utils';

interface AnimatedCardProps {
  children: React.ReactNode;
  className?: string;
  hoverEffect?: 'lift' | 'glow' | 'scale' | 'border' | 'none';
  entranceAnimation?: 'fade' | 'slide-up' | 'slide-down' | 'slide-left' | 'slide-right' | 'zoom' | 'none';
  animationDelay?: number;
  onClick?: () => void;
  disabled?: boolean;
}

const AnimatedCard: React.FC<AnimatedCardProps> = ({
  children,
  className,
  hoverEffect = 'lift',
  entranceAnimation = 'fade',
  animationDelay = 0,
  onClick,
  disabled = false
}) => {
  const hoverEffects = {
    lift: 'hover:shadow-xl hover:-translate-y-1 transition-all duration-300',
    glow: 'hover:shadow-2xl hover:shadow-blue-500/20 transition-all duration-300',
    scale: 'hover:scale-105 transition-transform duration-300',
    border: 'hover:border-blue-500 hover:shadow-lg transition-all duration-300',
    none: ''
  };

  const entranceAnimations = {
    fade: 'animate-fade-in',
    'slide-up': 'animate-slide-up',
    'slide-down': 'animate-slide-down', 
    'slide-left': 'animate-slide-left',
    'slide-right': 'animate-slide-right',
    zoom: 'animate-zoom-in',
    none: ''
  };

  return (
    <div
      className={cn(
        'bg-white rounded-lg border border-gray-200 shadow-sm',
        hoverEffects[hoverEffect],
        entranceAnimations[entranceAnimation],
        onClick && !disabled && 'cursor-pointer',
        disabled && 'opacity-50 cursor-not-allowed',
        className
      )}
      style={{ animationDelay: `${animationDelay}ms` }}
      onClick={onClick && !disabled ? onClick : undefined}
    >
      {children}
    </div>
  );
};

export default AnimatedCard;
