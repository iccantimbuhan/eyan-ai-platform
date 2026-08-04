import { Link } from '@tanstack/react-router'
import { ArrowLeft } from 'lucide-react'

type BackButtonProps = {
  to: string
  label?: string
}

export function BackButton({ to, label = 'Back' }: BackButtonProps) {
  return (
    <Link
      to={to}
      className='inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground'
    >
      <ArrowLeft className='size-4' />
      {label}
    </Link>
  )
}
