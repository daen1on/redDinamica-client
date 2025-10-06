export interface AcademicGroup {
  _id: string;
  name: string;
  description: string;
  teacher: string;
  students: string[];
  academicLevel: 'Colegio' | 'Universidad';
  grade: string;
  academicYear?: string;
  maxStudents: number;
  subjects: string[];
  lessons: string[];
  lessonsCount?: number;
  statistics: {
    totalStudents: number;
    totalLessons: number;
    averageGrade: number;
    activeLessons: number;
  };
  isActive: boolean;
  permissions: {
    studentsCanCreateLessons: boolean;
    studentsCanEditLessons: boolean;
    studentsCanDeleteLessons: boolean;
    studentsCanViewAllLessons: boolean;
  };
  createdAt: string;
  updatedAt: string;
}

export interface CreateAcademicGroupRequest {
  name: string;
  description: string;
  academicLevel: 'Colegio' | 'Universidad';
  grade: string;
  maxStudents?: number;
  subjects?: string[];
}

export interface UpdateAcademicGroupRequest {
  name?: string;
  description?: string;
  academicLevel?: 'Colegio' | 'Universidad';
  grade?: string;
  maxStudents?: number;
  subjects?: string[];
}

export interface ValidGradesResponse {
  status: string;
  data: string[];
}

export interface GroupPermissions {
  studentsCanCreateLessons: boolean;
  studentsCanEditLessons: boolean;
  studentsCanDeleteLessons: boolean;
  studentsCanViewAllLessons: boolean;
}

export interface UpdateGroupPermissionsRequest {
  permissions: Partial<GroupPermissions>;
}

export interface CanCreateLessonsResponse {
  status: string;
  canCreate: boolean;
  message: string;
}
