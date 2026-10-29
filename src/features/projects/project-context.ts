import { useOutletContext } from 'react-router'
import type { Project } from './api'

// The project loaded by ProjectLayout, for pages under /p/:projectKey.
export function useCurrentProject(): Project {
  return useOutletContext<Project>()
}
