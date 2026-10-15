export type OboxChapterId = 'curriculum' | 'learning' | 'portfolio'

export const oboxChapters = [
  {
    id: 'curriculum', number: '01', label: 'Create', title: 'Build the curriculum.',
    summary: 'Structure a program, review it with experts, and publish it.',
    screenLabel: 'Curriculum workspace', image: 'curriculum-creation', width: 2516, height: 1476,
    alt: 'OboxSTEAM curriculum workspace with a program tree, expert feedback, and draft, approval, and publication stages.',
  },
  {
    id: 'learning', number: '02', label: 'Learn', title: 'Follow a learning path.',
    summary: 'Take the curriculum into a class, and keep a record of every step.',
    screenLabel: 'Learning workspace', image: 'curriculum', width: 2526, height: 1472,
    alt: 'OboxSTEAM learning workspace with a module and activity path, class members, mentor information, and the current lesson.',
  },
  {
    id: 'portfolio', number: '03', label: 'Show', title: 'Make growth visible.',
    summary: 'Turn learning evidence into a story a student can publish.',
    screenLabel: 'Portfolio builder', image: 'portfolio', width: 2512, height: 1474,
    alt: 'OboxSTEAM portfolio builder with reorderable sections, theme selection, and an editable student portfolio preview.',
  },
] as const
