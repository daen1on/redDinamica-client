import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { GLOBAL } from '../../services/global';

import { 
  AcademicLesson, 
  CreateAcademicLessonRequest, 
  UpdateAcademicLessonRequest, 
  ApproveLessonRequest, 
  GradeLessonRequest,
  InviteCollaboratorRequest,
  SendChatMessageRequest,
  UploadResourceRequest
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
    return this.http.post(`${this.apiUrl}/${lessonId}/approve`, approveData, { responseType: 'text' }).pipe(
      map((text: string) => {
        try { return JSON.parse(text); } catch { return { status: 'success', message: text, data: {} as any }; }
      })
    );
  }

  // Rechazar lección
  rejectLesson(lessonId: string, reason: string): Observable<{status: string, message: string, data: AcademicLesson}> {
    return this.http.post(`${this.apiUrl}/${lessonId}/reject`, { reason }, { responseType: 'text' }).pipe(
      map((text: string) => {
        try { return JSON.parse(text); } catch { return { status: 'success', message: text, data: {} as any }; }
      })
    );
  }

  // Calificar lección
  gradeLesson(lessonId: string, gradeData: GradeLessonRequest): Observable<{status: string, message: string, data: AcademicLesson}> {
    return this.http.post(`${this.apiUrl}/${lessonId}/grade`, gradeData, { responseType: 'text' }).pipe(
      map((text: string) => {
        try { return JSON.parse(text); } catch { return { status: 'success', message: text, data: {} as any }; }
      })
    );
  }

  // Cambiar estado (líder): draft -> proposed, etc.
  updateLessonStatus(lessonId: string, body: { state: AcademicLesson['status'], message?: string }): Observable<{status: string, message: string, data: any}> {
    return this.http.put<{status: string, message: string, data: any}>(`${this.apiUrl}/${lessonId}/state`, body);
  }

  // Solicitar exportación de lección a RedDinámica principal (marca como ready_for_migration)
  requestExport(lessonId: string): Observable<{status: string, message: string, data: AcademicLesson}> {
    return this.http.post(`${this.apiUrl}/${lessonId}/request-export`, {}, { responseType: 'text' }).pipe(
      map((text: string) => {
        try { return JSON.parse(text); } catch { return { status: 'success', message: text, data: {} as any }; }
      })
    );
  }

  

  // Invitar colaborador (compañero del mismo grupo)
  inviteCollaborator(payload: InviteCollaboratorRequest): Observable<{status: string, message: string, data: AcademicLesson}> {
    const { lessonId, ...body } = payload;
    // Enviar siempre role=member por consistencia, aunque backend lo fuerza
    const requestBody: any = { ...body, role: 'member' };
    // Compatibilidad: algunos endpoints esperan 'user' en lugar de 'userId'
    if (requestBody.userId && !requestBody.user) {
      requestBody.user = requestBody.userId;
    }
    
    console.log('📤 [AcademicLessonService.inviteCollaborator] URL:', `${this.apiUrl}/${lessonId}/invite`);
    console.log('📤 [AcademicLessonService.inviteCollaborator] Request Body:', requestBody);
    console.log('📤 [AcademicLessonService.inviteCollaborator] Original payload:', payload);
    
    return this.http.post(`${this.apiUrl}/${lessonId}/invite`, requestBody, { responseType: 'text' }).pipe(
      map((text: string) => {
        console.log('📥 [AcademicLessonService.inviteCollaborator] Raw response:', text);
        try { 
          const parsed = JSON.parse(text);
          console.log('📥 [AcademicLessonService.inviteCollaborator] Parsed response:', parsed);
          return parsed;
        } catch { 
          console.log('⚠️ [AcademicLessonService.inviteCollaborator] No se pudo parsear como JSON, devolviendo texto');
          return { status: 'success', message: text, data: {} as any }; 
        }
      })
    );
  }

  // Enviar mensaje de chat (texto)
  sendChatMessage(payload: SendChatMessageRequest): Observable<{status: string, message: string, data: AcademicLesson}> {
    const { lessonId, ...body } = payload;
    return this.http.post(`${this.apiUrl}/${lessonId}/chat`, body, { responseType: 'text' }).pipe(
      map((text: string) => {
        try { return JSON.parse(text); } catch { return { status: 'success', message: text, data: {} as any }; }
      })
    );
  }

  // Subir recurso/archivo a la lección (FormData)
  uploadResource(payload: UploadResourceRequest): Observable<{status: string, message: string, data: AcademicLesson}> {
    const formData = new FormData();
    formData.append('file', payload.file as unknown as any);
    if (payload.description) formData.append('description', payload.description);
    formData.append('category', payload.category);
    // Algunos endpoints devuelven texto plano; toleramos ambas respuestas
    return this.http.post(`${this.apiUrl}/${payload.lessonId}/resources`, formData, { responseType: 'text' }).pipe(
      map((text: string) => {
        try { return JSON.parse(text); } catch { return { status: 'success', message: text, data: {} as any }; }
      })
    );
  }

  // Agregar comentario del docente a la lección
  addTeacherComment(lessonId: string, content: string, type: 'feedback' | 'suggestion' | 'approval' | 'correction'): Observable<{status: string, message: string, data: AcademicLesson}> {
    return this.http.post(`${this.apiUrl}/${lessonId}/teacher-comments`, { content, type }, { responseType: 'text' }).pipe(
      map((text: string) => {
        try { return JSON.parse(text); } catch { return { status: 'success', message: text, data: {} as any }; }
      })
    );
  }

  // Eliminar comentario del docente
  deleteTeacherComment(lessonId: string, commentId: string): Observable<{status: string, message: string, data: AcademicLesson}> {
    return this.http.delete(`${this.apiUrl}/${lessonId}/teacher-comments/${commentId}`, { responseType: 'text' }).pipe(
      map((text: string) => {
        try { return JSON.parse(text); } catch { return { status: 'success', message: text, data: {} as any }; }
      })
    );
  }

  // Retirarse de la lección (miembro del equipo de desarrollo)
  leaveLesson(lessonId: string): Observable<{status: string, message: string, data: AcademicLesson}> {
    return this.http.post<{status: string, message: string, data: AcademicLesson}>(`${this.apiUrl}/${lessonId}/leave`, {});
  }

  // Crear nueva conversación en la lección (solo líder)
  createConversation(lessonId: string, title: string): Observable<{status: string, message: string, data: AcademicLesson}> {
    return this.http.post(`${this.apiUrl}/${lessonId}/conversations`, { title }, { responseType: 'text' }).pipe(
      map((text: string) => {
        try { return JSON.parse(text); } catch { return { status: 'success', message: text, data: {} as any }; }
      })
    );
  }

  // Enviar mensaje a una conversación específica
  sendMessageToConversation(lessonId: string, conversationId: string, content: string): Observable<{status: string, message: string, data: AcademicLesson}> {
    return this.http.post(`${this.apiUrl}/${lessonId}/conversations/${conversationId}/messages`, { content }, { responseType: 'text' }).pipe(
      map((text: string) => {
        try { return JSON.parse(text); } catch { return { status: 'success', message: text, data: {} as any }; }
      })
    );
  }

  // Editar mensaje de conversación (30 min window)
  updateConversationMessage(lessonId: string, conversationId: string, messageId: string, content: string): Observable<{status: string, message: string, data: AcademicLesson}> {
    return this.http.put(`${this.apiUrl}/${lessonId}/conversations/${conversationId}/messages/${messageId}`, { content }, { responseType: 'text' }).pipe(
      map((text: string) => {
        try { return JSON.parse(text); } catch { return { status: 'success', message: text, data: {} as any }; }
      })
    );
  }

  // Eliminar mensaje de conversación (30 min window)
  deleteConversationMessage(lessonId: string, conversationId: string, messageId: string): Observable<{status: string, message: string, data: AcademicLesson}> {
    return this.http.delete(`${this.apiUrl}/${lessonId}/conversations/${conversationId}/messages/${messageId}`, { responseType: 'text' }).pipe(
      map((text: string) => {
        try { return JSON.parse(text); } catch { return { status: 'success', message: text, data: {} as any }; }
      })
    );
  }
}
