import { FarolStatus } from '../../types';

interface FarolBadgeProps {
  status: FarolStatus;
  hint?: string;
  size?: 'sm' | 'md' | 'lg';
}

export function FarolBadge({ status, hint, size = 'md' }: FarolBadgeProps) {
  const colors = {
    green: 'bg-green-500',
    yellow: 'bg-yellow-500',
    red: 'bg-red-600'
  };

  const sizes = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-5 h-5'
  };

  return (
    <div
      className={`
        ${colors[status]} 
        ${sizes[size]} 
        rounded-full flex-shrink-0 
        ${hint ? 'cursor-help' : ''}
      `}
      title={hint}
    />
  );
}