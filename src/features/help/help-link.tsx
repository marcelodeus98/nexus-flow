import { IconHelpCircle } from '@tabler/icons-react'
import { Link } from 'react-router-dom'
import './help-page.css'

// "Como funciona?": opens the help topic about the current screen.
export function HelpLink({ topic, label = 'Como funciona?' }: { topic: string; label?: string }) {
  return (
    <Link to={`/help/${topic}`} className="help-link">
      <IconHelpCircle size={16} aria-hidden />
      {label}
    </Link>
  )
}
