import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { GLOBAL } from '../../services/global';

import { 
  AcademicLesson, 
  CreateAcademicLessonRequest, 
  UpdateAcademicLessonRequest, 
  ApproveLessonRequest, 
  GradeLessonRequest 
} from '../models/academic-lesson.model';

@Injectable({
  providedIn: 'root'
})
export class AcademicLessonService {
  private apiUrl = `${GLOBAL.url}academic-lessons`;

  constructor(private http: HttpClient) { }

  // Crear una nueva lección académica
  createLesson(lessonData: CreateAcademicLessonRequest): Observable<{status: string, message: string, data: AcademicLesson}> {
    return this.http.post<{status: string, message: string, data: AcademicLesson}>(this.apiUrl, lessonData);
  }

  // Obtener lecciones del grupo
  getGroupLessons(groupId: string): Observable<{status: string, data: AcademicLesson[]}> {
    return this.http.get<{status: string, data: AcademicLesson[]}>(`${this.apiUrl}/group/${groupId}`);
  }

  // Obtener mis lecciones (para estudiantes)
  getMyLessons(): Observable<{status: string, data: AcademicLesson[]}> {
    return this.http.get<{status: string, data: AcademicLesson[]}>(`${this.apiUrl}/my-lessons`);
  }

  // Obtener lecciones del docente
  getTeacherLessons(): Observable<{status: string, data: AcademicLesson[]}> {
    return this.http.get<{status: string, data: AcademicLesson[]}>(`${this.apiUrl}/teacher-lessons`);
  }

  // Obtener lección por ID
  getLessonById(id: string): Observable<{status: string, data: AcademicLesson}> {
    return this.http.get<{status: string, data: AcademicLesson}>(`${this.apiUrl}/${id}`);
  }

  // Actualizar lección
  updateLesson(id: string, lessonData: UpdateAcademicLessonRequest): Observable<{status: string, message: string, data: AcademicLesson}> {
    return this.http.put<{status: string, message: string, data: AcademicLesson}>(`${this.apiUrl}/${id}`, lessonData);
  }

  // Eliminar lección
  deleteLesson(id: string): Observable<{status: string, message: string}> {
    return this.http.delete<{status: string, message: string}>(`${this.apiUrl}/${id}`);
  }

  // Aprobar lección
  approveLesson(lessonId: string, approveData: ApproveLessonRequest): Observable<{status: string, message: string, data: AcademicLesson}> {
    return this.http.post<{status: string, message: string, data: AcademicLesson}>(`${this.apiUrl}/${lessonId}/approve`, approveData);
  }

  // Rechazar lección
  rejectLesson(lessonId: string, reason: string): Observable<{status: string, message: string, data: AcademicLesson}> {
    return this.http.post<{status: string, message: string, data: AcademicLesson}>(`${this.apiUrl}/${lessonId}/reject`, { reason });
  }

  // Calificar lección
  gradeLesson(lessonId: string, gradeData: GradeLessonRequest): Observable<{status: string, message: string, data: AcademicLesson}> {
    return this.http.post<{status: string, message: string, data: AcademicLesson}>(`${this.apiUrl}/${lessonId}/grade`, gradeData);
  }

  // Exportar lección a RedDinámica principal
  exportToMain(lessonId: string): Observable<{status: string, message: string, data: AcademicLesson}> {
    return this.http.post<{status: string, message: string, data: AcademicLesson}>(`${this.apiUrl}/${lessonId}/export`, {});
  }
}
