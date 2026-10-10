export type GraphStageId = 'document' | 'chunks' | 'entities' | 'graph'
export const graphStages = [
  { id: 'document', label: 'Document', title: 'Start with a research paper', description: 'A document is the source material. The upload interface and document model are present; complete text extraction belongs to the intended pipeline.' },
  { id: 'chunks', label: 'Chunks and embeddings', title: 'Give passages a representation', description: 'Chunks organize smaller passages, while embeddings represent their meaning numerically. Chunk models and an embedding service are present; connecting extraction to this stage remains part of the intended pipeline.' },
  { id: 'entities', label: 'Entities and relationships', title: 'Describe the connections', description: 'Concepts, methods, and findings can become entities linked by relationships. The data models provide a foundation; complete extraction and graph-building orchestration remain intended work.' },
  { id: 'graph', label: 'Graph exploration', title: 'Explore ideas in context', description: 'The graph interface offers a way to navigate connected ideas. The nodes shown here are an illustrated concept; grounded answers and a complete processing pipeline are not presented as working features.' },
] as const

export type MuseumLayerId = 'content' | 'visual' | 'interaction'
export const museumLayers = [
  { id: 'content', label: 'Content structure', description: 'Concepts, periods, and chapters organize the subject. Navigation gives the reader a route through the exhibit instead of presenting an unbroken wall of text.' },
  { id: 'visual', label: 'Visual language', description: 'Monumental typography, editorial composition, and a restrained paper, red, and ink palette give each chapter its own visual rhythm. Archival-style frames support the story without overwhelming its text.' },
  { id: 'interaction', label: 'Interaction', description: 'Scroll reveals, timelines, text treatments, and transitions guide attention as the reader moves through the content. The interaction supports the narrative and its chapter structure.' },
] as const
