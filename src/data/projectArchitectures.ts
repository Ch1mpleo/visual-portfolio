import type { ProjectId } from './projects'

export type InfrastructureKind = 'terminal' | 'phone' | 'server' | 'database' | 'worker' | 'storage' | 'media' | 'compute' | 'switch' | 'delivery' | 'scope' | 'book' | 'projector' | 'clients'
export interface ArchitectureNode {
  id: string
  label: string
  stack: string
  kind: InfrastructureKind
  at: readonly [number, number]
  role: string
  note: string
  tools: readonly string[]
  source: string
}
export interface ArchitectureEdge { from: string; to: string; label: string }
export interface Architecture {
  title: string
  introduction: string
  defaultNode: string
  width: number
  height: number
  nodes: readonly ArchitectureNode[]
  edges: readonly ArchitectureEdge[]
}
const obox = 'https://github.com/OboxSTEAM/OboxSTEAM.API/blob/main/'
const gp = 'https://github.com/Ch1mpleo/GraphPaper/blob/main/'
const mln = 'https://github.com/Ch1mpleo/MLN131-Visual/blob/main/'
const vnr = 'https://github.com/Ch1mpleo/VNR-Visual/blob/main/'

// Portfolio overviews, grounded in the source inspection of 2026-10-21.
// A part represents a responsibility, not a separate deployed service.
export const projectArchitectures = {
  oboxsteam: {
    title: 'A shared core. Two ways in.',
    introduction: 'Web and mobile meet one backend, with learning records and personal media behind it.',
    defaultNode: 'api', width: 1100, height: 590,
    nodes: [
      { id: 'clients', label: 'Web + mobile', stack: 'Next.js · Expo', kind: 'clients', at: [175, 285], role: 'One learning platform, on any screen.', note: 'The web workspace and student app use the same authenticated API.', tools: ['React / TypeScript', 'Next.js', 'Expo / React Native'], source: 'https://github.com/OboxSTEAM/OboxSTEAM.FE/blob/main/package.json' },
      { id: 'api', label: 'Shared backend', stack: 'ASP.NET Core · SignalR', kind: 'server', at: [520, 285], role: 'Keep the learning experience connected.', note: 'Application rules, realtime updates and in-process background jobs share the .NET host. Docker ships it to the VPS.', tools: ['.NET 8 / JWT', 'SignalR', 'BackgroundService', 'Docker'], source: obox + 'OboxSteam.API/Architecture/IocContainer.cs' },
      { id: 'data', label: 'Learning records', stack: 'PostgreSQL · EF Core', kind: 'database', at: [900, 165], role: 'A lasting record of student progress.', note: 'Curricula, assessments and published portfolio snapshots are persisted through EF Core and Npgsql.', tools: ['PostgreSQL', 'Entity Framework Core'], source: obox + 'OboxSteam.API/Architecture/IocContainer.cs' },
      { id: 'media', label: 'Personal highlights', stack: 'AWS media · AI', kind: 'media', at: [900, 410], role: 'Turn classroom footage into a personal story.', note: 'S3 holds the footage; managed video processing and strength matching help assemble highlights. Signed SNS callbacks report completion.', tools: ['S3', 'MediaConvert / Rekognition', 'Bedrock'], source: obox + 'OboxSteam.Application/Services/MediaService.cs' },
    ],
    edges: [
      { from: 'clients', to: 'api', label: 'Authenticated requests' },
      { from: 'api', to: 'data', label: 'Save learning progress' },
      { from: 'api', to: 'media', label: 'Create personal highlights' },
    ],
  },
  graphpaper: {
    title: 'From papers to connected ideas.',
    introduction: 'A short path from source documents to a knowledge graph you can explore.',
    defaultNode: 'analysis', width: 1100, height: 440,
    nodes: [
      { id: 'documents', label: 'Source papers', stack: 'PDF · DOCX', kind: 'book', at: [145, 210], role: 'Start with the material that matters.', note: 'Docling and OpenXML turn uploaded documents into passages ready for analysis.', tools: ['Docling', 'OpenXML'], source: gp + 'GraphPaper.Application/Services/DocumentProcessingService.cs' },
      { id: 'analysis', label: 'Find the connections', stack: '.NET · Gemini · Ollama', kind: 'compute', at: [415, 210], role: 'Extract ideas and the links between them.', note: 'The API coordinates chunking, Gemini embeddings, two-pass Ollama extraction and relationship enrichment.', tools: ['ASP.NET Core', 'Gemini embeddings', 'Ollama'], source: gp + 'GraphPaper.API/Architecture/IOCContainer.cs' },
      { id: 'knowledge', label: 'Knowledge store', stack: 'PostgreSQL · pgvector', kind: 'database', at: [685, 210], role: 'Keep the source and its connections together.', note: 'Passages, vectors, entities and relationships persist behind the API.', tools: ['PostgreSQL', 'pgvector / EF Core'], source: gp + 'docker-compose.yml' },
      { id: 'workspace', label: 'Research canvas', stack: 'Next.js · Mermaid', kind: 'terminal', at: [955, 210], role: 'Explore a paper as a map of ideas.', note: 'The browser renders the API-generated mindmap with Mermaid. Grounded answers remain an intended extension.', tools: ['Next.js / React', 'TypeScript', 'Mermaid'], source: 'https://github.com/Ch1mpleo/GraphPaper.FE/blob/main/package.json' },
    ],
    edges: [
      { from: 'documents', to: 'analysis', label: 'Parse and extract' },
      { from: 'analysis', to: 'knowledge', label: 'Save connected knowledge' },
      { from: 'knowledge', to: 'workspace', label: 'Explore through the API' },
    ],
  },
  museums: {
    title: 'One visual language. Two exhibits.',
    introduction: 'Two independent browser experiences built around motion, discovery and play.',
    defaultNode: 'foundation', width: 1100, height: 590,
    nodes: [
      { id: 'foundation', label: 'Shared foundation', stack: 'React · Vite · GSAP', kind: 'projector', at: [550, 165], role: 'Make the subject feel alive.', note: 'Both exhibits use TypeScript, Tailwind and scroll-led animation. This is a shared frontend approach, not a shared backend.', tools: ['React / TypeScript', 'Vite / Tailwind', 'GSAP / ScrollTrigger', 'Motion'], source: mln + 'package.json' },
      { id: 'democracy', label: 'Democracy, explored', stack: 'MLN131 · Gemini', kind: 'book', at: [270, 410], role: 'A timeline you can question.', note: 'Scroll through the exhibit, then try the classifier. Its browser hook calls Gemini when configured.', tools: ['Interactive timeline', 'Gemini classifier'], source: mln + 'src/hooks/useGeminiClassifier.ts' },
      { id: 'history', label: 'History, played', stack: 'VNR202 · React', kind: 'phone', at: [830, 410], role: 'Learn by making connections.', note: 'A local history-matching game uses React browser state and curated pairs.', tools: ['Scroll chapters', 'History matching game'], source: vnr + 'src/App.tsx' },
    ],
    edges: [
      { from: 'foundation', to: 'democracy', label: 'Scroll and discover' },
      { from: 'foundation', to: 'history', label: 'Explore and play' },
    ],
  },
} as const satisfies Record<ProjectId, Architecture>
