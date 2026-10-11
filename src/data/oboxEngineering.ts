import type { OboxChapterId } from './oboxChapters'

export interface OboxEngineeringChapter {
  id: OboxChapterId
  caption: string
  parts: readonly { id: string; label: string; title: string; text: string }[]
}

export const oboxEngineering: readonly OboxEngineeringChapter[] = [
  {
    id: 'curriculum',
    caption: 'Author → Review → Publish',
    parts: [
      { id: 'blueprint', label: 'Program blueprint', title: 'Structure before delivery.', text: 'Programs organize modules, courses, activities, and rubrics. The web workspace edits the curriculum; application services and domain rules keep its structure consistent.' },
      { id: 'review', label: 'Expert review', title: 'Feedback belongs to the curriculum.', text: 'Expert discussions connect comments, mentions, and attachments to the work being reviewed. Change history and approval stages carry the draft toward publication.' },
      { id: 'release', label: 'Approved program', title: 'A shared foundation for classes.', text: 'An approved, published curriculum provides the structure used in the learning workspace. Permissions keep authoring, expert review, and publication tied to the right roles.' },
    ],
  },
  {
    id: 'learning',
    caption: 'Class → Activity → Evidence',
    parts: [
      { id: 'class', label: 'Connected class', title: 'One program, different ways to learn.', text: 'Classes connect schedules, mentors, and learning activities across self-paced, live online, and offline delivery. Payment callbacks confirm paid enrollments; meeting access supports live sessions.' },
      { id: 'activity', label: 'Session & activity', title: 'Small actions become durable records.', text: 'Students scan a short-lived session QR on mobile. The API validates the session and enrollment before saving attendance. Assessments and evidence submissions have their own learning workflows.' },
      { id: 'evidence', label: 'Learning evidence', title: 'Progress with something to show.', text: 'Assignments, assessments, and supported evidence contribute to the learning record and skill profiles. Notifications are saved before realtime delivery, keeping the inbox durable for students, mentors, and parents.' },
    ],
  },
  {
    id: 'portfolio',
    caption: 'Evidence → Personal reel → Portfolio',
    parts: [
      { id: 'media', label: 'Personal highlights', title: 'Find the moments that matter.', text: 'Object storage holds the footage; video processing and analysis provide face and label signals. AI helps select segments against a student’s strengths. Face associations are conditional; background work produces the personal reel.' },
      { id: 'draft', label: 'Portfolio draft', title: 'Evidence, arranged by its owner.', text: 'The web builder combines editable sections, themes, supported evidence, and completed highlights in a portfolio draft. Editing a draft and importing a reel are separate from making a portfolio public.' },
      { id: 'publish', label: 'Published story', title: 'Publication is a deliberate step.', text: 'Publishing creates a public portfolio snapshot served through a student microsite. Program-completion certificates are generated separately: a portfolio presentation never replaces the underlying learning records.' },
    ],
  },
]
