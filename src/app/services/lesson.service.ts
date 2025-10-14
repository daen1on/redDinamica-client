import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map, catchError } from 'rxjs/operators';

import { GLOBAL } from './GLOBAL';
import { Lesson } from '../models/lesson.model';

@Injectable()
export class LessonService {
    public url: string;

    constructor(private _http: HttpClient) {
        this.url = GLOBAL.url;
    }

    addLesson(token: string, lesson: Lesson): Observable<any> {
        let params = JSON.stringify(lesson);
        let headers = new HttpHeaders({
            'Content-Type': 'application/json',
            'Authorization': token
        });

        return this._http.post(this.url + 'lesson', params, { headers: headers })
      .pipe(
        map(response => response),
        catchError(error => {
          console.log('Error en addLesson:', error);
          throw error;
        })
      );
    }

    getLesson(token: string, lessonId: string): Observable<any> {
        let headers = new HttpHeaders({
            'Content-Type': 'application/json',
            'Authorization': token
        });

        return this._http.get(`${this.url}lesson/${lessonId}`, { headers: headers });
    }

    getLessons(token: string, page: number = 1, visibleOnes: boolean | string = true): Observable<any> {
        console.log("entered get lesson");

        let headers = new HttpHeaders({
            'Content-Type': 'application/json',
            'Authorization': token
        });

        // Manejar tanto boolean como string
        let visibleParam: string;
        if (typeof visibleOnes === 'string') {
            visibleParam = visibleOnes; // 'all', 'true', 'false'
        } else {
            visibleParam = visibleOnes ? 'true' : 'false';
        }

        console.log('getLessons - Using visibleParam:', visibleParam);

        return this._http.get(`${this.url}lessons/${visibleParam}/${page}`, { headers: headers })
        .pipe(
            map(response => {
                console.log('API Response:', response);
                return response;
            }),
            catchError(error => {
                console.log('Error en getLessons:', error);
                throw error;
            })
        );
    }

    getAllLessons(token: string, orderBy: string = 'created_at', visibleOnes: boolean | string = true): Observable<any> {
        console.log("entered all lesson");
        let headers = new HttpHeaders({
            'Content-Type': 'application/json',
            'Authorization': token
        });

        // Manejar tanto boolean como string
        let visibleParam: string;
        if (typeof visibleOnes === 'string') {
            visibleParam = visibleOnes; // 'all', 'true', 'false'
        } else {
            visibleParam = visibleOnes ? 'true' : 'false';
        }

        console.log('getAllLessons - Using visibleParam:', visibleParam);

        return this._http.get(`${this.url}all-lessons/${visibleParam}/${orderBy}`, { headers: headers })
        .pipe(
            map(response => {
                console.log('API Responseall:', response);
                return response;
            }),
            catchError(error => {
                console.log('Error en getAllLessons:', error);
                throw error;
            })
        );
    }

    getMyLessons(token: string, page: number = 1): Observable<any> {
        let headers = new HttpHeaders({
            'Content-Type': 'application/json',
            'Authorization': token
        });

        return this._http.get(`${this.url}my-lessons/${page}`, { headers: headers });
    }

    getAllMyLessons(token: string): Observable<any> {
        let headers = new HttpHeaders({
            'Content-Type': 'application/json',
            'Authorization': token
        });

        return this._http.get(`${this.url}all-my-lessons`, { headers: headers });
    }

    getLessonsToAdvise(token: string, page: number = 1): Observable<any> {
        let headers = new HttpHeaders({
            'Content-Type': 'application/json',
            'Authorization': token
        });

        return this._http.get(`${this.url}lessons-to-advise/${page}`, { headers: headers });
    }

    getAllLessonsToAdvise(token: string): Observable<any> {
        let headers = new HttpHeaders({
            'Content-Type': 'application/json',
            'Authorization': token
        });

        return this._http.get(`${this.url}all-lessons-to-advise`, { headers: headers });
    }

