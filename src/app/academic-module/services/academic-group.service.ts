import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { GLOBAL } from '../../services/GLOBAL';

import { 
  AcademicGroup, 
  CreateAcademicGroupRequest, 
  UpdateAcademicGroupRequest, 
  ValidGradesResponse,
  UpdateGroupPermissionsRequest,
  CanCreateLessonsResponse
} from '../models/academic-group.model';

@Injectable({
  providedIn: 'root'
})
export class AcademicGroupService {
  private apiUrl = `${GLOBAL.url}academic-groups`;

  constructor(private http: HttpClient) { }

  // Crear un nuevo grupo académico
  createGroup(groupData: CreateAcademicGroupRequest): Observable<{status: string, message: string, data: AcademicGroup}> {
    return this.http.post<{status: string, message: string, data: AcademicGroup}>(this.apiUrl, groupData);
  }

  // Obtener grupos del docente
  getTeacherGroups(): Observable<{status: string, data: AcademicGroup[]}> {
    return this.http.get<{status: string, data: AcademicGroup[]}>(`${this.apiUrl}/teacher`);
  }

  // Listar todos los grupos (opcionalmente solo activos)
  getAllGroups(activeOnly: boolean = false): Observable<{status: string, data: AcademicGroup[]}> {
    const url = activeOnly ? `${this.apiUrl}?active=true` : this.apiUrl;
    return this.http.get<{status: string, data: AcademicGroup[]}>(url);
  }

  // Obtener grupos del estudiante
  getStudentGroups(): Observable<{status: string, data: AcademicGroup[]}> {
    return this.http.get<{status: string, data: AcademicGroup[]}>(`${this.apiUrl}/student`);
  }

  // Obtener grupo por ID
  getGroupById(id: string): Observable<{status: string, data: AcademicGroup}> {
    return this.http.get<{status: string, data: AcademicGroup}>(`${this.apiUrl}/${id}`);
  }

  // Actualizar grupo
  updateGroup(id: string, groupData: UpdateAcademicGroupRequest): Observable<{status: string, message: string, data: AcademicGroup}> {
    return this.http.put<{status: string, message: string, data: AcademicGroup}>(`${this.apiUrl}/${id}`, groupData);
  }

  // Eliminar grupo
  deleteGroup(id: string): Observable<{status: string, message: string}> {
    return this.http.delete<{status: string, message: string}>(`${this.apiUrl}/${id}`);
  }

  // Agregar estudiante al grupo
  addStudentToGroup(groupId: string, studentId: string): Observable<{status: string, message: string}> {
    return this.http.post<{status: string, message: string}>(`${this.apiUrl}/${groupId}/students/${studentId}`, {});
  }

  // Remover estudiante del grupo
  removeStudentFromGroup(groupId: string, studentId: string): Observable<{status: string, message: string}> {
    return this.http.delete<{status: string, message: string}>(`${this.apiUrl}/${groupId}/students/${studentId}`);
  }

  // Obtener estudiantes del grupo
  getGroupStudents(groupId: string): Observable<{status: string, data: any[]}> {
    return this.http.get<{status: string, data: any[]}>(`${this.apiUrl}/${groupId}/students`);
  }

  // Invitar/agregar estudiante por email
  inviteStudentByEmail(groupId: string, email: string): Observable<{status: string, message: string, data?: any}> {
    return this.http.post<{status: string, message: string, data?: any}>(`${this.apiUrl}/${groupId}/invite`, { email });
  }

  // Obtener estadísticas del grupo
  getGroupStatistics(groupId: string): Observable<{status: string, data: any}> {
    return this.http.get<{status: string, data: any}>(`${this.apiUrl}/${groupId}/statistics`);
  }

  // Obtener grados válidos por nivel académico
  getValidGrades(academicLevel: string): Observable<ValidGradesResponse> {
    return this.http.get<ValidGradesResponse>(`${this.apiUrl}/valid-grades/${academicLevel}`);
  }

