export interface UserRef {
  _id: string;
  name: string;
  email?: string;
  avatar?: string;
}

export interface AcademicLesson {
  _id: string;
  title: string;
  resume: string;
  academicGroup: string;
  author: string | UserRef;
  teacher?: string | UserRef;
  level: 'Básico' | 'Intermedio' | 'Avanzado' | 'Colegio';
  objectives: string;
  methodology: string;
  evaluation: string;
  resources?: string;
  duration: number;
  difficulty: 'Fácil' | 'Moderado' | 'Difícil';
  status: 'draft' | 'proposed' | 'approved' | 'rejected' | 'completed' | 'graded';
  grade?: number;
  feedback?: string;
  isExported: boolean;
  exportedLesson?: string;
  academicSettings: {
    academicLevel: 'Colegio' | 'Universidad';
    grade: string;
    subjects: string[];
  };
  progress: {
    completed: boolean;
    completedAt?: string;
    timeSpent: number;
  };
  views: number;
  likes: string[];
  comments: Comment[];
  messages: Message[];
  files: File[];
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
  level: 'Básico' | 'Intermedio' | 'Avanzado' | 'Colegio';
  objectives: string;
  methodology: string;
  evaluation: string;
  resources?: string;
  duration: number;
  difficulty: 'Fácil' | 'Moderado' | 'Difícil';
}

export interface UpdateAcademicLessonRequest {
  title?: string;
  resume?: string;
  level?: 'Básico' | 'Intermedio' | 'Avanzado' | 'Colegio';
  objectives?: string;
  methodology?: string;
  evaluation?: string;
  resources?: string;
  duration?: number;
  difficulty?: 'Fácil' | 'Moderado' | 'Difícil';
}

export interface ApproveLessonRequest {
  feedback?: string;
  grade?: number;
}

export interface GradeLessonRequest {
  grade: number;
  feedback?: string;
}
