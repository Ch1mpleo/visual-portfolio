import type { ProjectId } from './projects'

export interface ProjectStack {
  introduction: string
  note?: string
  groups: readonly {
    label: string
    purpose: string
    tools: readonly string[]
  }[]
}

// All project technology names live here; the other views explain the product
// and its architecture without repeating the inventory.
export const projectStacks = {
  oboxsteam: {
    introduction: 'Three connected applications, with shared services for learning, media, and delivery.',
    groups: [
      {
        label: 'Web', purpose: 'Author curricula, manage learning, and build student portfolios.',
        tools: ['Next.js / React / TypeScript', 'Tailwind CSS / shadcn/ui', 'Redux Toolkit', 'React Hook Form / Zod', 'Tiptap'],
      },
      {
        label: 'Mobile', purpose: 'Bring sessions, attendance, and learning progress into the student’s hand.',
        tools: ['Expo / React Native', 'Expo Router', 'NativeWind / Reanimated', 'Expo Camera / SecureStore'],
      },
      {
        label: 'API & data', purpose: 'Own the learning records, permissions, and shared business rules.',
        tools: ['.NET 8 / ASP.NET Core', 'Entity Framework Core', 'PostgreSQL / Npgsql', 'JWT / refresh tokens', 'SignalR'],
      },
      {
        label: 'Media & AI', purpose: 'Store evidence and turn footage into personal learning highlights.',
        tools: ['AWS S3', 'AWS MediaConvert', 'AWS Rekognition', 'AWS Bedrock', 'AWS SNS'],
      },
      {
        label: 'Connected services', purpose: 'Support enrollment, live classes, messages, and certificates.',
        tools: ['Stripe — payments', '8x8 JaaS — live sessions', 'Resend — email', 'QuestPDF — certificates'],
      },
      {
        label: 'Delivery & observability', purpose: 'Build, deploy, and follow requests through the backend.',
        tools: ['Docker / Docker Compose', 'Docker Hub / GitHub Actions', 'VPS deployment', 'OpenTelemetry / Traceway'],
      },
    ],
  },
  graphpaper: {
    introduction: 'A research interface backed by document models, vector storage, and an embedding-service foundation.',
    note: 'This stack describes the inspected foundations. Complete extraction, graph-building orchestration, and grounded answers remain the intended direction.',
    groups: [
      {
        label: 'Research interface', purpose: 'Upload documents and explore the graph-viewing interface.',
        tools: ['Next.js / React / TypeScript', 'Tailwind CSS / Radix UI', 'Mermaid'],
      },
      {
        label: 'API & models', purpose: 'Model documents, chunks, entities, relationships, and citations.',
        tools: ['.NET 8 / ASP.NET Core', 'Entity Framework Core', 'Swagger / Swashbuckle'],
      },
      {
        label: 'Storage & embeddings', purpose: 'Provide the vector-data and text-embedding building blocks.',
        tools: ['PostgreSQL / Npgsql', 'pgvector', 'Gemini embedding service'],
      },
    ],
  },
  museums: {
    introduction: 'One shared web stack for two exhibits, each with its own editorial structure and visual rhythm.',
    groups: [
      {
        label: 'Interface & build', purpose: 'Compose the chapters and deliver each exhibit as a web experience.',
        tools: ['React', 'TypeScript', 'Vite'],
      },
      {
        label: 'Visual language', purpose: 'Shape the typography, responsive layouts, and editorial surfaces.',
        tools: ['Tailwind CSS'],
      },
      {
        label: 'Motion & interaction', purpose: 'Guide the reader with reveals, transitions, and interactive chapters.',
        tools: ['GSAP', 'Motion'],
      },
    ],
  },
} as const satisfies Record<ProjectId, ProjectStack>
