import type { OboxChapterId } from './oboxChapters'

export interface ArchitectureNode {
  id: string
  label: string
  role: string
  note: string
  tools: readonly string[]
  powers: readonly OboxChapterId[]
  links: readonly string[]
}

export interface Architecture {
  title: string
  introduction: string
  defaultNode: string
  layers: readonly {
    id: string
    label: string
    // Connectors are drawn from multi-node layers toward the single API layer.
    connect: 'down' | 'up' | 'none'
    nodes: readonly ArchitectureNode[]
  }[]
  // A frame drawn around the backend layers.
  frame: ArchitectureNode & { wraps: readonly string[] }
}

export const oboxArchitecture: Architecture = {
  title: 'How it fits together.',
  introduction: 'Two clients, one API. Every learning record goes through the same rules, and no client talks to the database directly.',
  defaultNode: 'api',
  layers: [
    {
      id: 'clients', label: 'Clients', connect: 'down',
      nodes: [
        {
          id: 'web', label: 'Web app', role: 'Author curricula, run classes, and build portfolios.',
          note: 'The curriculum workspace, expert review threads, and portfolio builder. Editing a draft and importing a reel stay separate from making a portfolio public.',
          tools: ['Next.js / React / TypeScript', 'Tailwind CSS / shadcn/ui', 'Redux Toolkit', 'React Hook Form / Zod', 'Tiptap'],
          powers: ['curriculum', 'learning', 'portfolio'], links: ['api'],
        },
        {
          id: 'mobile', label: 'Mobile app', role: 'Bring sessions, attendance, and progress into the student’s hand.',
          note: 'Students scan a short-lived session QR to check in. Sessions, attendance, and notifications follow them between classes.',
          tools: ['Expo / React Native', 'Expo Router', 'NativeWind / Reanimated', 'Expo Camera / SecureStore'],
          powers: ['learning'], links: ['api'],
        },
      ],
    },
    {
      id: 'core', label: 'Core', connect: 'none',
      nodes: [
        {
          id: 'api', label: 'API', role: 'Own the learning records, permissions, and shared business rules.',
          note: 'Application services and domain rules keep curricula consistent, confirm enrollments, and validate check-ins. Permissions tie authoring, review, and publication to the right roles. Notifications are saved before realtime delivery.',
          tools: ['.NET 8 / ASP.NET Core', 'Entity Framework Core', 'JWT / refresh tokens', 'SignalR'],
          powers: ['curriculum', 'learning', 'portfolio'], links: ['web', 'mobile', 'data', 'media', 'services'],
        },
      ],
    },
    {
      id: 'backing', label: 'Backing services', connect: 'up',
      nodes: [
        {
          id: 'data', label: 'Data', role: 'Keep a learning record that outlives any single class.',
          note: 'Evidence and assessments contribute to skill profiles. A published portfolio is a snapshot; it never replaces the underlying learning records.',
          tools: ['PostgreSQL / Npgsql'],
          powers: ['learning', 'portfolio'], links: ['api'],
        },
        {
          id: 'media', label: 'Media & AI', role: 'Turn class footage into personal highlights.',
          note: 'Object storage holds the footage; processing provides face and label signals. Face associations are conditional, and background work produces each personal reel.',
          tools: ['AWS S3', 'AWS MediaConvert', 'AWS Rekognition', 'AWS Bedrock', 'AWS SNS'],
          powers: ['portfolio'], links: ['api'],
        },
        {
          id: 'services', label: 'Connected services', role: 'Support enrollment, live classes, messages, and certificates.',
          note: 'Payment callbacks confirm paid enrollments, meeting access supports live sessions, email carries messages, and program-completion certificates are generated separately.',
          tools: ['Stripe — payments', '8x8 JaaS — live sessions', 'Resend — email', 'QuestPDF — certificates'],
          powers: ['learning', 'portfolio'], links: ['api'],
        },
      ],
    },
  ],
  frame: {
    id: 'delivery', label: 'Delivery & observability', role: 'Ship the backend and see what it is doing.',
    note: 'The backend ships as a container through CI to a VPS. Tracing follows requests, scheduled tasks, and media jobs.',
    tools: ['Docker / Docker Compose', 'Docker Hub / GitHub Actions', 'VPS deployment', 'OpenTelemetry / Traceway'],
    powers: [], links: ['api', 'data', 'media', 'services'], wraps: ['core', 'backing'],
  },
}
