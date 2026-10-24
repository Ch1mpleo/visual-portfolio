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
  source?: string
  deployment?: string
}
export interface ArchitectureNetwork {
  name: string
  note: string
  nodeIds: readonly string[]
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
  network?: ArchitectureNetwork
}
const obox = 'https://github.com/OboxSTEAM/OboxSTEAM.API/blob/main/'
const gp = 'https://github.com/Ch1mpleo/GraphPaper/blob/main/'
const mln = 'https://github.com/Ch1mpleo/MLN131-Visual/blob/main/'
const vnr = 'https://github.com/Ch1mpleo/VNR-Visual/blob/main/'

// Portfolio overviews, grounded in the source inspection of 2026-10-21.
// Parts represent responsibilities; deployment labels identify confirmed Compose projects.
export const projectArchitectures = {
  oboxsteam: {
    title: 'One front door. A connected core.',
    introduction: 'Nginx welcomes the traffic. Separate Compose projects keep the web, API and shared infrastructure connected over one private Docker network.',
    defaultNode: 'api', width: 1320, height: 980,
    network: { name: 'shared-network', note: 'Container traffic stays private · Only Nginx publishes public ports', nodeIds: ['proxy', 'web', 'api', 'data'] },
    nodes: [
      { id: 'clients', label: 'Browser + mobile', stack: 'Web workspace · Expo app', kind: 'clients', at: [150, 340], role: 'One learning platform, on any screen.', note: 'Browsers and the student app reach the platform through Nginx. Container IPs and internal service ports stay behind the proxy.', tools: ['React / TypeScript', 'Expo / React Native'], source: 'https://github.com/OboxSTEAM/OboxSTEAM.FE/blob/main/package.json' },
      { id: 'proxy', label: 'Public entry', stack: 'Nginx reverse proxy', kind: 'switch', at: [480, 340], deployment: 'Infrastructure compose', role: 'One public entry. Private services behind it.', note: 'Nginx and PostgreSQL run as separate containers in the infrastructure Compose project. Nginx forwards public requests to the frontend and API over shared-network.', tools: ['Nginx', 'Docker Compose', 'shared-network'] },
      { id: 'web', label: 'Web workspace', stack: 'Next.js · React', kind: 'terminal', at: [810, 180], deployment: 'Frontend compose', role: 'Give the platform a place on the web.', note: 'The frontend has its own Compose project and joins shared-network. Nginx reaches its container internally; the browser uses the public proxy for API requests.', tools: ['Next.js / React', 'TypeScript', 'Docker Compose'], source: 'https://github.com/OboxSTEAM/OboxSTEAM.FE/blob/main/package.json' },
      { id: 'api', label: 'Shared backend', stack: 'ASP.NET Core · SignalR', kind: 'server', at: [810, 510], deployment: 'Backend compose', role: 'Keep the learning experience connected.', note: 'The backend Compose project joins shared-network with no public API port. Application rules, realtime updates and in-process background jobs share the .NET host.', tools: ['.NET 8 / JWT', 'SignalR', 'BackgroundService', 'Docker Compose'], source: obox + 'OboxSteam.API/Architecture/IocContainer.cs' },
      { id: 'data', label: 'Learning records', stack: 'PostgreSQL · EF Core', kind: 'database', at: [1140, 510], deployment: 'Infrastructure compose', role: 'A lasting record, kept inside the network.', note: 'PostgreSQL belongs to the shared infrastructure Compose project. The API persists learning records over shared-network through EF Core and Npgsql, without a public database port.', tools: ['PostgreSQL', 'Entity Framework Core', 'Docker Compose'], source: obox + 'OboxSteam.API/Architecture/IocContainer.cs' },
      { id: 'media', label: 'Personal highlights', stack: 'AWS media · AI', kind: 'media', at: [1140, 830], role: 'Turn classroom footage into a personal story.', note: 'S3 holds the footage; managed video processing and strength matching help assemble highlights. Signed SNS callbacks report completion through Nginx.', tools: ['S3', 'MediaConvert / Rekognition', 'Bedrock'], source: obox + 'OboxSteam.Application/Services/MediaService.cs' },
    ],
    edges: [
      { from: 'clients', to: 'proxy', label: 'Public requests reach Nginx' },
      { from: 'proxy', to: 'web', label: 'Serve the web workspace over shared-network' },
      { from: 'proxy', to: 'api', label: 'Forward API requests over shared-network' },
      { from: 'api', to: 'data', label: 'Persist learning records over shared-network' },
      { from: 'api', to: 'media', label: 'Call AWS services for personal highlights' },
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
