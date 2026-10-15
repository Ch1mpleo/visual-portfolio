import type { ProjectId } from './projects'

export interface ArchitectureNode {
  id: string
  label: string
  role: string
  note: string
  tools: readonly string[]
  // Story chapters or stages this part supports.
  usedIn: readonly string[]
  links: readonly string[]
  // Planned but not built; drawn dashed and labelled.
  status?: 'intended'
}

export interface Architecture {
  title: string
  introduction: string
  defaultNode: string
  layers: readonly {
    id: string
    // Connectors are drawn from multi-node layers toward the single central layer.
    connect: 'down' | 'up' | 'none'
    nodes: readonly ArchitectureNode[]
  }[]
  // An optional frame drawn around some layers, selectable like a node.
  frame?: ArchitectureNode & { wraps: readonly string[] }
}

// Every project technology name lives here, placed where it runs in the system.
export const projectArchitectures = {
  oboxsteam: {
    title: 'How it fits together.',
    introduction: 'Two clients, one API. Every learning record goes through the same rules, and no client talks to the database directly.',
    defaultNode: 'api',
    layers: [
      {
        id: 'clients', connect: 'down',
        nodes: [
          {
            id: 'web', label: 'Web app', role: 'Author curricula, run classes, and build portfolios.',
            note: 'The curriculum workspace, expert review threads, and portfolio builder. Editing a draft and importing a reel stay separate from making a portfolio public.',
            tools: ['Next.js / React / TypeScript', 'Tailwind CSS / shadcn/ui', 'Redux Toolkit', 'React Hook Form / Zod', 'Tiptap'],
            usedIn: ['Create', 'Learn', 'Show'], links: ['api'],
          },
          {
            id: 'mobile', label: 'Mobile app', role: 'Bring sessions, attendance, and progress into the student’s hand.',
            note: 'Students scan a short-lived session QR to check in. Sessions, attendance, and notifications follow them between classes.',
            tools: ['Expo / React Native', 'Expo Router', 'NativeWind / Reanimated', 'Expo Camera / SecureStore'],
            usedIn: ['Learn'], links: ['api'],
          },
        ],
      },
      {
        id: 'core', connect: 'none',
        nodes: [
          {
            id: 'api', label: 'API', role: 'Own the learning records, permissions, and shared business rules.',
            note: 'Application services and domain rules keep curricula consistent, confirm enrollments, and validate check-ins. Permissions tie authoring, review, and publication to the right roles. Notifications are saved before realtime delivery.',
            tools: ['.NET 8 / ASP.NET Core', 'Entity Framework Core', 'JWT / refresh tokens', 'SignalR'],
            usedIn: ['Create', 'Learn', 'Show'], links: ['web', 'mobile', 'data', 'media', 'services'],
          },
        ],
      },
      {
        id: 'backing', connect: 'up',
        nodes: [
          {
            id: 'data', label: 'Data', role: 'Keep a learning record that outlives any single class.',
            note: 'Evidence and assessments contribute to skill profiles. A published portfolio is a snapshot; it never replaces the underlying learning records.',
            tools: ['PostgreSQL / Npgsql'],
            usedIn: ['Learn', 'Show'], links: ['api'],
          },
          {
            id: 'media', label: 'Media & AI', role: 'Turn class footage into personal highlights.',
            note: 'Object storage holds the footage; processing provides face and label signals. Face associations are conditional, and background work produces each personal reel.',
            tools: ['AWS S3', 'AWS MediaConvert', 'AWS Rekognition', 'AWS Bedrock', 'AWS SNS'],
            usedIn: ['Show'], links: ['api'],
          },
          {
            id: 'services', label: 'Connected services', role: 'Support enrollment, live classes, messages, and certificates.',
            note: 'Payment callbacks confirm paid enrollments, meeting access supports live sessions, email carries messages, and program-completion certificates are generated separately.',
            tools: ['Stripe — payments', '8x8 JaaS — live sessions', 'Resend — email', 'QuestPDF — certificates'],
            usedIn: ['Learn', 'Show'], links: ['api'],
          },
        ],
      },
    ],
    frame: {
      id: 'delivery', label: 'Delivery & observability', role: 'Ship the backend and see what it is doing.',
      note: 'The backend ships as a container through CI to a VPS. Tracing follows requests, scheduled tasks, and media jobs.',
      tools: ['Docker / Docker Compose', 'Docker Hub / GitHub Actions', 'VPS deployment', 'OpenTelemetry / Traceway'],
      usedIn: [], links: ['api', 'data', 'media', 'services'], wraps: ['core', 'backing'],
    },
  },
  graphpaper: {
    title: 'What exists, and what’s next.',
    introduction: 'A research interface over one API, with storage and embeddings in place. The pipeline that would connect them end to end is still the intended direction.',
    defaultNode: 'api',
    layers: [
      {
        id: 'clients', connect: 'down',
        nodes: [
          {
            id: 'interface', label: 'Research interface', role: 'Upload documents and explore the graph view.',
            note: 'Upload and graph-viewing screens are in place. The graph nodes shown in this story are illustrative.',
            tools: ['Next.js / React / TypeScript', 'Tailwind CSS / Radix UI', 'Mermaid'],
            usedIn: ['Document', 'Exploration'], links: ['api'],
          },
        ],
      },
      {
        id: 'core', connect: 'none',
        nodes: [
          {
            id: 'api', label: 'API & models', role: 'Model documents, chunks, entities, relationships, and citations.',
            note: 'Data models for every stage of the pipeline exist, ready for the extraction and graph-building work to fill them.',
            tools: ['.NET 8 / ASP.NET Core', 'Entity Framework Core', 'Swagger / Swashbuckle'],
            usedIn: ['Document', 'Passages', 'Connections', 'Exploration'], links: ['interface', 'storage', 'embeddings', 'pipeline'],
          },
        ],
      },
      {
        id: 'backing', connect: 'up',
        nodes: [
          {
            id: 'storage', label: 'Storage', role: 'Keep documents and their vectors side by side.',
            note: 'PostgreSQL holds the document models; pgvector provides vector storage for passage embeddings.',
            tools: ['PostgreSQL / Npgsql', 'pgvector'],
            usedIn: ['Passages', 'Connections'], links: ['api'],
          },
          {
            id: 'embeddings', label: 'Embeddings', role: 'Represent the meaning of each passage numerically.',
            note: 'An embedding service is in place. Connecting document extraction to it remains intended work.',
            tools: ['Gemini embedding service'],
            usedIn: ['Passages'], links: ['api'],
          },
          {
            id: 'pipeline', label: 'Extraction & graph building', role: 'Turn passages into entities, relationships, and grounded answers.',
            note: 'Complete text extraction, graph-building orchestration, and grounded answers are the intended direction, not yet built.',
            tools: [], status: 'intended',
            usedIn: ['Document', 'Connections', 'Exploration'], links: ['api'],
          },
        ],
      },
    ],
  },
  museums: {
    title: 'One stack, two exhibits.',
    introduction: 'Both exhibits share one web foundation, so each could spend its effort on its own editorial structure and visual rhythm.',
    defaultNode: 'interface',
    layers: [
      {
        id: 'exhibits', connect: 'down',
        nodes: [
          {
            id: 'mln131', label: 'MLN131 — Democracy', role: 'An editorial exhibit explored through concepts and chapters.',
            note: 'Visual explanations of democracy and its historical development, arranged as chapters to explore.',
            tools: [], usedIn: [], links: ['interface'],
          },
          {
            id: 'vnr202', label: 'VNR202 — Vietnam, 1945–1954', role: 'A scroll-driven history told through chapters and timelines.',
            note: 'A historical exhibit covering 1945 to 1954, using chapters, timelines, and visual transitions to guide the story.',
            tools: [], usedIn: [], links: ['interface'],
          },
        ],
      },
      {
        id: 'core', connect: 'none',
        nodes: [
          {
            id: 'interface', label: 'Interface & build', role: 'Compose the chapters and deliver each exhibit as a web experience.',
            note: 'Typed React components structure each exhibit’s chapters; Vite builds them into fast static sites.',
            tools: ['React', 'TypeScript', 'Vite'],
            usedIn: ['MLN131', 'VNR202'], links: ['mln131', 'vnr202', 'visual', 'motion'],
          },
        ],
      },
      {
        id: 'craft', connect: 'up',
        nodes: [
          {
            id: 'visual', label: 'Visual language', role: 'Shape the typography, responsive layouts, and editorial surfaces.',
            note: 'Utility styling keeps two very different editorial looks consistent across screen sizes.',
            tools: ['Tailwind CSS'],
            usedIn: ['MLN131', 'VNR202'], links: ['interface'],
          },
          {
            id: 'motion', label: 'Motion & interaction', role: 'Guide the reader with reveals, transitions, and interactive chapters.',
            note: 'Timeline-based animation drives the scroll-led reveals and chapter transitions.',
            tools: ['GSAP', 'Motion'],
            usedIn: ['MLN131', 'VNR202'], links: ['interface'],
          },
        ],
      },
    ],
  },
} as const satisfies Record<ProjectId, Architecture>
