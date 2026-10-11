export type OboxChapterId = 'curriculum' | 'learning' | 'portfolio'

export const oboxChapters = [
  {
    id: 'curriculum', number: '01', label: 'Create', title: 'Build the curriculum.',
    summary: 'Structure programs into modules, courses, and activities. Collaborate with experts, resolve feedback, and approve the curriculum before publishing.',
    image: 'curriculum-creation', width: 2516, height: 1476,
    alt: 'OboxSTEAM curriculum workspace with a program tree, expert feedback, and draft, approval, and publication stages.',
    supporting: ['Program blueprints', 'Rubrics & activities', 'Expert review'],
    focuses: [{ id: 'structure', label: 'Program structure' }, { id: 'review', label: 'Expert feedback' }],
  },
  {
    id: 'learning', number: '02', label: 'Learn', title: 'Follow a learning path.',
    summary: 'Bring the curriculum into a class: study materials, join live or offline sessions, complete assessments, and collect evidence of developing skills.',
    image: 'curriculum', width: 2526, height: 1472,
    alt: 'OboxSTEAM learning workspace with a module and activity path, class members, mentor information, and the current lesson.',
    supporting: ['Live & offline classes', 'Assessments & evidence', 'Parent visibility'],
    focuses: [{ id: 'path', label: 'Learning path' }, { id: 'lesson', label: 'Lesson workspace' }],
  },
  {
    id: 'portfolio', number: '03', label: 'Show', title: 'Make growth visible.',
    summary: 'Shape a personal portfolio from projects, skills, and learning evidence. Choose a visual theme, add completed highlights, and publish a student microsite.',
    image: 'portfolio', width: 2512, height: 1474,
    alt: 'OboxSTEAM portfolio builder with reorderable sections, theme selection, and an editable student portfolio preview.',
    supporting: ['Personal highlights', 'Completion certificates', 'Published microsites'],
    focuses: [{ id: 'editor', label: 'Builder controls' }, { id: 'preview', label: 'Portfolio preview' }],
  },
] as const

export const oboxCoreStack = [
  { label: 'Web', tools: 'Next.js · React · TypeScript · Tailwind' },
  { label: 'Mobile', tools: 'Expo · React Native · NativeWind' },
  { label: 'API & data', tools: 'ASP.NET Core · EF Core · PostgreSQL' },
] as const