  // Actualizar permisos del grupo
  updateGroupPermissions(groupId: string, permissions: UpdateGroupPermissionsRequest): Observable<{status: string, message: string, data: {group: AcademicGroup, permissions: any}}> {
    return this.http.put<{status: string, message: string, data: {group: AcademicGroup, permissions: any}}>(`${this.apiUrl}/${groupId}/permissions`, permissions);
  }

  // Verificar si un estudiante puede crear lecciones en un grupo
  canStudentCreateLessons(groupId: string): Observable<CanCreateLessonsResponse> {
    return this.http.get<CanCreateLessonsResponse>(`${this.apiUrl}/${groupId}/can-create-lessons`);
  }

  // ===== Sistema de Foro/Threads =====
  getDiscussionThreads(groupId: string): Observable<{status: string, data: any[]}> {
    return this.http.get<{status: string, data: any[]}>(`${this.apiUrl}/${groupId}/threads`);
  }

  createDiscussionThread(groupId: string, title: string, description?: string): Observable<{status: string, message: string, data: any[]}> {
    return this.http.post<{status: string, message: string, data: any[]}>(`${this.apiUrl}/${groupId}/threads`, { title, description });
  }

  getDiscussionThread(groupId: string, threadId: string): Observable<{status: string, data: any}> {
    return this.http.get<{status: string, data: any}>(`${this.apiUrl}/${groupId}/threads/${threadId}`);
  }

  deleteDiscussionThread(groupId: string, threadId: string): Observable<{status: string, message: string}> {
    return this.http.delete<{status: string, message: string}>(`${this.apiUrl}/${groupId}/threads/${threadId}`);
  }

  addMessageToThread(groupId: string, threadId: string, content: string): Observable<{status: string, message: string, data: any}> {
    return this.http.post<{status: string, message: string, data: any}>(`${this.apiUrl}/${groupId}/threads/${threadId}/messages`, { content });
  }

  deleteMessageFromThread(groupId: string, threadId: string, messageId: string): Observable<{status: string, message: string}> {
    return this.http.delete<{status: string, message: string}>(`${this.apiUrl}/${groupId}/threads/${threadId}/messages/${messageId}`);
  }

  togglePinThread(groupId: string, threadId: string): Observable<{status: string, message: string, data: {isPinned: boolean}}> {
    return this.http.put<{status: string, message: string, data: {isPinned: boolean}}>(`${this.apiUrl}/${groupId}/threads/${threadId}/pin`, {});
  }

  toggleLockThread(groupId: string, threadId: string): Observable<{status: string, message: string, data: {isLocked: boolean}}> {
    return this.http.put<{status: string, message: string, data: {isLocked: boolean}}>(`${this.apiUrl}/${groupId}/threads/${threadId}/lock`, {});
  }

  // ===== Discusión del grupo (métodos antiguos para compatibilidad) =====
  getDiscussion(groupId: string): Observable<{status: string, data: any[]}> {
    return this.getDiscussionThreads(groupId);
  }

  addDiscussionMessage(groupId: string, content: string): Observable<{status: string, message: string, data: any[]}> {
    return this.http.post<{status: string, message: string, data: any[]}>(`${this.apiUrl}/${groupId}/discussion`, { content });
  }

  deleteDiscussionMessage(groupId: string, messageId: string): Observable<{status: string, message: string}> {
    return this.http.delete<{status: string, message: string}>(`${this.apiUrl}/${groupId}/discussion/${messageId}`);
  }

  // ===== Recursos del grupo =====
  getGroupResources(groupId: string): Observable<{status: string, data: any[]}> {
    return this.http.get<{status: string, data: any[]}>(`${this.apiUrl}/${groupId}/resources`);
  }

  addGroupResource(groupId: string, resourceId: string): Observable<{status: string, message: string, data: any[]}> {
    return this.http.post<{status: string, message: string, data: any[]}>(`${this.apiUrl}/${groupId}/resources`, { resourceId });
    
  }

  removeGroupResource(groupId: string, resourceId: string): Observable<{status: string, message: string}> {
    return this.http.delete<{status: string, message: string}>(`${this.apiUrl}/${groupId}/resources/${resourceId}`);
  }
}
