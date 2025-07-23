'use client';

import { forwardRef } from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const cardVariants = cva(
  'rounded-lg border bg-card text-card-foreground',
  {
    variants: {
      variant: {
        default: 'bg-white border-gray-200 shadow-sm',
        elevated: 'bg-white border-gray-200 shadow-lg',
        outline: 'border-2 border-gray-200 bg-transparent',
        ghost: 'border-0 shadow-none bg-transparent',
        gradient: 'bg-gradient-to-r from-blue-500 to-purple-600 text-white border-0'
      },
      size: {
        sm: 'p-3',
        default: 'p-6',
        lg: 'p-8'
      },
      interactive: {
        true: 'cursor-pointer transition-all hover:shadow-md hover:-translate-y-0.5',
        false: ''
      }
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
      interactive: false
    }
  }
)

export interface AdminCardProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof cardVariants> {
  children: React.ReactNode
}

const AdminCard = forwardRef<HTMLDivElement, AdminCardProps>(
  ({ className, variant, size, interactive, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(cardVariants({ variant, size, interactive, className }))}
        {...props}
      >
        {children}
      </div>
    )
  }
)

AdminCard.displayName = 'AdminCard'

// Sub-components
const AdminCardHeader = forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn('flex flex-col space-y-1.5 pb-4', className)}
    {...props}
  />
))
AdminCardHeader.displayName = 'AdminCardHeader'

const AdminCardTitle = forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, children, ...props }, ref) => (
  <h3
    ref={ref}
    className={cn('text-lg font-semibold leading-none tracking-tight', className)}
    {...props}
  >
    {children}
  </h3>
))
AdminCardTitle.displayName = 'AdminCardTitle'

const AdminCardDescription = forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn('text-sm text-muted-foreground', className)}
    {...props}
  />
))
AdminCardDescription.displayName = 'AdminCardDescription'

const AdminCardContent = forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn('', className)} {...props} />
))
AdminCardContent.displayName = 'AdminCardContent'

const AdminCardFooter = forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn('flex items-center pt-4', className)}
    {...props}
  />
))
AdminCardFooter.displayName = 'AdminCardFooter'

export default AdminCard
export {
  AdminCardHeader,
  AdminCardTitle,
  AdminCardDescription,
  AdminCardContent,
  AdminCardFooter
}