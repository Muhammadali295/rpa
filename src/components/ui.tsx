import type { ButtonHTMLAttributes, ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'subtle'
  icon?: LucideIcon
}

export function Button({
  children,
  className = '',
  icon: Icon,
  variant = 'primary',
  ...props
}: ButtonProps) {
  return (
    <button className={`button button--${variant} ${className}`} {...props}>
      {Icon && <Icon aria-hidden="true" size={17} />}
      {children}
    </button>
  )
}

export function Card({
  children,
  className = '',
}: {
  children: ReactNode
  className?: string
}) {
  return <section className={`card ${className}`}>{children}</section>
}

export function PageHeader({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow: string
  title: string
  description: string
  action?: ReactNode
}) {
  return (
    <div className="page-header">
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
        <p className="page-description">{description}</p>
      </div>
      {action && <div className="page-header__action">{action}</div>}
    </div>
  )
}

type StatusTone = 'success' | 'warning' | 'danger' | 'neutral' | 'teal'

export function StatusBadge({
  children,
  tone = 'neutral',
}: {
  children: ReactNode
  tone?: StatusTone
}) {
  return <span className={`status-badge status-badge--${tone}`}>{children}</span>
}

export function Alert({
  children,
  title,
  icon: Icon,
  tone = 'info',
}: {
  children: ReactNode
  title: string
  icon: LucideIcon
  tone?: 'info' | 'warning'
}) {
  return (
    <div className={`alert alert--${tone}`} role="status">
      <Icon aria-hidden="true" size={19} />
      <div>
        <strong>{title}</strong>
        <p>{children}</p>
      </div>
    </div>
  )
}

export function LoadingIndicator({ label = 'Loading' }: { label?: string }) {
  return (
    <span className="loading-indicator" role="status">
      <span className="loading-indicator__spinner" aria-hidden="true" />
      {label}
    </span>
  )
}

export function SectionHeading({
  title,
  detail,
  action,
}: {
  title: string
  detail?: string
  action?: ReactNode
}) {
  return (
    <div className="section-heading">
      <div>
        <h2>{title}</h2>
        {detail && <p>{detail}</p>}
      </div>
      {action}
    </div>
  )
}
