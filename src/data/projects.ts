export type ProjectId = 'oboxsteam' | 'graphpaper' | 'museums'
export type ProjectTab = 'experience' | 'under-the-hood'

export type ProjectLink = { label: string; href: string }

export type Project = {
  id: ProjectId
  index: string
  title: string
  category: string
  summary: string
  contribution: string
  stack: readonly string[]
  links: readonly ProjectLink[]
  artworkDescription: string
}

export const projects = [
  {
    id: 'oboxsteam',
    index: '01',
    title: 'OboxSTEAM',
    category: 'Capstone',
    summary: 'One learning platform across web, API, and mobile.',
    contribution: 'Built across API, web, and mobile',
    stack: ['.NET', 'PostgreSQL', 'Next.js', 'Expo'],
    links: [
      { label: 'Visit website', href: 'https://oboxsteam.website/' },
      { label: 'API', href: 'https://github.com/OboxSTEAM/OboxSTEAM.API' },
      { label: 'Web', href: 'https://github.com/OboxSTEAM/OboxSTEAM.FE' },
      { label: 'Mobile', href: 'https://github.com/OboxSTEAM/OboxSTEAM.Mobile' },
    ],
    artworkDescription: 'An illustrated web platform and mobile companion connected to one shared API and data layer.',
  },
  {
    id: 'graphpaper',
    index: '02',
    title: 'GraphPaper',
    category: 'Experiment',
    summary: 'Exploring how research papers become connected knowledge.',
    contribution: 'GraphRAG concept, interface, and backend foundations',
    stack: ['.NET', 'PostgreSQL', 'Next.js'],
    links: [
      { label: 'Backend', href: 'https://github.com/Ch1mpleo/GraphPaper' },
      { label: 'Frontend', href: 'https://github.com/Ch1mpleo/GraphPaper.FE' },
    ],
    artworkDescription: 'An illustrated research document opens into a small graph connecting concepts, methods, and findings.',
  },
  {
    id: 'museums',
    index: '03',
    title: 'Interactive Museums',
    category: 'Visual storytelling',
    summary: 'Coursework reimagined as interactive digital exhibits.',
    contribution: 'Content structure, visual design, and interactive web experiences',
    stack: ['React', 'TypeScript', 'GSAP', 'Motion'],
    links: [
      { label: 'MLN131 exhibit', href: 'https://ch1mpleo.github.io/MLN131-Visual/' },
      { label: 'MLN131 source', href: 'https://github.com/Ch1mpleo/MLN131-Visual' },
      { label: 'VNR202 exhibit', href: 'https://ch1mpleo.github.io/VNR-Visual/' },
      { label: 'VNR202 source', href: 'https://github.com/Ch1mpleo/VNR-Visual' },
    ],
    artworkDescription: 'Two overlapping editorial exhibits: MLN131 on democracy and VNR202 on Vietnam from 1945 to 1954.',
  },
] as const satisfies readonly Project[]