    getCalls(token: string, page: number = 1): Observable<any> {
        let headers = new HttpHeaders({
            'Content-Type': 'application/json',
            'Authorization': token
        });

        return this._http.get(`${this.url}calls/${page}`, { headers: headers });
    }

    getAllCalls(token: string): Observable<any> {
        let headers = new HttpHeaders({
            'Content-Type': 'application/json',
            'Authorization': token
        });

        return this._http.get(`${this.url}all-calls`, { headers: headers });
    }

    // Crear o actualizar convocatoria (solo líder/autor y en estado approved_by_expert)
    createCall(token: string, lessonId: string, payload: { text: string; visible?: boolean }): Observable<any> {
        let headers = new HttpHeaders({
            'Content-Type': 'application/json',
            'Authorization': token
        });

        return this._http.post(`${this.url}lesson/${lessonId}/call`, JSON.stringify(payload), { headers });
    }

  

    getExperiences(token: string, page: number = 1): Observable<any> {
        // Reusar el método getAllLessons existente para obtener experiencias (lecciones no visibles)
        return this.getAllLessons(token, 'created_at', false);
    }
    editLesson(token: string, lesson: any): Observable<any> {
        let headers = new HttpHeaders().set('Content-Type', 'application/json')
                                        .set('Authorization', token);
        return this._http.put(this.url + 'lesson/' + lesson._id, JSON.stringify(lesson), { headers: headers });
    }

    // Crear mensaje en conversación (API soporta insertion directa al array de conversations)
    addLessonMessage(token: string, lessonId: string, payload: { text: string; conversationTitle?: string; file?: any }): Observable<any> {
        const headers = new HttpHeaders({ 'Content-Type': 'application/json', 'Authorization': token });
        return this._http.post(`${this.url}lesson/${lessonId}/message`, JSON.stringify(payload), { headers });
    }

    editLessonMessage(token: string, lessonId: string, messageId: string, payload: { text: string; scope: 'conversations' | 'expert_comments' }): Observable<any> {
        const headers = new HttpHeaders({ 'Content-Type': 'application/json', 'Authorization': token });
        return this._http.put(`${this.url}lesson/${lessonId}/message/${messageId}`, JSON.stringify(payload), { headers });
    }

    // Agregar comentario de experto/facilitador con notificaciones
    addExpertComment(token: string, lessonId: string, payload: { text: string; conversationTitle?: string; file?: any }): Observable<any> {
        const headers = new HttpHeaders({ 'Content-Type': 'application/json', 'Authorization': token });
        return this._http.post(`${this.url}lesson/${lessonId}/expert-comment`, JSON.stringify(payload), { headers });
    }
    
    getSuggestedLesson(token: string, page: number): Observable<any> {
        // Reusar el método getLessons existente para obtener lecciones no visibles (sugerencias)
        return this.getLessons(token, page, false);
    }

    deleteLesson(token: string, lessonId: string): Observable<any> {
        let headers = new HttpHeaders({
            'Content-Type': 'application/json',
            'Authorization': token
        });

        return this._http.delete(this.url + 'lesson/' + lessonId, { headers: headers });
    }

    // ===== NUEVOS MÉTODOS PARA FACILITADOR SUGERIDO =====

    approveFacilitatorSuggestion(token: string, lessonId: string): Observable<any> {
        let headers = new HttpHeaders({
            'Content-Type': 'application/json',
            'Authorization': token
        });

        return this._http.put(this.url + 'lesson/' + lessonId + '/approve-facilitator', {}, { headers: headers });
    }

    rejectFacilitatorSuggestion(token: string, lessonId: string, reason: string): Observable<any> {
        let params = JSON.stringify({ reason: reason });
        let headers = new HttpHeaders({
            'Content-Type': 'application/json',
            'Authorization': token
        });

        return this._http.put(this.url + 'lesson/' + lessonId + '/reject-facilitator', params, { headers: headers });
    }

    getFacilitatorInvitations(token: string): Observable<any> {
        let headers = new HttpHeaders({
            'Content-Type': 'application/json',
            'Authorization': token
        });

        return this._http.get(this.url + 'facilitator/invitations', { headers: headers });
    }
}
