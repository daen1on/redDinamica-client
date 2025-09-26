import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';

import { GLOBAL } from './global';

// Interfaces según el diseño
export interface PublicLesson {
  id: string;
  title: string;
  description: string;
  knowledgeAreas: any[];
  userRole: 'author' | 'collaborator' | 'reviewer';
  completionDate: Date;
  rating: number;
  views: number;
  thumbnailUrl?: string;
  state: string;
  level: string;
}

export interface UserLessonsStats {
  totalCompleted: number;
  totalAsAuthor: number;
  totalAsCollaborator: number;
  totalAsReviewer: number;
  averageRating: number;
  knowledgeAreas: Array<{
    name: string;
    count: number;
  }>;
  monthlyActivity: Array<{
    month: string;
    completedCount: number;
  }>;
}

export interface PublicLessonsResponse {
  lessons: PublicLesson[];
  stats: UserLessonsStats;
  totalCount: number;
  hasMore: boolean;
  page: number;
  totalPages: number;
}

export interface LessonFilters {
  role?: 'author' | 'collaborator' | 'reviewer' | 'all';
  area?: string;
  dateFrom?: Date;
  dateTo?: Date;
  state?: string;
}

export interface LessonsPrivacyUpdate {
  showLessonsInProfile: boolean;
  hiddenLessonIds: string[];
  allowCollaborationRequests: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class UserLessonsService {
  public url: string;

  constructor(private _http: HttpClient) {
    this.url = GLOBAL.url;
  }

  /**
   * Obtener lecciones públicas de un usuario
   */
  getPublicLessons(userId: string, page: number = 1, filters?: LessonFilters): Observable<PublicLessonsResponse> {
    let headers = new HttpHeaders({
      'Content-Type': 'application/json'
    });

    // Construir parámetros de query
    let params = new URLSearchParams();
    params.set('page', page.toString());
    
    if (filters?.role && filters.role !== 'all') {
      params.set('role', filters.role);
    }
    if (filters?.area) {
      params.set('area', filters.area);
    }

    const queryString = params.toString();
    const url = queryString ? 
      `${this.url}users/${userId}/lessons/public?${queryString}` : 
      `${this.url}users/${userId}/lessons/public`;

    return this._http.get(url, { headers: headers })
      .pipe(
        map((response: any) => this.transformBackendResponse(response)),
        catchError(error => {
          console.error('Error fetching public lessons:', error);
          return of(this.getEmptyPublicLessonsResponse());
        })
      );
  }

  /**
   * Obtener estadísticas de lecciones del usuario
   */
  getLessonsStats(userId: string): Observable<UserLessonsStats> {
    let headers = new HttpHeaders({
      'Content-Type': 'application/json'
    });

    return this._http.get(`${this.url}users/${userId}/lessons/stats`, { headers: headers })
      .pipe(
        map((response: any) => response as UserLessonsStats),
        catchError(error => {
          console.error('Error fetching lessons stats:', error);
          return of(this.getEmptyStats());
        })
      );
  }

  /**
   * Actualizar configuración de privacidad (solo propietario)
   */
  updatePrivacySettings(settings: LessonsPrivacyUpdate): Observable<void> {
    let headers = new HttpHeaders({
      'Content-Type': 'application/json'
    });

    return this._http.put(`${this.url}users/lessons/privacy`, settings, { headers: headers })
      .pipe(
        map(() => void 0),
        catchError(error => {
          console.error('Error updating privacy settings:', error);
          return of(void 0);
        })
      );
  }

  /**
   * Ocultar/mostrar lección específica
   */
  toggleLessonVisibility(lessonId: string, visible: boolean): Observable<void> {
    let headers = new HttpHeaders({
      'Content-Type': 'application/json'
    });

    const body = { visible: visible };

    return this._http.put(`${this.url}lessons/${lessonId}/visibility`, body, { headers: headers })
      .pipe(
        map(() => void 0),
        catchError(error => {
          console.error('Error toggling lesson visibility:', error);
          return of(void 0);
        })
      );
  }

  /**
   * Verificar si el usuario tiene lecciones públicas
   */
  hasPublicLessons(userId: string): Observable<boolean> {
    return this.getPublicLessons(userId, 1).pipe(
      map(response => response.totalCount > 0),
      catchError(() => of(false))
    );
  }

  /**
   * Obtener configuración de privacidad actual
   */
  getPrivacySettings(): Observable<LessonsPrivacyUpdate> {
    let headers = new HttpHeaders({
      'Content-Type': 'application/json'
    });

    return this._http.get(`${this.url}users/lessons/privacy`, { headers: headers })
      .pipe(
        map((response: any) => response as LessonsPrivacyUpdate),
        catchError(error => {
          console.error('Error fetching privacy settings:', error);
          return of({
            showLessonsInProfile: true,
            hiddenLessonIds: [],
            allowCollaborationRequests: true
          });
        })
      );
  }

  /**
   * Transformar respuesta del backend a PublicLessonsResponse
   */
  private transformBackendResponse(response: any): PublicLessonsResponse {
    const lessons = response.lessons || [];
    const transformedLessons: PublicLesson[] = lessons.map((lesson: any) => ({
      id: lesson._id,
      title: lesson.title,
      description: lesson.resume || lesson.description || '',
      knowledgeAreas: lesson.knowledge_area || [],
      userRole: lesson.userRole || 'author',
      completionDate: new Date(lesson.completionDate || lesson.updated_at || lesson.created_at),
      rating: lesson.score || 0,
      views: lesson.views || 0,
      thumbnailUrl: lesson.image || undefined,
      state: lesson.state,
      level: Array.isArray(lesson.level) ? lesson.level.join(', ') : (lesson.level || '')
    }));

    return {
      lessons: transformedLessons,
      stats: this.getEmptyStats(), // Stats se obtienen por separado
      totalCount: response.totalCount || transformedLessons.length,
      hasMore: response.hasMore || false,
      page: response.page || 1,
      totalPages: response.totalPages || 1
    };
  }

  /**
   * Determinar el rol del usuario en una lección
   */
  private determineUserRole(lesson: any, userId: string): 'author' | 'collaborator' | 'reviewer' {
    if (lesson.user && lesson.user._id === userId) {
      return 'author';
    }
    // TODO: Implementar lógica para colaboradores y revisores cuando esté disponible en el modelo
    return 'author'; // Por defecto author
  }

  /**
   * Calcular estadísticas desde un array de lecciones
   */
  private calculateStatsFromLessons(lessons: any[]): UserLessonsStats {
    const completedLessons = lessons.filter(lesson => lesson.state === 'completed');
    
    // Contar por áreas de conocimiento
    const areaCount: { [key: string]: number } = {};
    completedLessons.forEach(lesson => {
      if (lesson.knowledge_area && lesson.knowledge_area.length > 0) {
        lesson.knowledge_area.forEach((area: any) => {
          const areaName = area.name || area;
          areaCount[areaName] = (areaCount[areaName] || 0) + 1;
        });
      }
    });

    // Convertir a array
    const knowledgeAreas = Object.entries(areaCount).map(([name, count]) => ({
      name,
      count
    }));

    // Calcular rating promedio
    const ratingsSum = completedLessons.reduce((sum, lesson) => sum + (lesson.score || 0), 0);
    const averageRating = completedLessons.length > 0 ? ratingsSum / completedLessons.length : 0;

    // TODO: Implementar actividad mensual cuando tengamos más datos
    const monthlyActivity = [
      { month: 'Enero', completedCount: Math.floor(completedLessons.length * 0.3) },
      { month: 'Febrero', completedCount: Math.floor(completedLessons.length * 0.4) },
      { month: 'Marzo', completedCount: Math.floor(completedLessons.length * 0.3) }
    ];

    return {
      totalCompleted: completedLessons.length,
      totalAsAuthor: completedLessons.length, // TODO: Calcular real cuando tengamos roles
      totalAsCollaborator: 0, // TODO: Implementar
      totalAsReviewer: 0, // TODO: Implementar
      averageRating: averageRating,
      knowledgeAreas: knowledgeAreas,
      monthlyActivity: monthlyActivity
    };
  }

  /**
   * Retornar respuesta vacía en caso de error
   */
  private getEmptyPublicLessonsResponse(): PublicLessonsResponse {
    return {
      lessons: [],
      stats: this.getEmptyStats(),
      totalCount: 0,
      hasMore: false,
      page: 1,
      totalPages: 0
    };
  }

  /**
   * Retornar estadísticas vacías
   */
  private getEmptyStats(): UserLessonsStats {
    return {
      totalCompleted: 0,
      totalAsAuthor: 0,
      totalAsCollaborator: 0,
      totalAsReviewer: 0,
      averageRating: 0,
      knowledgeAreas: [],
      monthlyActivity: []
    };
  }
}