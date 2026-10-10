export type MuseumExhibitId = 'mln131' | 'vnr202'
export const museumExhibits = [
  {
    id: 'mln131', label: 'MLN131 — Democracy', title: 'Democracy, in perspective.',
    description: 'Visual explanations of democracy and its historical development, arranged as an editorial exhibit to explore through concepts and chapters.',
    links: [
      { label: 'Visit exhibit', href: 'https://ch1mpleo.github.io/MLN131-Visual/' },
      { label: 'Source', href: 'https://github.com/Ch1mpleo/MLN131-Visual' },
    ],
  },
  {
    id: 'vnr202', label: 'VNR202 — Vietnam, 1945–1954', title: 'A decade, in motion.',
    description: 'A scroll-driven historical exhibit covering Vietnam from 1945 to 1954, using chapters, timelines, and visual transitions to guide the story.',
    links: [
      { label: 'Visit exhibit', href: 'https://ch1mpleo.github.io/VNR-Visual/' },
      { label: 'Source', href: 'https://github.com/Ch1mpleo/VNR-Visual' },
    ],
  },
] as const
