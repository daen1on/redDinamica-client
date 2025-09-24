export interface UserRef {
  _id: string;
  name: string;
  email?: string;
  avatar?: string;
}

export interface KnowledgeArea {
  _id: string;
  name: string;
}

export interface Collaborator {
  user: string | UserRef;
  role: 'member' | 'reviewer' | 'contributor';
  joinedAt: string;
  contribution?: string;
  status: 'active' | 'inactive' | 'left';
}

export interface ChatMessage {
  _id: string;
  content: string;
  author: string | UserRef;
  timestamp: string;
  edited: boolean;
  editedAt?: string;
  type: 'text' | 'file' | 'system';
  fileUrl?: string;
  fileName?: string;
}

export interface SharedResource {
  _id: string;
  name: string;
  originalName: string;
  path: string;
  url?: string;
  size: number;
  mimeType: string;
  uploadedBy: string | UserRef;
  uploadedAt: string;
  description?: string;
  category: 'document' | 'image' | 'video' | 'audio' | 'link' | 'other';
}

export interface Milestone {
  _id: string;
  title: string;
  description: string;
  status: 'pending' | 'in_progress' | 'completed';
  assignedTo?: string | UserRef;
  dueDate?: string;
  completedAt?: string;
  order: number;
}

export interface LessonFile {
  _id?: string;
  name: string;
  originalName: string;
  path: string;
  size: number;
  mimeType: string;
  uploadedBy: string | UserRef;
  uploadedAt: string;
}

export interface Conversation {
  _id?: string;
  title: string;
  participants: (string | UserRef)[];
  messages: ConversationMessage[];
  createdAt: string;
}

export interface ConversationMessage {
  _id?: string;
  content: string;
  author: string | UserRef;
  timestamp: string;
  edited: boolean;
  editedAt?: string;
}

export interface DevelopmentGroupMember {
  user: string | UserRef;
  role: 'leader' | 'collaborator' | 'reviewer';
  joinedAt: string;
  status: 'active' | 'inactive' | 'removed';
}

export interface TeacherComment {
  _id?: string;
  content: string;
  author: string | UserRef;
  timestamp: string;
  type: 'feedback' | 'suggestion' | 'approval' | 'correction';
  isFromTeacher: boolean;
}

export interface AcademicLesson {
  _id: string;
  title: string;
  resume: string;
  academicGroup: string;
  author: string | UserRef;
  teacher?: string | UserRef;
  leader: string | UserRef;
  justification: {
    methodology: string;
    objectives: string;
  };
  tags?: string[];
  knowledge_areas: KnowledgeArea[];
  
  // Nuevos campos requeridos
  files: LessonFile[];
  conversations: Conversation[];
  level: string[]; // Heredado del grupo
  state: 'draft' | 'in_development' | 'review_requested' | 'under_review' | 'approved' | 'rejected' | 'completed' | 'ready_for_migration';
  development_group: DevelopmentGroupMember[];
  
  status: 'draft' | 'proposed' | 'approved' | 'rejected' | 'in_development' | 'completed' | 'graded' | 'ready_for_migration';
  grade?: number;
  feedback?: string;
  isExported: boolean;
  exportedLesson?: string;
  
  // Colaboración (mantener compatibilidad)
  collaborators: Collaborator[];
  
  // Comunicación
  chatMessages: ChatMessage[];
  
  // Recursos compartidos
  sharedResources: SharedResource[];
  
  // Configuración académica implícita del grupo
  academicSettings?: {
    academicLevel: 'Colegio' | 'Universidad';
    grade: string;
    subjects: string[];
  };
  
  // Progreso colaborativo
  progress: {
    completed: boolean;
    completedAt?: string;
    timeSpent: number;
    milestones: Milestone[];
  };
  
  views: number;
  likes: string[];
  comments: TeacherComment[]; // Comentarios del profesor
  calls: Call[];
  proposedAt?: string;
  approvedAt?: string;
  rejectedAt?: string;
  gradedAt?: string;
  exportedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Comment {
  content: string;
  author: string;
  timestamp: string;
  replies: Reply[];
}

export interface Reply {
  content: string;
  author: string;
  timestamp: string;
}

export interface Message {
  content: string;
  author: string;
  timestamp: string;
  edited: boolean;
  editedAt?: string;
}

export interface File {
  name: string;
  originalName: string;
  path: string;
  size: number;
  mimeType: string;
  uploadedBy: string;
  uploadedAt: string;
}

export interface Call {
  title: string;
  description: string;
  date: string;
  duration: number;
  participants: string[];
  status: 'scheduled' | 'in-progress' | 'completed' | 'cancelled';
}

export interface CreateAcademicLessonRequest {
  title: string;
  resume: string;
  academicGroup: string;
  justification: {
    methodology: string;
    objectives: string;
  };
  tags?: string;
  knowledge_areas: string[];
}

export interface UpdateAcademicLessonRequest {
  title?: string;
  resume?: string;
  justification?: {
    methodology?: string;
    objectives?: string;
  };
  tags?: string;
  knowledge_areas?: string[];
}

export interface InviteCollaboratorRequest {
  lessonId: string;
  userEmail: string;
  role: 'member' | 'reviewer' | 'contributor';
  message?: string;
}

export interface UpdateLessonStatusRequest {
  status: 'draft' | 'proposed' | 'approved' | 'rejected' | 'in_development' | 'completed' | 'graded' | 'ready_for_migration';
  message?: string;
}

export interface SendChatMessageRequest {
  lessonId: string;
  content: string;
  type: 'text' | 'file';
  fileUrl?: string;
  fileName?: string;
}

export interface UploadResourceRequest {
  lessonId: string;
  file: File;
  description?: string;
  category: 'document' | 'image' | 'video' | 'audio' | 'link' | 'other';
}

export interface ApproveLessonRequest {
  feedback?: string;
  grade?: number;
}

export interface GradeLessonRequest {
  grade: number;
  feedback?: string;
}
