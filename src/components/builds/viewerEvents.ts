import type { ProjectId } from '../../data/projects'

export const OPEN_PROJECT = 'open-project-viewer'
export type OpenProjectDetail = { projectId: ProjectId; trigger: HTMLButtonElement }

declare global {
  interface DocumentEventMap {
    'open-project-viewer': CustomEvent<OpenProjectDetail>
  }
}
