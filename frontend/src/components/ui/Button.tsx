/**
 * Button — reusable button component with multiple variants and sizes.
 * Built with class-variance-authority for type-safe variant composition.
 */

import React, { forwardRef } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@utils/cn';

const buttonVariants = cva(
  [
    'inline-flex items-center justify-center gap-2 rounded-xl font-semibold',
    'transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2',
    'disabled:pointer-events-none disabled:opacity-50 select-none',
  ],
  {
    variants: {
      variant: {
        primary: [
          'bg-brand-600 text-white hover:bg-brand-700 active:bg-brand-800',
          'focus:ring-brand-500 shadow-sm hover:shadow-glow-sm',
        ],
        secondary: [
          'bg-surface-100 text-surface-900 hover:bg-surface-200 active:bg-surface-300',
          'dark:bg-surface-700 dark:text-surface-100 dark:hover:bg-surface-600',
          'focus:ring-surface-500 border border-surface-200 dark:border-surface-600',
        ],
        outline: [
          'border border-brand-600 text-brand-600 hover:bg-brand-50 active:bg-brand-100',
          'dark:border-brand-400 dark:text-brand-400 dark:hover:bg-brand-950',
          'focus:ring-brand-500',
        ],
        ghost: [
          'text-surface-700 hover:bg-surface-100 active:bg-surface-200',
          'dark:text-surface-300 dark:hover:bg-surface-800',
          'focus:ring-surface-500',
        ],
        destructive: [
          'bg-red-600 text-white hover:bg-red-700 active:bg-red-800',
          'focus:ring-red-500 shadow-sm',
        ],
        gradient: [
          'bg-gradient-to-r from-brand-600 to-accent-600 text-white',
          'hover:from-brand-500 hover:to-accent-500 focus:ring-brand-500',
          'shadow-sm hover:shadow-glow-md',
        ],
      },
      size: {
        sm: 'px-3 py-1.5 text-sm',
        md: 'px-5 py-2.5 text-sm',
        lg: 'px-6 py-3 text-base',
        xl: 'px-8 py-4 text-lg',
        icon: 'h-9 w-9 p-0',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  isLoading?: boolean;
  asChild?: boolean;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, isLoading, children, disabled, asChild, ...props }, ref) => {
    if (asChild && React.isValidElement(children)) {
      const child = children as React.ReactElement<React.HTMLAttributes<HTMLElement>>;
      return React.cloneElement(child, {
        ...props,
        className: cn(buttonVariants({ variant, size }), className, child.props.className),
      });
    }
    return (
      <button
        ref={ref}
        className={cn(buttonVariants({ variant, size }), className)}
        disabled={disabled || isLoading}
        {...props}
      >
        {isLoading && (
          <svg
            className="h-4 w-4 animate-spin"
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
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
            />
          </svg>
        )}
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';

export { Button, buttonVariants };
