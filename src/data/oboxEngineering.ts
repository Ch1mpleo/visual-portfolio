import type { OboxChapterId } from './oboxChapters'

export interface OboxEngineeringChapter {
  id: OboxChapterId
  caption: string
  parts: readonly { id: string; label: string; title: string; caption: string; text: string }[]
}

export const oboxEngineering: readonly OboxEngineeringChapter[] = [
  {
    id: 'curriculum',
    caption: 'Author → Review → Publish',
    parts: [
      { id: 'blueprint', label: 'Program blueprint', title: 'Structure before delivery.', caption: 'A curriculum starts as a blueprint: modules, courses, activities, and the rubrics that hold them together.', text: 'The web workspace edits the curriculum; application services and domain rules keep its structure consistent.' },
      { id: 'review', label: 'Expert review', title: 'Make room for another perspective.', caption: 'Experts review the work in context. Feedback and revisions travel with the curriculum, all the way to approval.', text: 'Expert discussions connect comments, mentions, and attachments to the work being reviewed. Change history and approval stages carry the draft toward publication.' },
      { id: 'release', label: 'Approved program', title: 'Ready to become a class.', caption: 'A published curriculum becomes the shared foundation for the learning experience that follows.', text: 'Permissions keep authoring, expert review, and publication tied to the right roles. Classes use the approved program structure in the learning workspace.' },
    ],
  },
  {
    id: 'learning',
    caption: 'Class → Activity → Evidence',
    parts: [
      { id: 'class', label: 'Connected class', title: 'A place to put learning into practice.', caption: 'Schedules, mentors, and activities connect the curriculum to self-paced, live online, and offline classes.', text: 'Payment callbacks confirm paid enrollments; meeting access supports live sessions.' },
      { id: 'activity', label: 'Session & activity', title: 'A small action. A lasting record.', caption: 'Scan a session QR on mobile. The API checks the session and enrollment before recording attendance.', text: 'Session codes are short-lived. Assessments and evidence submissions have their own learning workflows, separate from attendance.' },
      { id: 'evidence', label: 'Learning evidence', title: 'Progress with something to show.', caption: 'Assignments, assessments, and evidence build a learning record that follows the student beyond a single class.', text: 'Supported evidence contributes to skill profiles. Notifications are saved before realtime delivery, keeping the inbox durable for students, mentors, and parents.' },
    ],
  },
  {
    id: 'portfolio',
    caption: 'Evidence → Personal reel → Portfolio',
    parts: [
      { id: 'media', label: 'Personal highlights', title: 'Find the moments that matter.', caption: 'Learning footage becomes a personal reel, with video analysis and AI helping select moments around a student’s strengths.', text: 'Object storage holds the footage; processing provides face and label signals. Face associations are conditional, and background work produces the reel.' },
      { id: 'draft', label: 'Portfolio draft', title: 'A story with its own author.', caption: 'Students arrange sections, choose a theme, and bring evidence and completed highlights into their portfolio draft.', text: 'Editing a draft and importing a reel are separate from making a portfolio public.' },
      { id: 'publish', label: 'Published story', title: 'From personal work to a public story.', caption: 'Publishing creates a portfolio snapshot on a student microsite. The student’s learning records remain the foundation.', text: 'Program-completion certificates are generated separately. A portfolio presentation never replaces the underlying learning records.' },
    ],
  },
]
