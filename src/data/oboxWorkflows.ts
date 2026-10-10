export type WorkflowId = 'join' | 'check-in' | 'capture'
export type WorkflowNodeId = 'web' | 'mobile' | 'api' | 'stripe' | 'records' | 'notifications' | 'mentor' | 'credential' | 'storage' | 'processing' | 'highlights' | 'portfolio' | 'public'
export interface WorkflowStep {
  id: string
  title: string
  description: string
  highlightedNodeIds: readonly WorkflowNodeId[]
  highlightedEdgeIds: readonly string[]
}
export interface OboxWorkflow {
  id: WorkflowId
  title: string
  introduction: string
  takeaway: string
  notes: readonly string[]
  steps: readonly WorkflowStep[]
}

export const oboxWorkflows: readonly OboxWorkflow[] = [
  {
    id: 'join', title: 'Join a class', introduction: 'Follow a successful enrollment from class selection to a confirmed place.',
    takeaway: 'A checkout redirect is not the source of truth. The backend confirms the payment result.',
    notes: ['This is the successful path. Failed or expired attempts release their pending state. Checkout remains on the web.'],
    steps: [
      { id: 'choose', title: 'Choose a class', description: 'A learner browses a program on the web and chooses an available class.', highlightedNodeIds: ['web'], highlightedEdgeIds: [] },
      { id: 'hold', title: 'Hold a place', description: 'The API validates the selection and creates a pending seat hold before checkout.', highlightedNodeIds: ['web', 'api', 'records'], highlightedEdgeIds: ['web-api', 'api-records'] },
      { id: 'checkout', title: 'Open checkout', description: 'The web opens Stripe checkout. The API tracks the pending payment and enrollment records.', highlightedNodeIds: ['web', 'api', 'stripe', 'records'], highlightedEdgeIds: ['web-api', 'api-stripe', 'api-records'] },
      { id: 'webhook', title: 'Confirm the result', description: 'Stripe reports the payment result to the backend through a webhook. A browser redirect alone does not confirm enrollment.', highlightedNodeIds: ['stripe', 'api'], highlightedEdgeIds: ['api-stripe'] },
      { id: 'activate', title: 'Activate enrollment', description: 'After a successful payment result, the API activates enrollment and persists the confirmed product records.', highlightedNodeIds: ['api', 'records'], highlightedEdgeIds: ['api-records'] },
      { id: 'read', title: 'Make it available', description: 'Web and mobile read the confirmed enrollment and schedule through the API. Notifications inform the relevant users.', highlightedNodeIds: ['web', 'mobile', 'api', 'records', 'notifications'], highlightedEdgeIds: ['web-api', 'mobile-api', 'api-records', 'api-notifications'] },
    ],
  },
  {
    id: 'check-in', title: 'Check in', introduction: 'A short-lived session credential connects a phone action to a durable attendance record.',
    takeaway: 'The phone captures the action; the shared API validates and records it.',
    notes: ['Check-in is for offline sessions. The session credential expires and can be rotated by an authorized mentor.'],
    steps: [
      { id: 'request', title: 'Request a credential', description: 'A mentor requests a rotating check-in credential for an offline class session.', highlightedNodeIds: ['mentor', 'api'], highlightedEdgeIds: ['mentor-api'] },
      { id: 'issue', title: 'Issue a short-lived code', description: 'The API returns a short-lived QR token or code for the session. Rotating it replaces the previous credential.', highlightedNodeIds: ['api', 'credential', 'mentor'], highlightedEdgeIds: ['api-credential', 'mentor-api'] },
      { id: 'scan', title: 'Scan on mobile', description: 'A student scans the session QR on mobile to submit a check-in request to the API.', highlightedNodeIds: ['credential', 'mobile', 'api'], highlightedEdgeIds: ['credential-mobile', 'mobile-api'] },
      { id: 'validate', title: 'Validate the request', description: 'The API checks the credential, the session, and the student’s active class and module enrollment.', highlightedNodeIds: ['api', 'credential', 'records'], highlightedEdgeIds: ['api-credential', 'api-records'] },
      { id: 'save', title: 'Save attendance', description: 'The API saves the attendance record, including the student’s check-in time and present status.', highlightedNodeIds: ['api', 'records'], highlightedEdgeIds: ['api-records'] },
      { id: 'notify', title: 'Inform the right people', description: 'The first successful student check-in publishes a notification to configured recipients. Parents can view attendance for their linked child.', highlightedNodeIds: ['api', 'records', 'notifications', 'mobile'], highlightedEdgeIds: ['api-records', 'api-notifications', 'mobile-api'] },
    ],
  },
  {
    id: 'capture', title: 'Capture to portfolio', introduction: 'Follow a video class moment through processing, a completed highlight, and a separately published portfolio.',
    takeaway: 'Capture, processing, portfolio editing, and publication are separate stages.',
    notes: ['Class-moment capture is different from session-evidence submission. Images and videos follow different processing paths; this walkthrough follows video.', 'Face matches are conditional: a successful match to a registered face can associate material with a learner.', 'Portfolio editing, payments, and the full learning workspace remain on the web. Uploading media does not automatically publish it.'],
    steps: [
      { id: 'capture', title: 'Capture a class moment', description: 'A mentor captures a class moment on mobile. The video becomes material for later processing, rather than a published portfolio item.', highlightedNodeIds: ['mobile'], highlightedEdgeIds: [] },
      { id: 'store', title: 'Store the upload', description: 'The API stores the uploaded media in S3 and persists its product record for tracking and later retrieval.', highlightedNodeIds: ['mobile', 'api', 'storage'], highlightedEdgeIds: ['mobile-api', 'api-storage'] },
      { id: 'process', title: 'Process the video', description: 'MediaConvert processes the video. Callbacks advance its processing state and face-search work.', highlightedNodeIds: ['api', 'storage', 'processing'], highlightedEdgeIds: ['api-processing', 'storage-processing'] },
      { id: 'match', title: 'Associate learners', description: 'Rekognition searches registered faces. When a match succeeds, the material can be associated with the relevant learner.', highlightedNodeIds: ['api', 'processing', 'storage'], highlightedEdgeIds: ['api-processing', 'api-storage'] },
      { id: 'highlight', title: 'Complete a highlight', description: 'Background highlight generation assembles selected material into a completed reel that can be used later.', highlightedNodeIds: ['api', 'storage', 'highlights'], highlightedEdgeIds: ['api-highlights', 'storage-highlights'] },
      { id: 'import', title: 'Import into a draft', description: 'The web portfolio workflow imports completed highlights and supported learning evidence into an editable draft.', highlightedNodeIds: ['api', 'highlights', 'portfolio'], highlightedEdgeIds: ['api-portfolio', 'highlights-portfolio'] },
      { id: 'publish', title: 'Publish a snapshot', description: 'A separate publication action makes a portfolio snapshot public. Uploading, processing, and editing do not perform this action.', highlightedNodeIds: ['portfolio', 'public'], highlightedEdgeIds: ['portfolio-public'] },
    ],
  },
]
