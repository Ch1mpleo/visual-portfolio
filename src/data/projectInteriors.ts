export type GraphStageId = 'document' | 'chunks' | 'entities' | 'graph'
export const graphStages = [
  { id: 'document', label: 'Document', title: 'It starts with a paper.', description: 'The research paper is the source. An upload interface and document model provide the starting point.', detail: 'Complete text extraction remains part of the intended pipeline.' },
  { id: 'chunks', label: 'Passages', title: 'Give meaning a smaller canvas.', description: 'Passages break a document into smaller pieces. Embeddings represent their meaning numerically.', detail: 'Chunk models and an embedding service exist. Connecting document extraction to this stage remains intended work.' },
  { id: 'entities', label: 'Connections', title: 'Ideas begin to find each other.', description: 'Concepts, methods, and findings can become entities, linked by relationships that give each idea context.', detail: 'Entity and relationship data models provide the foundation. Complete extraction and graph-building orchestration remain intended work.' },
  { id: 'graph', label: 'Exploration', title: 'Follow an idea beyond the page.', description: 'A graph interface offers a way to navigate connected ideas. This scene illustrates that direction.', detail: 'Graph-viewing interface code is present. The illustrated nodes are conceptual; a complete pipeline and grounded answers remain intended work.' },
] as const

export type MuseumLayerId = 'content' | 'visual' | 'interaction'
export const museumLayers = [
  { id: 'content', label: 'Content structure', description: 'Concepts, periods, and chapters organize the subject. Navigation gives the reader a route through the exhibit instead of presenting an unbroken wall of text.' },
  { id: 'visual', label: 'Visual language', description: 'Monumental typography, editorial composition, and a restrained paper, red, and ink palette give each chapter its own visual rhythm. Archival-style frames support the story without overwhelming its text.' },
  { id: 'interaction', label: 'Interaction', description: 'Scroll reveals, timelines, text treatments, and transitions guide attention as the reader moves through the content. The interaction supports the narrative and its chapter structure.' },
] as const
