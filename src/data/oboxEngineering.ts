import type { OboxChapterId } from './oboxChapters'

export interface OboxEngineeringChapter {
  id: OboxChapterId
  parts: readonly { id: string; label: string; title: string; caption: string }[]
}

// Implementation detail lives in oboxArchitecture.ts; these beats tell the product story.
export const oboxEngineering: readonly OboxEngineeringChapter[] = [
  {
    id: 'curriculum',
    parts: [
      { id: 'blueprint', label: 'Program blueprint', title: 'Structure before delivery.', caption: 'A curriculum starts as a blueprint: modules, courses, activities, and the rubrics that hold them together.' },
      { id: 'review', label: 'Expert review', title: 'Make room for another perspective.', caption: 'Experts review the work in context. Feedback and revisions travel with the curriculum, all the way to approval.' },
      { id: 'release', label: 'Approved program', title: 'Ready to become a class.', caption: 'A published curriculum becomes the shared foundation for the learning experience that follows.' },
    ],
  },
  {
    id: 'learning',
    parts: [
      { id: 'class', label: 'Connected class', title: 'A place to put learning into practice.', caption: 'Schedules, mentors, and activities connect the curriculum to self-paced, live online, and offline classes.' },
      { id: 'activity', label: 'Session & activity', title: 'A small action. A lasting record.', caption: 'Scan a session QR on mobile. The API checks the session and enrollment before recording attendance.' },
      { id: 'evidence', label: 'Learning evidence', title: 'Progress with something to show.', caption: 'Assignments, assessments, and evidence build a learning record that follows the student beyond a single class.' },
    ],
  },
  {
    id: 'portfolio',
    parts: [
      { id: 'media', label: 'Personal highlights', title: 'Find the moments that matter.', caption: 'Learning footage becomes a personal reel, with video analysis and AI helping select moments around a student’s strengths.' },
      { id: 'draft', label: 'Portfolio draft', title: 'A story with its own author.', caption: 'Students arrange sections, choose a theme, and bring evidence and completed highlights into their portfolio draft.' },
      { id: 'publish', label: 'Published story', title: 'From personal work to a public story.', caption: 'Publishing creates a portfolio snapshot on a student microsite. The student’s learning records remain the foundation.' },
    ],
  },
]
