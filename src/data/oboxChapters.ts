export type OboxChapterId = 'curriculum' | 'learning' | 'portfolio'

export const oboxChapters = [
  {
    id: 'curriculum', number: '01', label: 'Create', title: 'Build the curriculum.',
    summary: 'Structure programs into modules, courses, and activities. Collaborate with experts, resolve feedback, and approve the curriculum before publishing.',
    screenLabel: 'Curriculum workspace', image: 'curriculum-creation', width: 2516, height: 1476,
    alt: 'OboxSTEAM curriculum workspace with a program tree, expert feedback, and draft, approval, and publication stages.',
  },
  {
    id: 'learning', number: '02', label: 'Learn', title: 'Follow a learning path.',
    summary: 'Bring the curriculum into a class: study materials, join live or offline sessions, complete assessments, and collect evidence of developing skills.',
    screenLabel: 'Learning workspace', image: 'curriculum', width: 2526, height: 1472,
    alt: 'OboxSTEAM learning workspace with a module and activity path, class members, mentor information, and the current lesson.',
  },
  {
    id: 'portfolio', number: '03', label: 'Show', title: 'Make growth visible.',
    summary: 'Shape a personal portfolio from projects, skills, and learning evidence. Choose a visual theme, add completed highlights, and publish a student microsite.',
    screenLabel: 'Portfolio builder', image: 'portfolio', width: 2512, height: 1474,
    alt: 'OboxSTEAM portfolio builder with reorderable sections, theme selection, and an editable student portfolio preview.',
  },
] as const
