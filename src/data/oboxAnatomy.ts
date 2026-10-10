export type AnatomyId = 'web' | 'mobile' | 'api' | 'data' | 'media' | 'services'
export interface AnatomyItem {
  id: AnatomyId
  label: string
  purpose: string
  rationale: string
  connectionIds: readonly AnatomyId[]
}

export const oboxAnatomy: readonly AnatomyItem[] = [
  { id: 'web', label: 'Web platform', purpose: 'Next.js and React provide role-specific learning and management interfaces, with typed requests to the shared API.', rationale: 'Curriculum, checkout, assessments, and portfolio editing need a workspace built for deeper tasks.', connectionIds: ['api'] },
  { id: 'mobile', label: 'Mobile companion', purpose: 'Expo and React Native bring parent visibility, schedules, student check-in, and focused mentor tools to the phone.', rationale: 'The companion keeps everyday actions close at hand while sharing the same product rules as the web.', connectionIds: ['api'] },
  { id: 'api', label: 'Shared API', purpose: 'ASP.NET Core connects HTTP endpoints to application services, domain rules, and infrastructure adapters.', rationale: 'Identity, permissions, enrollment, attendance, and learning records need one consistent authority across both clients.', connectionIds: ['web', 'mobile', 'data', 'media', 'services'] },
  { id: 'data', label: 'Data and files', purpose: 'PostgreSQL and Entity Framework Core persist product records. S3 stores the media objects those records describe.', rationale: 'A learning record and its file have different lifecycles. Keeping them separate supports durable records and media processing.', connectionIds: ['api', 'media'] },
  { id: 'media', label: 'Media processing', purpose: 'MediaConvert processes video, Rekognition searches registered faces, and callbacks advance processing. A background worker assembles highlights.', rationale: 'Capture should not wait for every processing stage. The backend tracks progress and completed outputs for later use.', connectionIds: ['api', 'data'] },
  { id: 'services', label: 'Connected services', purpose: 'Stripe handles checkout, SignalR delivers real-time notifications, Resend sends email, and JaaS provides live-session access.', rationale: 'Adapters connect specialist services to product workflows while the API keeps ownership of product state.', connectionIds: ['api'] },
]
